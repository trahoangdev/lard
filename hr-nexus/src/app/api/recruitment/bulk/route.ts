import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { bossApproveCandidates, submitShortlistToBoss } from "@/lib/recruitment/workflow";

export const runtime = "nodejs";

const bulkSchema = z.object({
  actorEmployeeId: z.string().min(1),
  action: z.enum(["submit_boss", "boss_approve"]),
});

export async function POST(request: Request) {
  try {
    const body = bulkSchema.parse(await request.json());
    const actor = await prisma.employee.findUnique({ where: { id: body.actorEmployeeId } });

    if (body.action === "submit_boss") {
      if (actor?.role !== "HR_ADMIN") {
        return NextResponse.json({ error: "HR only" }, { status: 403 });
      }
      const result = await submitShortlistToBoss(body.actorEmployeeId);
      return NextResponse.json(result);
    }

    if (body.action === "boss_approve") {
      if (actor?.role !== "MANAGER") {
        return NextResponse.json({ error: "Boss only" }, { status: 403 });
      }
      const result = await bossApproveCandidates(body.actorEmployeeId);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bulk action failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
