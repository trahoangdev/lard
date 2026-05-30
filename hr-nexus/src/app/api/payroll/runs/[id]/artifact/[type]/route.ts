import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: { id: string; type: string } },
) {
  try {
    const { id, type } = params;
    const runId = Number(id);
    if (!Number.isFinite(runId)) {
      return NextResponse.json({ error: "Invalid run id." }, { status: 400 });
    }

    const run = await prisma.payrollRun.findUnique({ where: { id: runId } });
    if (!run) return NextResponse.json({ error: "Run not found." }, { status: 404 });

    const filePath =
      type === "bank_batch"
        ? run.bankBatchStoragePath
        : type === "payroll_result"
          ? run.resultXlsxStoragePath
          : null;

    if (!filePath) return NextResponse.json({ error: "Artifact not available." }, { status: 404 });

    const buffer = await fs.readFile(filePath);
    const filename = path.basename(filePath);

    const contentType =
      type === "bank_batch"
        ? "text/csv; charset=utf-8"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    return new NextResponse(buffer, {
      headers: {
        "content-type": contentType,
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Download failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
