import { z } from "zod";

export const createRequestSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().min(1, "Description is required"),
  category: z.enum([
    "FEATURE",
    "BUG",
    "CHANGE_REQUEST",
    "OTHER"
  ]),
  priority: z.enum([
    "LOW",
    "MEDIUM",
    "HIGH",
    "CRITICAL"
  ]).default("MEDIUM"),
  dueDate: z.iso.datetime({ offset: true }).optional()
}).strict();

export type CreateRequestInput = z.infer<typeof createRequestSchema>;

export const listRequestsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum([
    "DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED",
    "REJECTED", "IN_PROGRESS", "COMPLETED"
  ]).optional(),
  priority: z.enum([
    "LOW", "MEDIUM", "HIGH", "CRITICAL"
  ]).optional(),
  category: z.enum([
    "FEATURE", "BUG", "CHANGE_REQUEST", "OTHER"
  ]).optional()
}).strict();

export type ListRequestsInput = z.infer<typeof listRequestsSchema>;

export const requestIdSchema = z.string().uuid();

export const updateRequestSchema = z.object({
  version: z.number().int().min(1),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().min(1).optional(),
  category: z.enum([
    "FEATURE", "BUG", "CHANGE_REQUEST", "OTHER"
  ]).optional(),
  priority: z.enum([
    "LOW", "MEDIUM", "HIGH", "CRITICAL"
  ]).optional(),
  dueDate: z.iso.datetime({ offset: true }).nullable().optional()
}).strict().refine(
  (data) => Object.keys(data).some((key) => key !== "version"),
  { message: "At least one field must be updated" }
);

export type UpdateRequestInput = z.infer<typeof updateRequestSchema>;

export const assignRequestSchema = z.object({
  version: z.number().int().min(1),
  assignedToId: z.string().uuid().nullable()
}).strict();

export type AssignRequestInput = z.infer<typeof assignRequestSchema>;
export const transitionRequestSchema = z.object({
  version: z.number().int().min(1),
  status: z.enum([
    "SUBMITTED",
    "UNDER_REVIEW",
    "APPROVED",
    "REJECTED",
    "IN_PROGRESS",
    "COMPLETED"
  ]),
  rejectionReason: z.string().trim().min(1).max(2000).optional()
}).strict().superRefine((data, ctx) => {
  if (data.status === "REJECTED" && !data.rejectionReason) {
    ctx.addIssue({
      code: "custom",
      path: ["rejectionReason"],
      message: "A rejection reason is required"
    });
  }

  if (data.status !== "REJECTED" && data.rejectionReason !== undefined) {
    ctx.addIssue({
      code: "custom",
      path: ["rejectionReason"],
      message: "A rejection reason is only allowed when rejecting a request"
    });
  }
});

export type TransitionRequestInput = z.infer<typeof transitionRequestSchema>;