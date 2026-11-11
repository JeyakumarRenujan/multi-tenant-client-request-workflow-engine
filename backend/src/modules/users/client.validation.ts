import { z } from "zod";

export const listClientsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(100)
}).strict();

export type ListClientsInput = z.infer<typeof listClientsSchema>;
