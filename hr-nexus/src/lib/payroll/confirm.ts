import { prisma } from "@/lib/prisma";
import {
  sendPayrollNotifications,
  summarizeEmailResults,
  type PayrollNotifyResult,
} from "@/lib/email/payroll-notify";
import {
  bankBatchKey,
  bankBatchPath,
  payrollResultKey,
  payrollResultPath,
  readArtifact,
  resolveRunDir,
  writeArtifact,
} from "@/lib/storage";
import { buildPayrollResultXlsx } from "@/lib/payroll/excel";
import { isSupabaseStorageEnabled } from "@/lib/supabase/server";

function csvCell(value: string) {
  const v = value ?? "";
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export async function submitPayrollForBoss(runId: number, requestedBy: string) {
  const run = await prisma.payrollRun.findUnique({ where: { id: runId }, include: { items: true } });
  if (!run) throw new Error("Payroll run not found.");
  if (run.status !== "DRAFT") throw new Error("Payroll run is not in draft status.");

  const invalidCount = run.items.filter((i) => i.status === "FAILED").length;
  if (invalidCount > 0 && run.items.every((i) => i.status === "FAILED")) {
    throw new Error("All payroll rows are invalid.");
  }

  await prisma.payrollRun.update({
    where: { id: runId },
    data: {
      status: "PENDING_BOSS",
      requestedBy,
      requestedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "PAYROLL_SUBMITTED_FOR_BOSS",
      payloadJson: JSON.stringify({ runId, requestedBy, totalAmount: Number(run.totalAmount) }),
    },
  });

  return {
    runId,
    totalAmount: Number(run.totalAmount),
    validCount: run.items.filter((i) => i.status !== "FAILED").length,
    invalidCount,
  };
}

export async function confirmPayrollRun(runId: number, approvedBy: string) {
  const run = await prisma.payrollRun.findUnique({
    where: { id: runId },
    include: { items: true },
  });

  if (!run) throw new Error("Payroll run not found.");
  if (run.status !== "PENDING_BOSS") throw new Error("Payroll run is not awaiting boss approval.");

  const inputBuffer = await readArtifact(run.inputStoragePath);
  const now = new Date();
  const validItems = run.items.filter((i) => i.status !== "FAILED");

  const emailResults = await sendPayrollNotifications(
    validItems.map((i) => ({
      id: i.id,
      employeeName: i.employeeName,
      email: i.email,
      amount: Number(i.amount),
      note: i.note,
    })),
    runId,
  );

  const resultByItemId = new Map(emailResults.map((r) => [r.itemId, r]));

  await prisma.$transaction(
    validItems.map((i) => {
      const er = resultByItemId.get(i.id);
      return prisma.payrollItem.update({
        where: { id: i.id },
        data: {
          status: er?.status ?? "SENT_SIMULATED",
          message: er?.message ?? "Processed",
          processedAt: now,
        },
      });
    }),
  );

  const rowStatus = new Map<
    number,
    { status: string; message?: string | null; processedAt?: Date | null }
  >();

  for (const item of run.items) {
    if (item.status === "FAILED") {
      rowStatus.set(item.sourceRowNumber, {
        status: "FAILED",
        message: item.message,
        processedAt: null,
      });
      continue;
    }
    const er = resultByItemId.get(item.id);
    rowStatus.set(item.sourceRowNumber, {
      status: er?.status ?? "SENT_SIMULATED",
      message: er?.message ?? "Processed",
      processedAt: now,
    });
  }

  const resultXlsx = await buildPayrollResultXlsx(inputBuffer, rowStatus);

  const runDir = resolveRunDir(run.inputStoragePath);
  const bankPath = isSupabaseStorageEnabled() ? bankBatchKey(runDir) : bankBatchPath(runDir);
  const resultPath = isSupabaseStorageEnabled() ? payrollResultKey(runDir) : payrollResultPath(runDir);

  const lines = [
    "EmployeeName,BankAccount,Amount,Note",
    ...validItems.map((i) =>
      [
        csvCell(i.employeeName),
        csvCell(i.bankAccount),
        csvCell(String(i.amount)),
        csvCell(i.note ?? ""),
      ].join(","),
    ),
  ];

  const bankBuffer = Buffer.from(lines.join("\n"), "utf8");

  if (isSupabaseStorageEnabled()) {
    await writeArtifact(bankPath, bankBuffer, "text/csv; charset=utf-8");
    await writeArtifact(
      resultPath,
      resultXlsx,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
  } else {
    const fs = await import("node:fs/promises");
    await fs.writeFile(bankPath, bankBuffer, "utf8");
    await fs.writeFile(resultPath, resultXlsx);
  }

  const totalAmount = validItems.reduce((sum, i) => sum + Number(i.amount), 0);
  const emailStats = summarizeEmailResults(emailResults);

  await prisma.payrollRun.update({
    where: { id: runId },
    data: {
      status: "DONE",
      totalAmount,
      bankBatchStoragePath: bankPath,
      resultXlsxStoragePath: resultPath,
      approvedBy,
      approvedAt: now,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "PAYROLL_EMAILS_SENT",
      payloadJson: JSON.stringify({ runId, emailStats, approvedBy }),
    },
  });

  return {
    runId,
    totalAmount,
    validCount: validItems.length,
    invalidCount: run.items.length - validItems.length,
    emailStats,
    emailDetails: emailResults.filter((r) => r.status === "SENT").slice(0, 5),
  };
}
