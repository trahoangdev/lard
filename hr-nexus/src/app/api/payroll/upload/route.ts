import { PayrollItemStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { inputXlsxKey, runFolder, writeArtifact } from "@/lib/storage";
import { isoDate, maskBankAccount } from "@/lib/utils";
import { parsePayrollWorkbook } from "@/lib/payroll/excel";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const actorId = String(formData.get("actorEmployeeId") ?? "");

    if (actorId) {
      const actor = await prisma.employee.findUnique({ where: { id: actorId } });
      if (actor?.role !== "HR_ADMIN") {
        return NextResponse.json({ error: "Only HR can upload payroll files." }, { status: 403 });
      }
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Missing file upload." }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      return NextResponse.json({ error: "Only .xlsx files are supported." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { rows } = await parsePayrollWorkbook(buffer);

    if (rows.length === 0) {
      return NextResponse.json({ error: "No payroll rows found." }, { status: 400 });
    }

    const created = await prisma.$transaction(async (tx) => {
      const run = await tx.payrollRun.create({
        data: {
          status: "DRAFT",
          totalAmount: 0,
          inputFilename: file.name,
          inputStoragePath: "__PENDING__",
        },
      });

      const day = isoDate(new Date());
      const runKey = runFolder(run.id, day);
      const objectKey = inputXlsxKey(runKey, file.name);
      const inputPath = await writeArtifact(
        objectKey,
        buffer,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );

      const itemsData = rows.map((r) => ({
        runId: run.id,
        sourceRowNumber: r.rowNumber,
        employeeName: r.employeeName,
        email: r.email,
        bankAccount: r.bankAccount,
        amount: Number.isFinite(r.amount) ? r.amount : 0,
        note: r.note ?? null,
        status: (r.issues.length ? "FAILED" : "QUEUED") as PayrollItemStatus,
        message: r.issues.length ? r.issues.join("; ") : null,
      }));

      await tx.payrollItem.createMany({ data: itemsData });

      const validTotal = rows
        .filter((r) => r.issues.length === 0)
        .reduce((sum, r) => sum + (Number.isFinite(r.amount) ? r.amount : 0), 0);

      await tx.payrollRun.update({
        where: { id: run.id },
        data: { inputStoragePath: inputPath, totalAmount: validTotal },
      });

      const invalidRows = rows
        .filter((r) => r.issues.length)
        .slice(0, 8)
        .map((r) => ({
          rowNumber: r.rowNumber,
          employeeName: r.employeeName,
          email: r.email,
          bankAccountMasked: maskBankAccount(r.bankAccount),
          issues: r.issues,
        }));

      return {
        runId: run.id,
        rowCount: rows.length,
        validCount: rows.filter((r) => r.issues.length === 0).length,
        invalidCount: rows.filter((r) => r.issues.length).length,
        totalAmount: validTotal,
        invalidRows,
      };
    });

    return NextResponse.json(created);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
