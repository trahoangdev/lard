import { z } from "zod";

export const actorEmployeeIdSchema = z.string().min(1);

export const leaveDraftSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(["ANNUAL", "SICK", "UNPAID"]),
  reason: z.string().min(1).max(220),
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
    kind: z.literal("pending_payroll_confirm"),
    runId: z.number().int().positive(),
  }),
]);

export const chatRequestSchema = z.object({
  actorEmployeeId: actorEmployeeIdSchema,
  message: z.string().max(2000),
  context: chatContextSchema.optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

