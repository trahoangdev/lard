import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";
import { isAiEnabled } from "@/lib/ai/config";
import { generateConfirmHint, generateApplicantReply, generateHrReply, interpretConfirmOrCancel } from "@/lib/ai/respond";
import { appendChatMessages } from "@/lib/chat/history";
import { resolveIntent } from "@/lib/chat/resolve-intent";
import { parseIntent } from "@/lib/chat/parse";
import { chatRequestSchema } from "@/lib/chat/schemas";
import { getLeaveBalance, validateLeaveDraft } from "@/lib/leave/balance";
import { getPendingLeaveForHr } from "@/lib/leave/workflow";
import { confirmPayrollRun, submitPayrollForBoss } from "@/lib/payroll/confirm";
import { prisma } from "@/lib/prisma";
import { findOpenJobs, getOpenJobDetails } from "@/lib/recruitment/jobs";
import {
  advanceJobIntake,
  generateJobDescriptionFromNotes,
  intakeAnswersToNotes,
  intakeRecapText,
  jobDraftToCard,
  jobIntakeQuestion,
  publishJobDraft,
  startJobIntake,
  type JobDraft,
  type JobIntakeAnswers,
} from "@/lib/recruitment/job-draft";
import { getApplicationProfile, getApplicantStatus, getRankedCandidates, getRecruitmentDataset } from "@/lib/recruitment/stats";
import {
  bossApproveCandidates,
  getPendingBossRecruitment,
  hrDecision,
  submitShortlistToBoss,
} from "@/lib/recruitment/workflow";
import { getOrgLeaveStats } from "@/lib/stats/leave";
import { maskBankAccount } from "@/lib/utils";

export const runtime = "nodejs";

type BotMessage =
  | { kind: "text"; text: string }
  | { kind: "card"; card: unknown }
  | {
      kind: "actions";
      actions: Array<{
        id: string;
        label: string;
        tone?: "primary" | "danger";
        job?: { id: string; title: string; department: string; requirements: string };
        email?: string;
        runId?: number;
        leaveId?: number;
      }>;
    };

function isRegenerate(text: string) {
  return /^(regenerate|redo|try again|refresh)\b/i.test(text.trim());
}

function isGenerateDraft(text: string) {
  return /^(generate|create draft|draft now|go)\b/i.test(text.trim());
}

function jobDraftPreviewMessages(
  notes: string,
  draft: JobDraft,
  answers: JobIntakeAnswers,
): { messages: BotMessage[]; context: { kind: "pending_job_publish"; notes: string; answers: JobIntakeAnswers; draft: JobDraft } } {
  const messages: BotMessage[] = [
    {
      kind: "text",
      text: `Here's a concise posting for ${draft.title}. Review and publish when ready.`,
    },
    { kind: "card", card: jobDraftToCard(draft, notes) },
    {
      kind: "actions",
      actions: [
        { id: "publish_job_draft", label: "Publish job posting", tone: "primary" },
        { id: "regenerate_job_draft", label: "Regenerate", tone: "primary" },
        { id: "cancel", label: "Discard", tone: "danger" },
      ],
    },
  ];

  return { messages, context: { kind: "pending_job_publish", notes, answers, draft } };
}

async function generateJobDraftExchange(answers: JobIntakeAnswers) {
  const notes = intakeAnswersToNotes(answers);
  const draft = await generateJobDescriptionFromNotes(notes);
  return jobDraftPreviewMessages(notes, draft, answers);
}

function jobIntakeStartMessages() {
  const intake = startJobIntake();
  return {
    messages: [
      {
        kind: "text",
        text: "I'll ask a few quick questions about the role, then draft a short job description.",
      } satisfies BotMessage,
      { kind: "text", text: jobIntakeQuestion(intake.step)! } satisfies BotMessage,
    ],
    context: { kind: "pending_job_intake" as const, ...intake },
  };
}

function jobIntakeReadyMessages(answers: JobIntakeAnswers) {
  return {
    messages: [
      { kind: "text", text: jobIntakeQuestion("ready")! } satisfies BotMessage,
      { kind: "text", text: intakeRecapText(answers) } satisfies BotMessage,
      {
        kind: "actions",
        actions: [
          { id: "generate_job_draft", label: "Generate draft", tone: "primary" },
          { id: "cancel", label: "Cancel", tone: "danger" },
        ],
      } satisfies BotMessage,
    ],
    context: { kind: "pending_job_intake" as const, step: "ready" as const, answers },
  };
}

function isConfirm(text: string) {
  return /^(confirm|yes|y|ok|okay|sure|go ahead|do it|please submit|sounds good|approve)\b/i.test(text.trim());
}

