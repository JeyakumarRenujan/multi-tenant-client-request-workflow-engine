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