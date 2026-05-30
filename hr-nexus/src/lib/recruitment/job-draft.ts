import { z } from "zod";
import { chatCompletion } from "@/lib/ai/openai";
import { isAiEnabled } from "@/lib/ai/config";
import { prisma } from "@/lib/prisma";

export const jobDraftSchema = z.object({
  title: z.string().min(1),
  department: z.string().min(1),
  location: z.string().min(1),
  employmentType: z.string().min(1),
  summary: z.string().min(1).max(280),
  highlights: z.array(z.string()).min(2).max(4),
  requirements: z.array(z.string()).min(2).max(5),
  responsibilities: z.array(z.string()).min(2).max(4),
  qualifications: z.array(z.string()).max(3).default([]),
  benefits: z.array(z.string()).min(1).max(3),
  fullDescription: z.string().min(1).max(500),
});

export type JobDraft = z.infer<typeof jobDraftSchema>;

export type JobIntakeStep = "title" | "department" | "location" | "requirements" | "about" | "ready";

export type JobIntakeAnswers = {
  title?: string;
  department?: string;
  location?: string;
  requirements?: string;
  about?: string;
};

const STEP_ORDER: JobIntakeStep[] = ["title", "department", "location", "requirements", "about", "ready"];

const INTAKE_QUESTIONS: Record<Exclude<JobIntakeStep, "ready">, string> = {
  title: "Step 1 of 5 — What is the job title? (e.g. Marketing Manager, Data Analyst)",
  department: "Step 2 of 5 — Which team or department is this role in?",
  location: "Step 3 of 5 — Where is the role based, and full-time or hybrid? (e.g. HCMC · Hybrid · Full-time)",
  requirements: "Step 4 of 5 — What are the must-have skills or experience?",
  about: "Step 5 of 5 — In one or two sentences, what will this person do day to day?",
};

const GENERATOR_SYSTEM = `You write SHORT job postings for HR Nexus (Vietnam tech company). Be concise — entire JSON must fit a quick careers card.

Return JSON only:
{
  "title": "Job title",
  "department": "Team name",
  "location": "City · arrangement",
  "employmentType": "Full-time | Part-time | Contract",
  "summary": "Max 2 short sentences",
  "highlights": ["3 bullets max, under 12 words each"],
  "requirements": ["3-5 short must-haves"],
  "responsibilities": ["3 bullets max"],
  "qualifications": ["0-2 nice-to-haves"],
  "benefits": ["2-3 perks"],
  "fullDescription": "Max 4 sentences total — no section headers"
}

Use only facts from HR answers. No salary numbers. Keep every field brief.`;

export function startJobIntake() {
  return {
    step: "title" as JobIntakeStep,
    answers: {} as JobIntakeAnswers,
  };
}

export function jobIntakeQuestion(step: JobIntakeStep) {
  if (step === "ready") {
    return "All set. Tap Generate draft — AI will finish in about 15 seconds.";
  }
  return INTAKE_QUESTIONS[step];
}

export function advanceJobIntake(step: JobIntakeStep, answer: string, answers: JobIntakeAnswers) {
  const trimmed = answer.trim();
  const nextAnswers = { ...answers };

  if (step === "title") nextAnswers.title = trimmed;
  else if (step === "department") nextAnswers.department = trimmed;
  else if (step === "location") nextAnswers.location = trimmed;
  else if (step === "requirements") nextAnswers.requirements = trimmed;
  else if (step === "about") nextAnswers.about = trimmed;

  const idx = STEP_ORDER.indexOf(step);
  const nextStep = STEP_ORDER[Math.min(idx + 1, STEP_ORDER.length - 1)];

  return { answers: nextAnswers, step: nextStep };
}

export function intakeAnswersToNotes(answers: JobIntakeAnswers) {
  return [
    answers.title && `Title: ${answers.title}`,
    answers.department && `Department: ${answers.department}`,
    answers.location && `Location: ${answers.location}`,
    answers.requirements && `Must-haves: ${answers.requirements}`,
    answers.about && `Role focus: ${answers.about}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function intakeRecapText(answers: JobIntakeAnswers) {
  return [
    `Title: ${answers.title ?? "—"}`,
    `Team: ${answers.department ?? "—"}`,
    `Location: ${answers.location ?? "—"}`,
    `Skills: ${answers.requirements ?? "—"}`,
    `Focus: ${answers.about ?? "—"}`,
  ].join("\n");
}

export async function generateJobDescriptionFromNotes(notes: string): Promise<JobDraft> {
  if (!isAiEnabled()) {
    throw new Error("AI is required to generate job descriptions. Add OPENAI_API_KEY.");
  }

  const raw = await chatCompletion(
    [
      { role: "system", content: GENERATOR_SYSTEM },
      { role: "user", content: `HR answers — write a SHORT posting:\n\n${notes}` },
    ],
    { json: true, temperature: 0.35, maxTokens: 520 },
  );

  const parsed = jobDraftSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw new Error("AI returned an invalid job description. Tap Regenerate to try again.");
  }

  return parsed.data;
}

function slugifyTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
}

export async function publishJobDraft(draft: JobDraft, actorId: string) {
  const baseId = slugifyTitle(draft.title) || "role";
  let id = `job_${baseId}`;
  let suffix = 1;

  while (await prisma.jobPosting.findUnique({ where: { id } })) {
    id = `job_${baseId}_${suffix}`;
    suffix += 1;
  }

  const job = await prisma.jobPosting.create({
    data: {
      id,
      title: draft.title,
      department: draft.department,
      requirements: draft.requirements.join(", "),
      summary: draft.summary,
      highlightsJson: JSON.stringify(draft.highlights),
      location: draft.location,
      employmentType: draft.employmentType,
      fullDescription: draft.fullDescription,
      status: "OPEN",
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "JOB_POSTING_CREATED",
      payloadJson: JSON.stringify({ jobId: job.id, actorId, title: job.title }),
    },
  });

  return job;
}

export function jobDraftToCard(draft: JobDraft, notes: string) {
  return {
    type: "job_draft_preview" as const,
    notes,
    draft,
  };
}
