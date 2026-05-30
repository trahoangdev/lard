import { NextResponse } from "next/server";
import { z } from "zod";
import { getApplicationProfile } from "@/lib/recruitment/stats";
import {
  bossApproveCandidates,
  hrDecision,
  submitShortlistToBoss,
  toggleShortlist,
} from "@/lib/recruitment/workflow";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const actionSchema = z.object({
  actorEmployeeId: z.string().min(1),
  action: z.enum(["shortlist", "unshortlist", "accept", "reject", "submit_boss", "boss_approve"]),
  reason: z.string().max(500).optional(),
});

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const profile = await getApplicationProfile(Number(id));
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(profile);
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const appId = Number(id);
    const body = actionSchema.parse(await request.json());
    const actor = await prisma.employee.findUnique({ where: { id: body.actorEmployeeId } });

    if (body.action === "shortlist" || body.action === "unshortlist") {
      if (actor?.role !== "HR_ADMIN") {
        return NextResponse.json({ error: "HR only" }, { status: 403 });
      }
      const app = await toggleShortlist(appId, body.actorEmployeeId, body.action === "shortlist");
      return NextResponse.json({ ok: true, hrShortlisted: app.hrShortlisted, status: app.status });
    }

    if (body.action === "accept" || body.action === "reject") {
      if (actor?.role !== "HR_ADMIN") {
        return NextResponse.json({ error: "HR only" }, { status: 403 });
      }
      const result = await hrDecision(appId, body.actorEmployeeId, body.action, body.reason);
      return NextResponse.json({
        ok: true,
        status: result.app.status,
        email: result.emailResult,
      });
    }

    return NextResponse.json({ error: "Use bulk endpoint for submit_boss / boss_approve" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Action failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
