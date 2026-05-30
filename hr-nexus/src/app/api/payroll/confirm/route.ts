import { NextResponse } from "next/server";
import { z } from "zod";
import { confirmPayrollRun } from "@/lib/payroll/confirm";

export const runtime = "nodejs";

const bodySchema = z.object({
  runId: z.number().int().positive(),
  approvedBy: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  try {
    const json = bodySchema.parse(await request.json());
    const result = await confirmPayrollRun(json.runId, json.approvedBy ?? "mgr_001");

    return NextResponse.json({
      ...result,
      artifacts: {
        bankBatchUrl: `/api/payroll/runs/${json.runId}/artifact/bank_batch`,
        payrollResultUrl: `/api/payroll/runs/${json.runId}/artifact/payroll_result`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Confirm failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
