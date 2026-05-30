import { z } from "zod";
import { chatCompletion } from "@/lib/ai/openai";
import type { ParsedIntent } from "@/lib/chat/parse";
import { isoDate } from "@/lib/utils";

const aiIntentSchema = z.object({
  kind: z.enum([
    "leave_request",
    "leave_balance",
    "leave_status",
    "leave_stats",
    "payroll_run",
    "payroll_pending",
    "payroll_approve",
    "job_list",
    "job_apply",
    "job_details",
    "cv_applications",
    "cv_profile",
    "recruitment_submit_boss",
    "recruitment_boss_pending",
    "recruitment_boss_approve",
    "recruitment_dataset",
    "job_draft",
    "application_status",
    "help",
    "general_chat",
  ]),
  draft: z
    .object({
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      type: z.enum(["ANNUAL", "SICK", "UNPAID"]),
      reason: z.string().min(1).max(220),
    })
    .optional(),
  leaveRequestId: z.number().int().positive().nullable().optional(),
  jobTitle: z.string().nullable().optional(),
  applicationId: z.number().int().positive().nullable().optional(),
  email: z.string().email().nullable().optional(),
});

function buildSystemPrompt(today: string) {
  return `You parse HR chat messages for HR Nexus into JSON only.

Today is ${today} (YYYY-MM-DD).

Return JSON:
{
  "kind": "leave_request" | "leave_balance" | "leave_status" | "payroll_run" | "help" | "general_chat",
  "draft": { "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD", "type": "ANNUAL"|"SICK"|"UNPAID", "reason": "..." },
  "leaveRequestId": number | null
}

Rules:
- Resolve natural language dates to ISO dates using today as reference.
- leave_request: user wants to book time off. Infer type from context (vacation/holiday=ANNUAL, sick/ill=SICK).
- leave_balance: user asks how many days they have left.
- leave_status: user asks about approval status; set leaveRequestId if a number is mentioned.
- payroll_run: HR wants to run payroll or pay salaries.
- payroll_pending: Boss asks for pending payroll approvals.
- payroll_approve: Boss approves a payroll run.
- leave_stats: HR or Boss asks for team leave statistics.
- job_list: user wants to see open job postings.
- job_apply: applicant wants to apply; set jobTitle if mentioned.
- job_details: applicant asks about job description, requirements, responsibilities, or role info; set jobTitle if a specific role is mentioned.
- cv_applications: HR/recruiter asks how many CVs or who applied; set jobTitle if filtered.
- cv_profile: view candidate profile; set applicationId if number mentioned.
- recruitment_submit_boss: HR submits shortlist to boss.
- recruitment_boss_pending: boss asks pending recruitment approvals.
- recruitment_boss_approve: boss approves shortlisted candidates.
- recruitment_dataset: HR wants hiring dataset export/stats.
- job_draft: HR wants to draft or create a new job posting from brief notes.
- application_status: applicant checks hiring progress; set email if provided.
- help: greetings or "what can you do".
- general_chat: HR policy or general questions that are not a workflow action.
- Omit draft unless kind is leave_request. Omit leaveRequestId unless kind is leave_status.`;
}

export async function parseIntentWithAi(message: string, now = new Date()): Promise<ParsedIntent | null> {
  const today = isoDate(now);
  const raw = await chatCompletion(
    [
      { role: "system", content: buildSystemPrompt(today) },
      { role: "user", content: message },
    ],
    { json: true, temperature: 0.1, maxTokens: 400 },
  );

  const parsed = aiIntentSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) return null;

  const data = parsed.data;

  if (data.kind === "leave_request") {
    if (!data.draft) return null;
    return { kind: "leave_request", draft: data.draft };
  }

  if (data.kind === "leave_status") {
    return { kind: "leave_status", id: data.leaveRequestId ?? undefined };
  }

  if (data.kind === "leave_stats") return { kind: "leave_stats" };
  if (data.kind === "payroll_pending") return { kind: "payroll_pending" };
  if (data.kind === "payroll_approve") return { kind: "payroll_approve" };

  if (data.kind === "job_apply") {
    return { kind: "job_apply", jobTitle: data.jobTitle ?? undefined };
  }
  if (data.kind === "job_details") {
    return { kind: "job_details", jobTitle: data.jobTitle ?? undefined };
  }
  if (data.kind === "cv_applications") {
    return { kind: "cv_applications", jobTitle: data.jobTitle ?? undefined };
  }
  if (data.kind === "cv_profile" && data.applicationId) {
    return { kind: "cv_profile", applicationId: data.applicationId };
  }
  if (data.kind === "application_status") {
    return { kind: "application_status", email: data.email ?? undefined };
  }
  if (data.kind === "recruitment_submit_boss") return { kind: "recruitment_submit_boss" };
  if (data.kind === "recruitment_boss_pending") return { kind: "recruitment_boss_pending" };
  if (data.kind === "recruitment_boss_approve") return { kind: "recruitment_boss_approve" };
  if (data.kind === "recruitment_dataset") return { kind: "recruitment_dataset" };
  if (data.kind === "job_draft") return { kind: "job_draft" };
  if (data.kind === "job_list") return { kind: "job_list" };
  if (data.kind === "leave_balance") return { kind: "leave_balance" };
  if (data.kind === "payroll_run") return { kind: "payroll_run" };
  if (data.kind === "help") return { kind: "help" };
  if (data.kind === "general_chat") return { kind: "general_chat" };

  return null;
}
