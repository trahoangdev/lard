import { NextResponse } from "next/server";
import { z } from "zod";
import { hrDecideLeave } from "@/lib/leave/workflow";

export const runtime = "nodejs";

const bodySchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  actorEmployeeId: z.string().min(1),
  reason: z.string().max(240).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const leaveId = Number(id);
    if (!Number.isFinite(leaveId)) {
      return NextResponse.json({ error: "Invalid leave request id." }, { status: 400 });
    }

    const body = bodySchema.parse(await request.json());

    const updated = await hrDecideLeave(leaveId, body.actorEmployeeId, body.decision, body.reason);

    return NextResponse.json({ ok: true, leaveRequest: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Decision failed.";
    const status = message.includes("Only HR") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
