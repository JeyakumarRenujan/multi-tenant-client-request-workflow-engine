import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const durationSchema = z.string().regex(
  /^[1-9]\d*[smhd]$/,
  "Must be a positive duration such as 15m, 1h, or 7d"
);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TOKEN_EXPIRES_IN: durationSchema.default("15m"),
  REFRESH_TOKEN_EXPIRES_IN: durationSchema.default("7d"),
  FRONTEND_URL: z.string().url()
}).superRefine((config, ctx) => {
  if (config.JWT_ACCESS_SECRET === config.JWT_REFRESH_SECRET) {
    ctx.addIssue({
      code: "custom",
      path: ["JWT_REFRESH_SECRET"],
      message: "Access and refresh secrets must be different"
    });
  }
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error(
    "Invalid environment configuration:",
    result.error.flatten().fieldErrors
  );
  process.exit(1);
}

export const env = result.data;
