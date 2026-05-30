import { prisma } from "@/lib/prisma";

export type JobDetail = {
  id: string;
  title: string;
  department: string;
  requirements: string;
  summary: string;
  highlights: string[];
  location: string;
  employmentType: string;
  applications: number;
};

const ENRICHMENT: Record<
  string,
  { summary: string; highlights: string[]; location: string; employmentType: string }
> = {
  job_swe: {
    summary:
      "Lead feature development for HR Nexus — our chat-first HR platform. You will ship TypeScript/React features, design APIs, and mentor junior engineers in a fast-moving product team.",
    highlights: [
      "TypeScript, React, Node.js stack",
      "System design & REST APIs",
      "5+ years product engineering",
      "Hybrid · flexible hours",
    ],
    location: "Ho Chi Minh City · Hybrid",
    employmentType: "Full-time",
  },
  job_hr: {
    summary:
      "Support the full employee lifecycle — recruitment, onboarding, and employee relations. You will coordinate hiring pipelines, maintain HR records, and partner with managers on people operations.",
    highlights: [
      "Full-cycle recruitment support",
      "Onboarding & HRIS admin",
      "Employee relations",
      "People Ops team of 4",
    ],
    location: "Ho Chi Minh City · On-site",
    employmentType: "Full-time",
  },
  job_sales: {
    summary:
      "Drive B2B SaaS revenue for HR Nexus across Vietnam and SEA. You will manage pipeline, run demos, negotiate contracts, and hit quarterly targets with marketing and product support.",
    highlights: [
      "B2B SaaS sales experience",
      "CRM & pipeline ownership",
      "Presentation & negotiation",
      "OTE + performance bonus",
    ],
    location: "Ho Chi Minh City · Hybrid",
    employmentType: "Full-time",
  },
};

function enrichJob(job: {
  id: string;
  title: string;
  department: string;
  requirements: string;
  summary?: string;
  highlightsJson?: string;
  location?: string;
  employmentType?: string;
  _count?: { applications: number };
}): JobDetail {
  if (job.summary?.trim()) {
    let highlights: string[] = [];
    try {
      highlights = JSON.parse(job.highlightsJson ?? "[]") as string[];
    } catch {
      highlights = [];
    }

    return {
      id: job.id,
      title: job.title,
      department: job.department,
      requirements: job.requirements,
      summary: job.summary,
      highlights: highlights.length ? highlights : job.requirements.split(",").map((s) => s.trim()).slice(0, 4),
      location: job.location?.trim() || "Ho Chi Minh City · Hybrid",
      employmentType: job.employmentType?.trim() || "Full-time",
      applications: job._count?.applications ?? 0,
    };
  }

  const meta = ENRICHMENT[job.id] ?? {
    summary: `Join our ${job.department} team as ${job.title}.`,
    highlights: job.requirements.split(",").map((s) => s.trim()).slice(0, 4),
    location: "Ho Chi Minh City",
    employmentType: "Full-time",
  };

  return {
    id: job.id,
    title: job.title,
    department: job.department,
    requirements: job.requirements,
    summary: meta.summary,
    highlights: meta.highlights,
    location: meta.location,
    employmentType: meta.employmentType,
    applications: job._count?.applications ?? 0,
  };
}

export async function getOpenJobDetails() {
  const jobs = await prisma.jobPosting.findMany({
    where: { status: "OPEN" },
    include: { _count: { select: { applications: true } } },
    orderBy: { title: "asc" },
  });
  return jobs.map(enrichJob);
}

export async function findOpenJobs(query?: string) {
  const jobs = await getOpenJobDetails();
  if (!query?.trim()) return jobs;

  const q = query.trim().toLowerCase();
  const matched = jobs.filter(
    (j) =>
      j.title.toLowerCase().includes(q) ||
      j.department.toLowerCase().includes(q) ||
      j.id.toLowerCase().includes(q) ||
      j.requirements.toLowerCase().includes(q) ||
      j.summary.toLowerCase().includes(q),
  );

  return matched.length ? matched : jobs.filter((j) => q.split(/\s+/).some((word) => word.length > 3 && j.title.toLowerCase().includes(word)));
}

export function requirementsBullets(requirements: string) {
  return requirements
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
