import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(5173),
  DATABASE_URL: z.string().min(1),
  CORS_ORIGINS: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.string().min(1),
  BETTER_AUTH_TRUSTED_ORIGINS: z.string().min(1),
  UPLOAD_DIR: z.string().min(1).default("./uploads"),
});

export const env = envSchema.parse(process.env);
