import { z } from "zod";
import { jobDraftSchema } from "@/lib/recruitment/job-draft";

export const actorEmployeeIdSchema = z.string().min(1);

export const leaveDraftSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(["ANNUAL", "SICK", "UNPAID"]),
  reason: z.string().min(1).max(220),
});

const jobIntakeAnswersSchema = z.object({
  title: z.string().optional(),
  department: z.string().optional(),
  location: z.string().optional(),
  requirements: z.string().optional(),
  about: z.string().optional(),
});

export const chatContextSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("pending_leave_request"),
    draft: leaveDraftSchema,
  }),
  z.object({
    kind: z.literal("payroll_uploaded"),
    runId: z.number().int().positive(),
  }),
  z.object({
    kind: z.literal("pending_payroll_hr_submit"),
    runId: z.number().int().positive(),
  }),
  z.object({
    kind: z.literal("pending_payroll_boss_approve"),
    runId: z.number().int().positive(),
  }),
  z.object({
    kind: z.literal("pending_cv_apply"),
    jobId: z.string().min(1),
    jobTitle: z.string().min(1),
  }),
  z.object({
    kind: z.literal("cv_uploaded"),
    applicationId: z.number().int().positive(),
  }),
  z.object({
    kind: z.literal("pending_recruitment_boss"),
  }),
  z.object({
    kind: z.literal("pending_job_intake"),
    step: z.enum(["title", "department", "location", "requirements", "about", "ready"]),
    answers: jobIntakeAnswersSchema,
  }),
  z.object({
    kind: z.literal("pending_job_publish"),
    notes: z.string(),
    answers: jobIntakeAnswersSchema,
    draft: jobDraftSchema,
  }),
]);

export const chatRequestSchema = z.object({
  actorEmployeeId: actorEmployeeIdSchema,
  message: z.string().max(2000),
  context: chatContextSchema.optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
