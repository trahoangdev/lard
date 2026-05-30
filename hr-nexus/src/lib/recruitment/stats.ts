import { prisma } from "@/lib/prisma";
import { isPdfBinaryGarbage } from "@/lib/recruitment/cv-parse";
import { rescanApplicationIfNeeded } from "@/lib/recruitment/rescan";
import type { MatchCriterion } from "@/lib/recruitment/score";

export type CandidateRow = {
  id: number;
  candidateName: string;
  candidateEmail: string;
  jobId: string;
  jobTitle: string;
  department: string;
  matchScore: number;
  status: string;
  hrShortlisted: boolean;
  bossApproved: boolean;
  summary: string;
  criteria: MatchCriterion[];
  submittedAt: string;
};

function parseCriteria(json: string): MatchCriterion[] {
  try {
    const data = JSON.parse(json);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function getRankedCandidates(jobId?: string, jobTitleQuery?: string) {
  const jobs = await prisma.jobPosting.findMany({ where: { status: "OPEN" } });
  let targetJobId = jobId;

  if (!targetJobId && jobTitleQuery) {
    const q = jobTitleQuery.toLowerCase();
    const match = jobs.find(
      (j) => j.title.toLowerCase().includes(q) || j.department.toLowerCase().includes(q) || j.id.toLowerCase().includes(q),
    );
    targetJobId = match?.id;
  }

  const where = targetJobId ? { jobId: targetJobId } : {};
  let apps = await prisma.cvApplication.findMany({
    where,
    include: { job: true },
    orderBy: [{ matchScore: "desc" }, { createdAt: "desc" }],
  });

  for (const app of apps) {
    if (isPdfBinaryGarbage(app.parsedText ?? "")) {
      await rescanApplicationIfNeeded(app.id);
    }
  }

  if (apps.some((a) => isPdfBinaryGarbage(a.parsedText ?? ""))) {
    apps = await prisma.cvApplication.findMany({
      where,
      include: { job: true },
      orderBy: [{ matchScore: "desc" }, { createdAt: "desc" }],
    });
  }

  const jobMap = new Map(jobs.map((j) => [j.id, j]));
  const candidates: CandidateRow[] = apps.map((a) => {
    const criteria = parseCriteria(a.matchDetailsJson);
    return {
      id: a.id,
      candidateName: a.candidateName,
      candidateEmail: a.candidateEmail,
      jobId: a.jobId,
      jobTitle: a.job.title,
      department: a.job.department,
      matchScore: Math.round(a.matchScore),
      status: a.status,
      hrShortlisted: a.hrShortlisted,
      bossApproved: a.bossApproved,
      summary: criteria[0]?.note ?? "Application on file",
      criteria,
      submittedAt: a.createdAt.toISOString(),
    };
  });

  return {
    jobId: targetJobId ?? null,
    jobTitle: targetJobId ? jobMap.get(targetJobId)?.title ?? null : null,
    totalApplications: candidates.length,
    openJobs: jobs.map((j) => ({
      id: j.id,
      title: j.title,
      department: j.department,
      count: apps.filter((a) => a.jobId === j.id).length,
    })),
    candidates,
  };
}

export async function getApplicationProfile(id: number) {
  await rescanApplicationIfNeeded(id);

  const app = await prisma.cvApplication.findUnique({
    where: { id },
    include: { job: true },
  });
  if (!app) return null;

  const criteria = parseCriteria(app.matchDetailsJson);
  return {
    id: app.id,
    candidateName: app.candidateName,
    candidateEmail: app.candidateEmail,
    phone: app.phone,
    jobId: app.jobId,
    jobTitle: app.job.title,
    department: app.job.department,
    requirements: app.job.requirements,
    matchScore: Math.round(app.matchScore),
    status: app.status,
    hrShortlisted: app.hrShortlisted,
    bossApproved: app.bossApproved,
    criteria,
    parsedExcerpt: isPdfBinaryGarbage(app.parsedText ?? "")
      ? "CV text could not be read — re-upload as PDF or TXT."
      : (app.parsedText ?? "").slice(0, 800),
    originalFilename: app.originalFilename,
    cvUrl: `/api/recruitment/cv/${app.id}`,
    submittedAt: app.createdAt.toISOString(),
    decisionReason: app.decisionReason,
  };
}

export async function getRecruitmentDataset() {
  const [jobs, apps, auditCount] = await Promise.all([
    prisma.jobPosting.findMany({ include: { _count: { select: { applications: true } } } }),
    prisma.cvApplication.findMany({ include: { job: true }, orderBy: { createdAt: "desc" } }),
    prisma.auditLog.count({ where: { action: { startsWith: "RECRUIT_" } } }),
  ]);

  const byStatus: Record<string, number> = {};
  for (const a of apps) {
    byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
  }

  return {
    generatedAt: new Date().toISOString(),
    jobs: jobs.map((j) => ({
      id: j.id,
      title: j.title,
      department: j.department,
      status: j.status,
      applications: j._count.applications,
    })),
    applications: apps.map((a) => ({
      id: a.id,
      candidateName: a.candidateName,
      candidateEmail: a.candidateEmail,
      jobTitle: a.job.title,
      matchScore: Math.round(a.matchScore),
      status: a.status,
      hrShortlisted: a.hrShortlisted,
      bossApproved: a.bossApproved,
      submittedAt: a.createdAt.toISOString(),
    })),
    summary: {
      totalJobs: jobs.length,
      openJobs: jobs.filter((j) => j.status === "OPEN").length,
      totalApplications: apps.length,
      shortlisted: apps.filter((a) => a.hrShortlisted).length,
      bossApproved: apps.filter((a) => a.bossApproved).length,
      accepted: apps.filter((a) => a.status === "ACCEPTED").length,
      rejected: apps.filter((a) => a.status === "REJECTED").length,
      auditEvents: auditCount,
      byStatus,
    },
  };
}

export async function getApplicantStatus(email: string) {
  const apps = await prisma.cvApplication.findMany({
    where: { candidateEmail: email.toLowerCase() },
    include: { job: true },
    orderBy: { createdAt: "desc" },
  });

  return apps.map((a) => ({
    id: a.id,
    jobTitle: a.job.title,
    status: a.status,
    matchScore: Math.round(a.matchScore),
    submittedAt: a.createdAt.toISOString(),
    decisionReason: a.decisionReason,
  }));
}
