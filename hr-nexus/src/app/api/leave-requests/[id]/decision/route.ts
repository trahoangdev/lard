import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const bodySchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  decidedBy: z.string().min(1).optional(),
  reason: z.string().max(240).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    const leaveId = Number(id);
    if (!Number.isFinite(leaveId)) {
      return NextResponse.json({ error: "Invalid leave request id." }, { status: 400 });
    }

    const body = bodySchema.parse(await request.json());

    const updated = await prisma.leaveRequest.update({
      where: { id: leaveId },
      data: {
        status: body.decision === "APPROVE" ? "APPROVED" : "REJECTED",
        decidedAt: new Date(),
        decidedBy: body.decidedBy ?? "mgr_001",
        decisionReason: body.reason ?? null,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "LEAVE_DECISION",
        payloadJson: JSON.stringify({
          leaveId,
          decision: body.decision,
          decidedBy: body.decidedBy ?? "mgr_001",
        }),
      },
    });

    return NextResponse.json({ ok: true, leaveRequest: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Decision failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
