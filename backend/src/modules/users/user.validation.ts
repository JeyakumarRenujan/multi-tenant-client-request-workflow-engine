import { z } from "zod";

const managedRoleSchema = z.enum([
  "MANAGER",
  "DEVELOPER",
  "CLIENT_USER"
]);

export const createUserSchema = z.object({
  name: z.string().trim().min(1).max(150),
  email: z.string().trim().email().max(255),
  password: z.string().min(12).max(128),
  role: managedRoleSchema,
  clientId: z.string().uuid().optional().nullable()
}).strict().superRefine((data, ctx) => {
  if (data.role === "CLIENT_USER" && !data.clientId) {
    ctx.addIssue({
      code: "custom",
      path: ["clientId"],
      message: "A client must be assigned to a Client User"
    });
  }

  if (data.role !== "CLIENT_USER" && data.clientId) {
    ctx.addIssue({
      code: "custom",
      path: ["clientId"],
      message: "Only Client Users can be assigned to a client"
    });
  }
});

export const listUsersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  role: managedRoleSchema.optional(),
  isActive: z.enum(["true", "false"]).transform(value => value === "true").optional()
}).strict();

export const updateUserSchema = z.object({
  name: z.string().trim().min(1).max(150).optional(),
  email: z.string().trim().email().max(255).optional(),
  role: managedRoleSchema.optional(),
  clientId: z.string().uuid().nullable().optional()
}).strict().refine(
  data => Object.keys(data).length > 0,
  { message: "At least one field must be updated" }
);

export const userIdSchema = z.string().uuid();

export const updateUserStatusSchema = z.object({
  isActive: z.boolean()
}).strict();

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type ListUsersInput = z.infer<typeof listUsersSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
