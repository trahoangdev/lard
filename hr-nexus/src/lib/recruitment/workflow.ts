import { prisma } from "@/lib/prisma";
import { sendRecruitmentEmail } from "@/lib/email/recruitment-notify";

export async function toggleShortlist(applicationId: number, actorId: string, shortlisted: boolean) {
  const app = await prisma.cvApplication.update({
    where: { id: applicationId },
    data: {
      hrShortlisted: shortlisted,
      status: shortlisted ? "HR_SHORTLISTED" : "UNDER_REVIEW",
      hrDecisionBy: actorId,
      hrDecisionAt: new Date(),
    },
    include: { job: true },
  });

  await prisma.auditLog.create({
    data: {
      action: shortlisted ? "RECRUIT_SHORTLIST" : "RECRUIT_UNSHORTLIST",
      payloadJson: JSON.stringify({ applicationId, actorId }),
    },
  });

  return app;
}

export async function submitShortlistToBoss(actorId: string) {
  const shortlisted = await prisma.cvApplication.findMany({
    where: { hrShortlisted: true, bossApproved: false, status: { in: ["HR_SHORTLISTED", "UNDER_REVIEW"] } },
    include: { job: true },
  });

  if (!shortlisted.length) {
    return { count: 0, ids: [] as number[] };
  }

  await prisma.cvApplication.updateMany({
    where: { id: { in: shortlisted.map((a) => a.id) } },
    data: { status: "PENDING_BOSS" },
  });

  await prisma.auditLog.create({
    data: {
      action: "RECRUIT_SUBMIT_BOSS",
      payloadJson: JSON.stringify({ actorId, ids: shortlisted.map((a) => a.id) }),
    },
  });

  return { count: shortlisted.length, ids: shortlisted.map((a) => a.id) };
}

export async function bossApproveCandidates(actorId: string, applicationIds?: number[]) {
  const where = applicationIds?.length
    ? { id: { in: applicationIds }, status: "PENDING_BOSS" as const }
    : { status: "PENDING_BOSS" as const, hrShortlisted: true };

  const pending = await prisma.cvApplication.findMany({ where, include: { job: true } });
  if (!pending.length) return { approved: 0, ids: [] as number[] };

  await prisma.cvApplication.updateMany({
    where: { id: { in: pending.map((a) => a.id) } },
    data: {
      bossApproved: true,
      status: "BOSS_APPROVED",
      bossDecisionBy: actorId,
      bossDecisionAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "RECRUIT_BOSS_APPROVE",
      payloadJson: JSON.stringify({ actorId, ids: pending.map((a) => a.id) }),
    },
  });

  return { approved: pending.length, ids: pending.map((a) => a.id) };
}

export async function hrDecision(
  applicationId: number,
  actorId: string,
  decision: "accept" | "reject",
  reason?: string,
) {
  const status = decision === "accept" ? "ACCEPTED" : "REJECTED";
  const app = await prisma.cvApplication.update({
    where: { id: applicationId },
    data: {
      status,
      hrDecisionBy: actorId,
      hrDecisionAt: new Date(),
      decisionReason: reason ?? null,
    },
    include: { job: true },
  });

  await prisma.auditLog.create({
    data: {
      action: decision === "accept" ? "RECRUIT_ACCEPT" : "RECRUIT_REJECT",
      payloadJson: JSON.stringify({ applicationId, actorId, reason }),
    },
  });

  const emailResult = await sendRecruitmentEmail({
    to: app.candidateEmail,
    candidateName: app.candidateName,
    jobTitle: app.job.title,
    decision,
    reason,
  });

  return { app, emailResult };
}

export async function getPendingBossRecruitment() {
  return prisma.cvApplication.findMany({
    where: { status: "PENDING_BOSS", hrShortlisted: true },
    include: { job: true },
    orderBy: { matchScore: "desc" },
  });
}
