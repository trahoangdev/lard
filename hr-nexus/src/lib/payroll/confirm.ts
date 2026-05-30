import path from "node:path";
import fs from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { bankBatchPath, payrollResultPath } from "@/lib/storage";
import { buildPayrollResultXlsx } from "@/lib/payroll/excel";

function csvCell(value: string) {
  const v = value ?? "";
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export async function confirmPayrollRun(runId: number) {
  const run = await prisma.payrollRun.findUnique({
    where: { id: runId },
    include: { items: true },
  });

  if (!run) throw new Error("Payroll run not found.");

  const inputBuffer = await fs.readFile(run.inputStoragePath);
  const now = new Date();

  const validItems = run.items.filter((i) => i.status !== "FAILED");

  await prisma.$transaction(
    validItems.map((i) =>
      prisma.payrollItem.update({
        where: { id: i.id },
        data: {
          status: "SENT_SIMULATED",
          message: "Simulated email sent",
          processedAt: now,
        },
      }),
    ),
  );

  const rowStatus = new Map<
    number,
    { status: string; message?: string | null; processedAt?: Date | null }
  >();

  for (const item of run.items) {
    const processedAt = item.status === "FAILED" ? null : now;
    rowStatus.set(item.sourceRowNumber, {
      status: item.status === "FAILED" ? "FAILED" : "SENT_SIMULATED",
      message: item.status === "FAILED" ? item.message : "Simulated email sent",
      processedAt,
    });
  }

  const resultXlsx = await buildPayrollResultXlsx(inputBuffer, rowStatus);

  const runDir = path.dirname(run.inputStoragePath);
  const bankCsvPath = bankBatchPath(runDir);
  const resultPath = payrollResultPath(runDir);

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

  await fs.writeFile(bankCsvPath, lines.join("\n"), "utf8");
  await fs.writeFile(resultPath, resultXlsx);

  const totalAmount = validItems.reduce((sum, i) => sum + Number(i.amount), 0);

  await prisma.payrollRun.update({
    where: { id: runId },
    data: {
      status: "DONE",
      totalAmount,
      bankBatchStoragePath: bankCsvPath,
      resultXlsxStoragePath: resultPath,
    },
  });

  return {
    runId,
    totalAmount,
    validCount: validItems.length,
    invalidCount: run.items.length - validItems.length,
  };
}

