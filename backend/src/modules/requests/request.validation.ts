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
    "DRAFT",
    "SUBMITTED",
    "UNDER_REVIEW",
    "APPROVED",
    "REJECTED",
    "IN_PROGRESS",
    "COMPLETED"
  ]).optional(),
  priority: z.enum([
    "LOW",
    "MEDIUM",
    "HIGH",
    "CRITICAL"
  ]).optional(),
  category: z.enum([
    "FEATURE",
    "BUG",
    "CHANGE_REQUEST",
    "OTHER"
  ]).optional()
}).strict();

export type ListRequestsInput = z.infer<typeof listRequestsSchema>;

export const requestIdSchema = z.string().uuid();