function isCancel(text: string) {
  return /^(cancel|no|n|stop|never mind|nevermind|don't|dont|reject)\b/i.test(text.trim());
}

async function resolveDecision(text: string): Promise<"confirm" | "cancel" | null> {
  if (isConfirm(text)) return "confirm";
  if (isCancel(text)) return "cancel";
  if (!isAiEnabled()) return null;
  try {
    return await interpretConfirmOrCancel(text);
  } catch {
    return null;
  }
}

async function getEmployee(actorEmployeeId: string) {
  return prisma.employee.findUnique({ where: { id: actorEmployeeId } });
}

function chatMeta(intentSource?: "rules" | "ai") {
  return { aiEnabled: isAiEnabled(), intentSource: intentSource ?? null };
}

function roleDenied(role: Role, action: string) {
  return NextResponse.json({
    messages: [{ kind: "text", text: `${action} is not available for your role.` } satisfies BotMessage],
    meta: chatMeta(),
  });
}

function isApplicantPortal(actorId: string) {
  return actorId === "applicant";
}

function applicantOnlyReply(extra?: string) {
  const hints =
    "• Show open jobs\n• Apply for Senior Software Engineer\n• Upload your CV (after applying)\n• Application status your@email.com";
  return NextResponse.json({
    messages: [
      {
        kind: "text",
        text: extra
          ? `${extra}\n\nThis portal is for job applications only:\n${hints}`
          : `Careers assistant — jobs, CV upload, and application tracking only:\n${hints}`,
      } satisfies BotMessage,
    ],
    meta: chatMeta(),
  });
}

async function persistExchange(sessionId: string, userText: string, botMessages: BotMessage[]) {
  void appendChatMessages(sessionId, [
    { role: "user", payload: { text: userText } },
    ...botMessages.map((m) => ({ role: "bot" as const, payload: m })),
  ]).catch(() => {
    /* history is best-effort — never block chat */
  });
}

function payrollPreviewMessages(run: {
  id: number;
  inputFilename: string;
  totalAmount: unknown;
  items: Array<{
    status: string;
    sourceRowNumber: number;
    employeeName: string;
    email: string;
    bankAccount: string;
    message: string | null;
  }>;
}) {
  const invalid = run.items.filter((i) => i.status === "FAILED").slice(0, 8);
  const invalidRows = invalid.map((i) => ({
    rowNumber: i.sourceRowNumber,
    employeeName: i.employeeName,
    email: i.email,
    bankAccountMasked: maskBankAccount(i.bankAccount),
    issues: (i.message ?? "").split("; ").filter(Boolean),
  }));
  const validCount = run.items.filter((i) => i.status !== "FAILED").length;
  const invalidCount = run.items.length - validCount;

  return [
    {
      kind: "card" as const,
      card: {
        type: "payroll_preview",
        runId: run.id,
        inputFilename: run.inputFilename,
        rowCount: run.items.length,
        validCount,
        invalidCount,
        totalAmount: Number(run.totalAmount),
        invalidRows,
      },
    },
  ] satisfies BotMessage[];
}

export async function POST(request: Request) {
  try {
    const input = chatRequestSchema.parse(await request.json());
    const message = input.message.trim();
    const lower = message.toLowerCase();
    const actor = await getEmployee(input.actorEmployeeId);

    // Fresh job-draft flow — skip stale pending context (instant, no AI)
    if (parseIntent(message).kind === "job_draft" && actor?.role === "HR_ADMIN") {
      const { messages, context } = jobIntakeStartMessages();
      void persistExchange(input.actorEmployeeId, message, messages);
      return NextResponse.json({ messages, context, meta: chatMeta("rules") });
    }

    if (input.context?.kind === "pending_leave_request") {
      const decision = await resolveDecision(lower);

      if (decision === "cancel") {
        const messages = [{ kind: "text", text: "Cancelled. Want to try again?" } satisfies BotMessage];
        await persistExchange(input.actorEmployeeId, message, messages);
        return NextResponse.json({ messages, meta: chatMeta() });
      }

      if (decision !== "confirm") {
        return NextResponse.json({
          messages: [
            { kind: "text", text: "Reply “confirm” to submit, or “cancel” to discard." } satisfies BotMessage,
          ],
          context: input.context,
          meta: chatMeta(),
        });
      }

      const start = new Date(`${input.context.draft.startDate}T00:00:00`);
      const end = new Date(`${input.context.draft.endDate}T00:00:00`);

      if (end.getTime() < start.getTime()) {
        const messages = [{ kind: "text", text: "End date must be after start date." } satisfies BotMessage];
        await persistExchange(input.actorEmployeeId, message, messages);
        return NextResponse.json({ messages, meta: chatMeta() });
      }

      const validation = await validateLeaveDraft(
        input.actorEmployeeId,
        input.context.draft.type,
        start,
        end,
      );
      if (!validation.ok) {
        const messages = [{ kind: "text", text: validation.error } satisfies BotMessage];
        await persistExchange(input.actorEmployeeId, message, messages);
        return NextResponse.json({ messages, meta: chatMeta() });
      }

      const created = await prisma.leaveRequest.create({
        data: {
          employeeId: input.actorEmployeeId,
          startDate: start,
          endDate: end,
          type: input.context.draft.type,
          reason: input.context.draft.reason,
          status: "PENDING",
        },
      });

      await prisma.auditLog.create({
        data: {
          action: "LEAVE_REQUEST_CREATED",
          payloadJson: JSON.stringify({ leaveId: created.id, employeeId: input.actorEmployeeId }),
        },
      });

      const messages = [
        { kind: "text", text: "Submitted. HR will review your request." } satisfies BotMessage,
        {
          kind: "card",
          card: {
            type: "leave_request",
            id: created.id,
            status: created.status,
            typeName: created.type,
            startDate: input.context.draft.startDate,
            endDate: input.context.draft.endDate,
            reason: created.reason,
            requestedAt: created.createdAt.toISOString(),
          },
        } satisfies BotMessage,
      ];
      await persistExchange(input.actorEmployeeId, message, messages);
      return NextResponse.json({ messages, meta: chatMeta() });
    }

    if (input.context?.kind === "payroll_uploaded") {
      const run = await prisma.payrollRun.findUnique({
        where: { id: input.context.runId },
        include: { items: true },
      });

      if (!run) {
        const messages = [{ kind: "text", text: "I can't find that payroll run." } satisfies BotMessage];
        await persistExchange(input.actorEmployeeId, message, messages);
        return NextResponse.json({ messages, meta: chatMeta() });
      }

      const preview = payrollPreviewMessages(run);
      const messages = [
        ...preview,
        {
          kind: "text",
          text: "Submit this payroll run to the Boss for approval?",
        } satisfies BotMessage,
        {
          kind: "actions",
          actions: [
            { id: "submit_payroll_boss", label: "Submit to Boss", tone: "primary" },
            { id: "cancel", label: "Cancel", tone: "danger" },
          ],
        } satisfies BotMessage,
      ];
      await persistExchange(input.actorEmployeeId, message, messages);
      return NextResponse.json({
        messages,
        context: { kind: "pending_payroll_hr_submit", runId: run.id },
        meta: chatMeta(),
      });
    }

    if (input.context?.kind === "pending_payroll_hr_submit") {
      if (actor?.role !== "HR_ADMIN") return roleDenied(actor?.role ?? "EMPLOYEE", "Payroll submission");

      const decision = await resolveDecision(lower);
      if (decision === "cancel") {
        const messages = [{ kind: "text", text: "Payroll submission cancelled." } satisfies BotMessage];
        await persistExchange(input.actorEmployeeId, message, messages);
        return NextResponse.json({ messages, meta: chatMeta() });
      }
      if (decision !== "confirm") {
        return NextResponse.json({
          messages: [
            { kind: "text", text: "Reply “confirm” to send to Boss, or “cancel”." } satisfies BotMessage,
          ],
          context: input.context,
          meta: chatMeta(),
        });
      }

      const result = await submitPayrollForBoss(input.context.runId, input.actorEmployeeId);
      const messages = [
        {
          kind: "text",
          text: `Payroll run #${result.runId} submitted to Boss for approval (${result.validCount} employees, total pending).`,
        } satisfies BotMessage,
        {
          kind: "card",
          card: { type: "payroll_submitted", runId: result.runId, totalAmount: result.totalAmount, status: "PENDING_BOSS" },
        } satisfies BotMessage,
      ];
      await persistExchange(input.actorEmployeeId, message, messages);
      return NextResponse.json({ messages, meta: chatMeta() });
    }

    if (input.context?.kind === "pending_recruitment_boss") {
      if (actor?.role !== "MANAGER") return roleDenied(actor?.role ?? "EMPLOYEE", "Recruitment approval");

      const decision = await resolveDecision(lower);
      if (decision === "cancel") {
        const messages = [{ kind: "text", text: "Recruitment approval cancelled." } satisfies BotMessage];
        await persistExchange(input.actorEmployeeId, message, messages);
        return NextResponse.json({ messages, meta: chatMeta() });
      }
      if (decision !== "confirm") {
        return NextResponse.json({
          messages: [{ kind: "text", text: "Reply “confirm” to approve shortlisted candidates, or “cancel”." } satisfies BotMessage],
          context: input.context,
          meta: chatMeta(),
        });
      }

      const result = await bossApproveCandidates(input.actorEmployeeId);
      const messages = [
        {
          kind: "text",
          text: result.approved
            ? `Approved ${result.approved} candidate(s) for next interview stage. HR can now send accept/reject notices.`
            : "No pending candidates to approve.",
        } satisfies BotMessage,
        {
          kind: "card",
          card: { type: "recruitment_boss_done", approved: result.approved, ids: result.ids },
        } satisfies BotMessage,
      ];
      await persistExchange(input.actorEmployeeId, message, messages);
      return NextResponse.json({ messages, meta: chatMeta() });
    }

    if (input.context?.kind === "pending_job_intake") {
      if (actor?.role !== "HR_ADMIN") return roleDenied(actor?.role ?? "EMPLOYEE", "Job posting drafts");

      if (isCancel(lower)) {
        const messages = [{ kind: "text", text: "Job draft cancelled." } satisfies BotMessage];
        void persistExchange(input.actorEmployeeId, message, messages);
        return NextResponse.json({ messages, meta: chatMeta() });
      }

      const ctx = input.context;

      if (ctx.step === "ready" && (isGenerateDraft(lower) || isConfirm(lower))) {
        try {
          const { messages, context } = await generateJobDraftExchange(ctx.answers);
          await persistExchange(input.actorEmployeeId, message, messages);
          return NextResponse.json({ messages, context, meta: chatMeta() });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Could not generate job description.";
          const ready = jobIntakeReadyMessages(ctx.answers);
          const messages = [{ kind: "text", text: msg } satisfies BotMessage, ...ready.messages];
          await persistExchange(input.actorEmployeeId, message, messages);
          return NextResponse.json({ messages, context: ready.context, meta: chatMeta() });
        }
      }

      if (ctx.step === "ready") {
        const ready = jobIntakeReadyMessages(ctx.answers);
        return NextResponse.json({
          messages: [
            { kind: "text", text: "Tap Generate draft when you're ready, or Cancel to stop." } satisfies BotMessage,
            ...ready.messages,
          ],
          context: ready.context,
          meta: chatMeta(),
        });
      }

      const answer = message.trim();
      if (answer.length < 2) {
        const messages = [
          { kind: "text", text: "Please add a short answer so we can continue." } satisfies BotMessage,
          { kind: "text", text: jobIntakeQuestion(ctx.step)! } satisfies BotMessage,
        ];
        await persistExchange(input.actorEmployeeId, message, messages);
        return NextResponse.json({ messages, context: ctx, meta: chatMeta() });
      }

      const { answers, step } = advanceJobIntake(ctx.step, answer, ctx.answers);

      if (step === "ready") {
        const ready = jobIntakeReadyMessages(answers);
        await persistExchange(input.actorEmployeeId, message, ready.messages);
        return NextResponse.json({ messages: ready.messages, context: ready.context, meta: chatMeta() });
      }

      const messages = [{ kind: "text", text: jobIntakeQuestion(step)! } satisfies BotMessage];
      await persistExchange(input.actorEmployeeId, message, messages);
      return NextResponse.json({
        messages,
        context: { kind: "pending_job_intake", step, answers },
        meta: chatMeta(),
      });
    }

    if (input.context?.kind === "pending_job_publish") {
      if (actor?.role !== "HR_ADMIN") return roleDenied(actor?.role ?? "EMPLOYEE", "Job posting publish");

      const decision = await resolveDecision(lower);
      if (decision === "cancel") {
        const messages = [{ kind: "text", text: "Job draft discarded." } satisfies BotMessage];
        await persistExchange(input.actorEmployeeId, message, messages);
        return NextResponse.json({ messages, meta: chatMeta() });
      }

      if (isRegenerate(lower)) {
        try {
          const { messages, context } = await generateJobDraftExchange(input.context.answers);
          await persistExchange(input.actorEmployeeId, message, messages);
          return NextResponse.json({ messages, context, meta: chatMeta() });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Could not regenerate job description.";
          const messages = [{ kind: "text", text: msg } satisfies BotMessage];
          await persistExchange(input.actorEmployeeId, message, messages);
          return NextResponse.json({ messages, context: input.context, meta: chatMeta() });
        }
      }

      if (decision !== "confirm") {
        const preview = jobDraftPreviewMessages(input.context.notes, input.context.draft, input.context.answers);
        return NextResponse.json({
          messages: [
            { kind: "text", text: "Tap Publish to list this role, Regenerate to try again, or Discard." } satisfies BotMessage,
            ...preview.messages,
          ],
          context: input.context,
          meta: chatMeta(),
        });
      }

      const job = await publishJobDraft(input.context.draft, input.actorEmployeeId);
      const messages = [
        {
          kind: "text",
          text: `Published ${job.title} — now live on the job board for applicants.`,
        } satisfies BotMessage,
        {
          kind: "card",
          card: {
            type: "job_detail",
            job: {
              id: job.id,
              title: job.title,
              department: job.department,
              requirements: job.requirements,
              summary: job.summary,
              highlights: JSON.parse(job.highlightsJson || "[]") as string[],
              location: job.location,
              employmentType: job.employmentType,
              applications: 0,
            },
          },
        } satisfies BotMessage,
      ];
      await persistExchange(input.actorEmployeeId, message, messages);
      return NextResponse.json({ messages, meta: chatMeta() });
    }

    if (input.context?.kind === "cv_uploaded") {
      const profile = await getApplicationProfile(input.context.applicationId);
      if (!profile) {
        const messages = [{ kind: "text", text: "Application not found." } satisfies BotMessage];
        await persistExchange(input.actorEmployeeId, message, messages);
        return NextResponse.json({ messages, meta: chatMeta() });
      }

      const messages = [
        {
          kind: "text",
          text: `CV received for ${profile.jobTitle}. AI match score: ${profile.matchScore}%.`,
        } satisfies BotMessage,
        {
          kind: "card",
          card: { type: "cv_submitted", ...profile },
        } satisfies BotMessage,
      ];
      await persistExchange(input.actorEmployeeId, message, messages);
      return NextResponse.json({ messages, meta: chatMeta() });
    }

    if (input.context?.kind === "pending_payroll_boss_approve") {
      if (actor?.role !== "MANAGER") return roleDenied(actor?.role ?? "EMPLOYEE", "Payroll approval");

      const decision = await resolveDecision(lower);
      if (decision === "cancel") {
        const messages = [{ kind: "text", text: "Payroll approval cancelled." } satisfies BotMessage];
        await persistExchange(input.actorEmployeeId, message, messages);
        return NextResponse.json({ messages, meta: chatMeta() });
      }
      if (decision !== "confirm") {
        return NextResponse.json({
          messages: [
            { kind: "text", text: "Reply “confirm” to approve salary payout, or “cancel”." } satisfies BotMessage,
          ],
          context: input.context,
          meta: chatMeta(),
        });
      }

      const result = await confirmPayrollRun(input.context.runId, input.actorEmployeeId);
      const emailLine =
        result.emailStats.sent > 0
          ? `Emails: ${result.emailStats.sent} sent, ${result.emailStats.simulated} simulated${result.emailStats.failed ? `, ${result.emailStats.failed} failed` : ""}.`
          : `Emails: ${result.emailStats.simulated} simulated — add RESEND_API_KEY to send real mail.`;
      const messages = [
        { kind: "text", text: `Approved. ${emailLine}` } satisfies BotMessage,
        {
          kind: "card",
          card: {
            type: "payroll_run",
            runId: result.runId,
            totalAmount: result.totalAmount,
            validCount: result.validCount,
            invalidCount: result.invalidCount,
            emailStats: result.emailStats,
            artifacts: {
              bankBatchUrl: `/api/payroll/runs/${result.runId}/artifact/bank_batch`,
              payrollResultUrl: `/api/payroll/runs/${result.runId}/artifact/payroll_result`,
            },
          },
        } satisfies BotMessage,
      ];
      await persistExchange(input.actorEmployeeId, message, messages);
      return NextResponse.json({ messages, meta: chatMeta() });
    }

    const applicant = isApplicantPortal(input.actorEmployeeId);

    const { intent, source } = await resolveIntent(message);

    if (intent.kind === "general_chat" || intent.kind === "help") {
      let messages: BotMessage[];
      if (applicant) {
        const openJobs = await getOpenJobDetails();
        if (isAiEnabled()) {
          const reply = await generateApplicantReply(message, openJobs);
          messages = [{ kind: "text", text: reply }];
        } else {
          messages = [
            {
              kind: "text",
              text:
                "Careers assistant — jobs & applications only:\n• Show open jobs\n• Apply for Senior Software Engineer\n• Application status tanjosef33@gmail.com",
            } satisfies BotMessage,
          ];
        }
      } else if (isAiEnabled() && actor) {
        const reply = await generateHrReply(message, { name: actor.name, role: actor.role });
        messages = [{ kind: "text", text: reply }];
      } else {
        const hints =
          actor?.role === "HR_ADMIN"
            ? "• Run payroll\n• Show pending leave requests\n• Draft job posting\n• How many CVs for Software Engineer?\n• Submit shortlist to boss\n• Recruitment dataset"
            : actor?.role === "MANAGER"
              ? "• Show pending payroll approvals\n• Pending recruitment approvals\n• Show leave statistics"
              : "• Request leave 2026-06-10 to 2026-06-12 annual reason family\n• What's my leave balance?\n• Is my leave approved?";
        messages = [{ kind: "text", text: `Try one of these:\n${hints}` }];
      }
      await persistExchange(input.actorEmployeeId, message, messages);
      return NextResponse.json({ messages, meta: chatMeta(source) });
    }

    if (applicant) {
      const allowed = new Set([
        "job_list",
        "job_apply",
        "job_details",
        "application_status",
        "cv_profile",
      ]);
      if (!allowed.has(intent.kind)) {
        return applicantOnlyReply("I can't help with leave or payroll here.");
      }
    }

    if (intent.kind === "leave_stats") {
      if (actor?.role !== "HR_ADMIN" && actor?.role !== "MANAGER") {
        return roleDenied(actor?.role ?? "EMPLOYEE", "Team statistics");
      }
      const stats = await getOrgLeaveStats();
      const messages = [
        {
          kind: "card",
          card: { type: "leave_stats", ...stats, actorRole: actor!.role },
        } satisfies BotMessage,
      ];
      await persistExchange(input.actorEmployeeId, message, messages);
      return NextResponse.json({ messages, meta: chatMeta(source) });
    }

    if (intent.kind === "leave_pending") {
      if (actor?.role !== "HR_ADMIN") return roleDenied(actor?.role ?? "EMPLOYEE", "Leave approvals");

      const pending = await getPendingLeaveForHr();

      if (!pending.length) {
        const messages = [{ kind: "text", text: "No leave requests waiting for HR approval." } satisfies BotMessage];
        await persistExchange(input.actorEmployeeId, message, messages);
        return NextResponse.json({ messages, meta: chatMeta(source) });
      }

      const messages = [
        {
          kind: "card",
          card: {
            type: "leave_pending_list",
            requests: pending.map((r) => ({
              id: r.id,
              employeeName: r.employee.name,
              type: r.type,
              startDate: r.startDate.toISOString().slice(0, 10),
              endDate: r.endDate.toISOString().slice(0, 10),
              reason: r.reason,
              requestedAt: r.createdAt.toISOString(),
            })),
          },
        } satisfies BotMessage,
        { kind: "text", text: "Review each request below — approve or reject." } satisfies BotMessage,
        {
          kind: "actions",
          actions: pending.flatMap((r) => [
            { id: "approve_leave", label: `Approve #${r.id} · ${r.employee.name}`, tone: "primary" as const, leaveId: r.id },
            { id: "reject_leave", label: `Reject #${r.id}`, tone: "danger" as const, leaveId: r.id },
          ]),
        } satisfies BotMessage,
      ];
      await persistExchange(input.actorEmployeeId, message, messages);
      return NextResponse.json({ messages, meta: chatMeta(source) });
    }

    if (intent.kind === "payroll_pending") {
      if (actor?.role !== "MANAGER") return roleDenied(actor?.role ?? "EMPLOYEE", "Payroll approvals");

      const pending = await prisma.payrollRun.findMany({
        where: { status: "PENDING_BOSS" },
        orderBy: { createdAt: "desc" },
        take: 5,
      });

      if (!pending.length) {
        const messages = [{ kind: "text", text: "No payroll runs waiting for your approval." } satisfies BotMessage];
        await persistExchange(input.actorEmployeeId, message, messages);
        return NextResponse.json({ messages, meta: chatMeta(source) });
      }

      const messages = [
        {
          kind: "card",
          card: {
            type: "payroll_pending_list",
            runs: pending.map((r) => ({
              runId: r.id,
              totalAmount: Number(r.totalAmount),
              filename: r.inputFilename,
              requestedBy: r.requestedBy,
              requestedAt: r.requestedAt?.toISOString() ?? null,
            })),
          },
        } satisfies BotMessage,
        { kind: "text", text: "Tap a run below to review and sign off." } satisfies BotMessage,
        {
          kind: "actions",
          actions: pending.map((r) => ({
            id: "approve_payroll_run",
            label: `Review run #${r.id}`,
            tone: "primary" as const,
            runId: r.id,
          })),
        } satisfies BotMessage,
      ];
      await persistExchange(input.actorEmployeeId, message, messages);
      return NextResponse.json({ messages, meta: chatMeta(source) });
    }

    if (intent.kind === "payroll_approve") {
      if (actor?.role !== "MANAGER") return roleDenied(actor?.role ?? "EMPLOYEE", "Payroll approval");

      const run = intent.runId
        ? await prisma.payrollRun.findFirst({ where: { id: intent.runId, status: "PENDING_BOSS" }, include: { items: true } })
        : await prisma.payrollRun.findFirst({ where: { status: "PENDING_BOSS" }, include: { items: true }, orderBy: { createdAt: "desc" } });

      if (!run) {
        const messages = [{ kind: "text", text: "No pending payroll run found with that id." } satisfies BotMessage];
        await persistExchange(input.actorEmployeeId, message, messages);
        return NextResponse.json({ messages, meta: chatMeta(source) });
      }

      const messages = [
        ...payrollPreviewMessages(run),
        { kind: "text", text: `Approve salary payout for run #${run.id}?` } satisfies BotMessage,
        {
          kind: "actions",
          actions: [
            { id: "approve_payroll_boss", label: "Approve payout", tone: "primary" },
            { id: "cancel", label: "Cancel", tone: "danger" },
          ],
        } satisfies BotMessage,
      ];
      await persistExchange(input.actorEmployeeId, message, messages);
      return NextResponse.json({
        messages,
        context: { kind: "pending_payroll_boss_approve", runId: run.id },
        meta: chatMeta(source),
      });
    }

    if (intent.kind === "payroll_run") {
      if (actor?.role !== "HR_ADMIN") return roleDenied(actor?.role ?? "EMPLOYEE", "Payroll processing");

      const headcount = await prisma.employee.count();
      const messages = [
        {
          kind: "card",
          card: {
            type: "payroll_start",
            sampleUrl: "/api/payroll/sample",
            employeeCount: headcount,
          },
        } satisfies BotMessage,
        {
          kind: "text",
          text: `Upload payroll.xlsx — one row per employee. Sample includes all ${headcount} people (Ava Nguyen → test email). Submit to Boss after review.`,
        } satisfies BotMessage,
        {
          kind: "actions",
          actions: [{ id: "upload_payroll", label: "Upload payroll.xlsx", tone: "primary" }],
        } satisfies BotMessage,
      ];
      await persistExchange(input.actorEmployeeId, message, messages);
      return NextResponse.json({ messages, meta: chatMeta(source) });
    }

    if (intent.kind === "leave_balance") {
      const balance = await getLeaveBalance(input.actorEmployeeId);
      if (!balance) {
        const messages = [{ kind: "text", text: "Employee not found." } satisfies BotMessage];
        await persistExchange(input.actorEmployeeId, message, messages);
        return NextResponse.json({ messages, meta: chatMeta(source) });
      }

      const messages = [
        {
          kind: "card",
          card: {
            type: "leave_balance",
            role: balance.role,
            annual: balance.annual,
            sick: balance.sick,
          },
        } satisfies BotMessage,
      ];
      await persistExchange(input.actorEmployeeId, message, messages);
      return NextResponse.json({ messages, meta: chatMeta(source) });
    }

    if (intent.kind === "leave_status") {
      const record = intent.id
        ? await prisma.leaveRequest.findFirst({
            where: { id: intent.id, employeeId: input.actorEmployeeId },
            orderBy: { createdAt: "desc" },
          })
        : await prisma.leaveRequest.findFirst({
            where: { employeeId: input.actorEmployeeId },
            orderBy: { createdAt: "desc" },
          });

      if (!record) {
        const messages = [{ kind: "text", text: "No leave requests found yet." } satisfies BotMessage];
        await persistExchange(input.actorEmployeeId, message, messages);
        return NextResponse.json({ messages, meta: chatMeta(source) });
      }

      const messages = [
        {
          kind: "card",
          card: {
            type: "leave_request",
            id: record.id,
            status: record.status,
            typeName: record.type,
            startDate: record.startDate.toISOString().slice(0, 10),
            endDate: record.endDate.toISOString().slice(0, 10),
            reason: record.reason,
            requestedAt: record.createdAt.toISOString(),
            approvedAt: record.decidedAt?.toISOString() ?? null,
            decidedBy: record.decidedBy,
            decisionReason: record.decisionReason,
          },
        } satisfies BotMessage,
      ];
      await persistExchange(input.actorEmployeeId, message, messages);
      return NextResponse.json({ messages, meta: chatMeta(source) });
    }

    if (intent.kind === "recruitment_dataset") {
      if (actor?.role !== "HR_ADMIN" && actor?.role !== "MANAGER") {
        return roleDenied(actor?.role ?? "EMPLOYEE", "Recruitment dataset");
      }
      const data = await getRecruitmentDataset();
      const messages = [
        {
          kind: "card",
          card: {
            type: "recruitment_dataset",
            summary: data.summary,
            jobs: data.jobs,
            recent: data.applications.slice(0, 8),
            csvUrl: "/api/recruitment/dataset?format=csv",
          },
        } satisfies BotMessage,
      ];
      await persistExchange(input.actorEmployeeId, message, messages);
      return NextResponse.json({ messages, meta: chatMeta(source) });
    }

    if (intent.kind === "recruitment_boss_pending") {
      if (actor?.role !== "MANAGER") return roleDenied(actor?.role ?? "EMPLOYEE", "Recruitment approvals");

      const pending = await getPendingBossRecruitment();
      if (!pending.length) {
        const messages = [{ kind: "text", text: "No shortlisted candidates waiting for your approval." } satisfies BotMessage];
        await persistExchange(input.actorEmployeeId, message, messages);
        return NextResponse.json({ messages, meta: chatMeta(source) });
      }

      const messages = [
        {
          kind: "card",
          card: {
            type: "recruitment_boss_pending",
            candidates: pending.map((c) => ({
              id: c.id,
              candidateName: c.candidateName,
              jobTitle: c.job.title,
              matchScore: Math.round(c.matchScore),
            })),
          },
        } satisfies BotMessage,
        { kind: "text", text: "Say “approve shortlist” to confirm these candidates." } satisfies BotMessage,
      ];
      await persistExchange(input.actorEmployeeId, message, messages);
      return NextResponse.json({ messages, meta: chatMeta(source) });
    }

    if (intent.kind === "recruitment_boss_approve") {
      if (actor?.role !== "MANAGER") return roleDenied(actor?.role ?? "EMPLOYEE", "Recruitment approval");

      const pending = await getPendingBossRecruitment();
      if (!pending.length) {
        const messages = [{ kind: "text", text: "No candidates pending boss approval." } satisfies BotMessage];
        await persistExchange(input.actorEmployeeId, message, messages);
        return NextResponse.json({ messages, meta: chatMeta(source) });
      }

      const messages = [
        {
          kind: "card",
          card: {
            type: "recruitment_boss_pending",
            candidates: pending.map((c) => ({
              id: c.id,
              candidateName: c.candidateName,
              jobTitle: c.job.title,
              matchScore: Math.round(c.matchScore),
            })),
          },
        } satisfies BotMessage,
        { kind: "text", text: `Approve ${pending.length} shortlisted candidate(s)?` } satisfies BotMessage,
        {
          kind: "actions",
          actions: [
            { id: "approve_recruitment_boss", label: "Approve shortlist", tone: "primary" },
            { id: "cancel", label: "Cancel", tone: "danger" },
          ],
        } satisfies BotMessage,
      ];
      await persistExchange(input.actorEmployeeId, message, messages);
      return NextResponse.json({
        messages,
        context: { kind: "pending_recruitment_boss" },
        meta: chatMeta(source),
      });
    }

    if (intent.kind === "job_draft") {
      if (actor?.role !== "HR_ADMIN") return roleDenied(actor?.role ?? "EMPLOYEE", "Job posting drafts");

      const { messages, context } = jobIntakeStartMessages();
      await persistExchange(input.actorEmployeeId, message, messages);
      return NextResponse.json({ messages, context, meta: chatMeta(source) });
    }

    if (intent.kind === "recruitment_submit_boss") {
      if (actor?.role !== "HR_ADMIN") return roleDenied(actor?.role ?? "EMPLOYEE", "Submit shortlist");

      const result = await submitShortlistToBoss(input.actorEmployeeId);
      const messages = [
        {
          kind: "text",
          text: result.count
            ? `Submitted ${result.count} shortlisted candidate(s) to Boss for approval.`
            : "No shortlisted candidates. Tick candidates in the leaderboard first.",
        } satisfies BotMessage,
      ];
      await persistExchange(input.actorEmployeeId, message, messages);
      return NextResponse.json({ messages, meta: chatMeta(source) });
    }

    if (intent.kind === "cv_profile") {
      const profile = await getApplicationProfile(intent.applicationId);
      if (!profile) {
        const messages = [{ kind: "text", text: "Candidate not found." } satisfies BotMessage];
        await persistExchange(input.actorEmployeeId, message, messages);
        return NextResponse.json({ messages, meta: chatMeta(source) });
      }

      const messages = [
        { kind: "card", card: { type: "candidate_profile", ...profile, actorRole: actor?.role ?? "EMPLOYEE" } } satisfies BotMessage,
      ];
      await persistExchange(input.actorEmployeeId, message, messages);
      return NextResponse.json({ messages, meta: chatMeta(source) });
    }

    if (intent.kind === "cv_applications") {
      if (actor?.role !== "HR_ADMIN" && actor?.role !== "MANAGER") {
        return roleDenied(actor?.role ?? "EMPLOYEE", "CV review");
      }

      const ranked = await getRankedCandidates(intent.jobId, intent.jobTitle);
      const messages = [
        {
          kind: "card",
          card: {
            type: "recruitment_leaderboard",
            jobTitle: ranked.jobTitle,
            totalApplications: ranked.totalApplications,
            openJobs: ranked.openJobs,
            candidates: ranked.candidates,
            actorRole: actor?.role ?? "EMPLOYEE",
          },
        } satisfies BotMessage,
        {
          kind: "text",
          text: ranked.totalApplications
            ? "Click a profile to see match breakdown. HR: tick shortlist, then “Submit shortlist to boss”."
            : "No applications yet. Share job links with applicants.",
        } satisfies BotMessage,
      ];
      await persistExchange(input.actorEmployeeId, message, messages);
      return NextResponse.json({ messages, meta: chatMeta(source) });
    }

    if (intent.kind === "application_status") {
      const email =
        intent.email ??
        (input.actorEmployeeId === "applicant" ? undefined : actor?.name ? undefined : undefined);

      if (!intent.email) {
        const messages = [
          {
            kind: "text",
            text: "Share your application email, e.g. “Application status tanjosef33@gmail.com”.",
          } satisfies BotMessage,
        ];
        await persistExchange(input.actorEmployeeId, message, messages);
        return NextResponse.json({ messages, meta: chatMeta(source) });
      }

      const statuses = await getApplicantStatus(intent.email);
      const messages = [
        {
          kind: "card",
          card: { type: "application_status", email: intent.email, applications: statuses },
        } satisfies BotMessage,
        {
          kind: "actions",
          actions: [{ id: "check_status", label: "Refresh status", tone: "primary", email: intent.email }],
        } satisfies BotMessage,
      ];
      await persistExchange(input.actorEmployeeId, message, messages);
      return NextResponse.json({ messages, meta: chatMeta(source) });
    }

    if (intent.kind === "job_details") {
      const matched = await findOpenJobs(intent.jobTitle);

      if (!matched.length) {
        const messages = [{ kind: "text", text: "No open jobs found right now." } satisfies BotMessage];
        await persistExchange(input.actorEmployeeId, message, messages);
        return NextResponse.json({ messages, meta: chatMeta(source) });
      }

      const messages: BotMessage[] = [];

      if (matched.length > 1 && !intent.jobTitle) {
        messages.push({
          kind: "text",
          text: `We have ${matched.length} open roles. Here is a brief overview of each:`,
        } satisfies BotMessage);
      } else if (matched.length === 1) {
        messages.push({
          kind: "text",
          text: `Here are the details for ${matched[0].title}:`,
        } satisfies BotMessage);
      } else {
        messages.push({
          kind: "text",
          text: `Found ${matched.length} matching roles:`,
        } satisfies BotMessage);
      }

      for (const job of matched.slice(0, 3)) {
        messages.push({
          kind: "card",
          card: { type: "job_detail", job },
        } satisfies BotMessage);
      }

      messages.push({
        kind: "actions",
        actions: matched.slice(0, 3).map((j) => ({
          id: "select_job",
          label: `Apply · ${j.title}`,
          tone: "primary" as const,
          job: {
            id: j.id,
            title: j.title,
            department: j.department,
            requirements: j.requirements,
          },
        })),
      } satisfies BotMessage);

      await persistExchange(input.actorEmployeeId, message, messages);
      return NextResponse.json({ messages, meta: chatMeta(source) });
    }

    if (intent.kind === "job_list" || intent.kind === "job_apply") {
      const jobs = await prisma.jobPosting.findMany({
        where: { status: "OPEN" },
        include: { _count: { select: { applications: true } } },
        orderBy: { title: "asc" },
      });

      let target = jobs.find(
        (j) =>
          intent.kind === "job_apply" &&
          intent.jobTitle &&
          (j.title.toLowerCase().includes(intent.jobTitle.toLowerCase()) ||
            j.id.toLowerCase().includes(intent.jobTitle.toLowerCase())),
      );

      if (intent.kind === "job_apply" && !target && jobs.length === 1) target = jobs[0];

      if (intent.kind === "job_apply" && target) {
        const messages = [
          {
            kind: "card",
            card: {
              type: "job_apply",
              job: {
                id: target.id,
                title: target.title,
                department: target.department,
                requirements: target.requirements,
              },
            },
          } satisfies BotMessage,
          { kind: "text", text: `Tap Upload CV below to apply for ${target.title}.` } satisfies BotMessage,
          {
            kind: "actions",
            actions: [{ id: "upload_cv", label: "Upload CV", tone: "primary" }],
          } satisfies BotMessage,
        ];
        await persistExchange(input.actorEmployeeId, message, messages);
        return NextResponse.json({
          messages,
          context: { kind: "pending_cv_apply", jobId: target.id, jobTitle: target.title },
          meta: chatMeta(source),
        });
      }

      const messages = [
        {
          kind: "card",
          card: {
            type: "job_list",
            jobs: jobs.map((j) => ({
              id: j.id,
              title: j.title,
              department: j.department,
              applications: j._count.applications,
              requirements: j.requirements,
            })),
          },
        } satisfies BotMessage,
        { kind: "text", text: "Tap a role to apply — no typing needed." } satisfies BotMessage,
        {
          kind: "actions",
          actions: jobs.map((j) => ({
            id: "select_job",
            label: j.title,
            tone: "primary" as const,
            job: {
              id: j.id,
              title: j.title,
              department: j.department,
              requirements: j.requirements,
            },
          })),
        } satisfies BotMessage,
      ];
      await persistExchange(input.actorEmployeeId, message, messages);
      return NextResponse.json({ messages, meta: chatMeta(source) });
    }

    if (intent.kind === "leave_request") {
      const messages: BotMessage[] = [];
      const defaultConfirm = `Submit ${intent.draft.type.toLowerCase()} leave from ${intent.draft.startDate} to ${intent.draft.endDate} (${intent.draft.reason})?`;
      let confirmText = defaultConfirm;
      if (isAiEnabled()) {
        try {
          confirmText = await generateConfirmHint(defaultConfirm);
        } catch {
          confirmText = defaultConfirm;
        }
      }
      messages.push({ kind: "text", text: confirmText });
      messages.push({
        kind: "actions",
        actions: [
          { id: "confirm", label: "Confirm", tone: "primary" },
          { id: "cancel", label: "Cancel", tone: "danger" },
        ],
      });
      await persistExchange(input.actorEmployeeId, message, messages);
      return NextResponse.json({
        messages,
        context: { kind: "pending_leave_request", draft: intent.draft },
        meta: chatMeta(source),
      });
    }

    const fallback = [{ kind: "text", text: "I didn't understand that. Say “help” for examples." } satisfies BotMessage];
    await persistExchange(input.actorEmployeeId, message, fallback);
    return NextResponse.json({ messages: fallback, meta: chatMeta(source) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Chat failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
