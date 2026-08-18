import { Elysia } from "elysia";

import { attachmentsController } from "./modules/attachments/attachments.controller";
import { authController } from "./modules/auth/auth.controller";
import { conversationsController } from "./modules/conversations/conversations.controller";
import { healthController } from "./modules/health/health.controller";
import { triageController } from "./modules/triage/triage.controller";
import { corsPlugin } from "./plugins/cors";

export const app = new Elysia()
  .use(corsPlugin)
  .use(healthController)
  .use(authController)
  .use(triageController)
  .use(conversationsController)
  .use(attachmentsController);

export type App = typeof app;
