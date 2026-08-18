import { Elysia } from "elysia";

import { prisma } from "@workspace/database";

export const healthController = new Elysia()
  .get("/health", () => ({ status: "ok" as const, uptime: process.uptime() }))
  .get("/health/db", async ({ status }) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: "ok" as const };
    } catch {
      return status(503, { status: "error" as const });
    }
  });
