import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseIntent } from "@/lib/chat/parse";
import { chatRequestSchema } from "@/lib/chat/schemas";
import { daysBetweenInclusive, maskBankAccount } from "@/lib/utils";
import { confirmPayrollRun } from "@/lib/payroll/confirm";

export const runtime = "nodejs";

type BotMessage =
  | { kind: "text"; text: string }
  | { kind: "card"; card: unknown }
  | { kind: "actions"; actions: Array<{ id: string; label: string; tone?: "primary" | "danger" }> };

function isConfirm(text: string) {
  return /^(confirm|yes|y|ok|okay)\b/i.test(text.trim());
}

function isCancel(text: string) {
  return /^(cancel|no|n|stop)\b/i.test(text.trim());
}

export async function POST(request: Request) {
  try {
    const input = chatRequestSchema.parse(await request.json());
    const message = input.message.trim();
    const lower = message.toLowerCase();

    if (input.context?.kind === "pending_leave_request") {
      if (isCancel(lower)) {
        return NextResponse.json({
          messages: [{ kind: "text", text: "Cancelled. Want to try again?" } satisfies BotMessage],
        });
      }

      if (!isConfirm(lower)) {
        return NextResponse.json({
          messages: [
            { kind: "text", text: "Reply “confirm” to submit, or “cancel” to discard." } satisfies BotMessage,
          ],
          context: input.context,
        });
      }

      const start = new Date(`${input.context.draft.startDate}T00:00:00`);
      const end = new Date(`${input.context.draft.endDate}T00:00:00`);

      if (end.getTime() < start.getTime()) {
        return NextResponse.json({
          messages: [{ kind: "text", text: "End date must be after start date." } satisfies BotMessage],
        });
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

      return NextResponse.json({
        messages: [
          { kind: "text", text: "Submitted." } satisfies BotMessage,
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
            },
          } satisfies BotMessage,
        ],
      });
    }

    if (input.context?.kind === "payroll_uploaded") {
      const run = await prisma.payrollRun.findUnique({
        where: { id: input.context.runId },
        include: { items: true },
      });

      if (!run) {
        return NextResponse.json({
          messages: [{ kind: "text", text: "I can’t find that payroll run." } satisfies BotMessage],
        });
      }

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

      return NextResponse.json({
        messages: [
          {
            kind: "card",
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
          } satisfies BotMessage,
          { kind: "text", text: "Confirm to generate the bank batch and payroll result?" } satisfies BotMessage,
          {
            kind: "actions",
            actions: [
              { id: "confirm_payroll", label: "Confirm payroll", tone: "primary" },
              { id: "cancel", label: "Cancel", tone: "danger" },
            ],
          } satisfies BotMessage,
        ],
        context: { kind: "pending_payroll_confirm", runId: run.id },
      });
    }

    if (input.context?.kind === "pending_payroll_confirm") {
      if (isCancel(lower)) {
        return NextResponse.json({
          messages: [{ kind: "text", text: "Cancelled payroll confirmation." } satisfies BotMessage],
        });
      }

      if (!isConfirm(lower)) {
        return NextResponse.json({
          messages: [
            { kind: "text", text: "Reply “confirm” to generate artifacts, or “cancel” to stop." } satisfies BotMessage,
          ],
          context: input.context,
        });
      }

      const result = await confirmPayrollRun(input.context.runId);

      return NextResponse.json({
        messages: [
          { kind: "text", text: "Artifacts generated. Emails marked as simulated." } satisfies BotMessage,
          {
            kind: "card",
            card: {
              type: "payroll_run",
              runId: result.runId,
              totalAmount: result.totalAmount,
              validCount: result.validCount,
              invalidCount: result.invalidCount,
              artifacts: {
                bankBatchUrl: `/api/payroll/runs/${result.runId}/artifact/bank_batch`,
                payrollResultUrl: `/api/payroll/runs/${result.runId}/artifact/payroll_result`,
              },
            },
          } satisfies BotMessage,
        ],
      });
    }

    const intent = parseIntent(message);

    if (intent.kind === "payroll_run") {
      return NextResponse.json({
        messages: [
          {
            kind: "card",
            card: {
              type: "payroll_start",
              sampleUrl: "/api/payroll/sample",
            },
          } satisfies BotMessage,
          {
            kind: "text",
            text: "Upload payroll.xlsx to start. Required columns: EmployeeName, Email, BankAccount, Amount.",
          } satisfies BotMessage,
          {
            kind: "actions",
            actions: [{ id: "upload_payroll", label: "Upload payroll.xlsx", tone: "primary" }],
          } satisfies BotMessage,
        ],
      });
    }

    if (intent.kind === "leave_balance") {
      const approved = await prisma.leaveRequest.findMany({
        where: { employeeId: input.actorEmployeeId, status: "APPROVED" },
      });

      const usedAnnual = approved
        .filter((r) => r.type === "ANNUAL")
        .reduce((sum, r) => sum + daysBetweenInclusive(r.startDate, r.endDate), 0);
      const usedSick = approved
        .filter((r) => r.type === "SICK")
        .reduce((sum, r) => sum + daysBetweenInclusive(r.startDate, r.endDate), 0);

      const policy = { annual: 10, sick: 7 };

      return NextResponse.json({
        messages: [
          {
            kind: "card",
            card: {
              type: "leave_balance",
              annual: { total: policy.annual, used: usedAnnual, remaining: Math.max(0, policy.annual - usedAnnual) },
              sick: { total: policy.sick, used: usedSick, remaining: Math.max(0, policy.sick - usedSick) },
            },
          } satisfies BotMessage,
        ],
      });
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
        return NextResponse.json({
          messages: [{ kind: "text", text: "No leave requests found yet." } satisfies BotMessage],
        });
      }

      const startIso = record.startDate.toISOString().slice(0, 10);
      const endIso = record.endDate.toISOString().slice(0, 10);

      return NextResponse.json({
        messages: [
          {
            kind: "card",
            card: {
              type: "leave_request",
              id: record.id,
              status: record.status,
              typeName: record.type,
              startDate: startIso,
              endDate: endIso,
              reason: record.reason,
              decidedBy: record.decidedBy,
              decisionReason: record.decisionReason,
            },
          } satisfies BotMessage,
        ],
      });
    }

    if (intent.kind === "leave_request") {
      return NextResponse.json({
        messages: [
          {
            kind: "text",
            text: `I’m going to submit ${intent.draft.type.toLowerCase()} leave from ${intent.draft.startDate} to ${intent.draft.endDate}. Confirm?`,
          } satisfies BotMessage,
          {
            kind: "actions",
            actions: [
              { id: "confirm", label: "Confirm", tone: "primary" },
              { id: "cancel", label: "Cancel", tone: "danger" },
            ],
          } satisfies BotMessage,
        ],
        context: { kind: "pending_leave_request", draft: intent.draft },
      });
    }

    return NextResponse.json({
      messages: [
        {
          kind: "text",
          text: "Try one of these:\n• Request leave 2026-06-10 to 2026-06-12 annual reason family\n• What’s my leave balance?\n• Status of my leave request 12\n• Run payroll",
        } satisfies BotMessage,
      ],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Chat failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
