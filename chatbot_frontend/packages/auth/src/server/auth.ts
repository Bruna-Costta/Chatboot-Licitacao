import { prismaAdapter } from "better-auth/adapters/prisma";
import { betterAuth } from "better-auth";

import { prisma } from "@workspace/database";

import { randomSlugSuffix, slugify } from "./lib/slug.js";

export const auth = betterAuth({
  basePath: "/api/auth",
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(","),
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  // Let Prisma's @default(cuid()) generate ids instead of Better Auth's own generator.
  advanced: { database: { generateId: false } },
  emailAndPassword: { enabled: true },
  user: {
    additionalFields: {
      // input: false enforces the multi-tenant Golden Rule at the auth layer itself:
      // organizationId can only ever be set server-side, never from a client request body.
      // required: false because Better Auth validates "required" additionalFields against the
      // raw request body before the user.create.before hook (which always populates it) runs;
      // the Prisma schema's non-nullable column is the real guarantee once the hook has run.
      organizationId: { type: "string", required: false, input: false },
    },
  },
  rateLimit: {
    enabled: true,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 3 },
    },
  },
  databaseHooks: {
    user: {
      create: {
        // Every user must belong to exactly one auto-created Organization (RF-04).
        // Known limitation: this insert and Better Auth's own subsequent User insert are not
        // in a single transaction, so a failed user insert (e.g. duplicate email) can leave an
        // orphan Organization row. Acceptable for MVP; revisit if Better Auth exposes a
        // transactional hook context.
        before: async (user) => {
          const baseSlug = slugify(user.name || user.email.split("@")[0] || "organizacao");
          const organization = await prisma.organization.create({
            data: {
              name: `${user.name} — Organização`,
              slug: `${baseSlug}-${randomSlugSuffix()}`,
            },
          });

          return {
            data: {
              ...user,
              organizationId: organization.id,
            },
          };
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
