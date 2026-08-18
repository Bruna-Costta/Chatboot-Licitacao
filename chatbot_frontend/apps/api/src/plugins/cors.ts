import { cors } from "@elysiajs/cors";

import { env } from "../env";

export const corsPlugin = cors({
  origin: env.CORS_ORIGINS.split(","),
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});
