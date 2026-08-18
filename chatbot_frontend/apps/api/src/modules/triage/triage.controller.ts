import { Elysia, t } from "elysia";

import { authPlugin } from "@workspace/auth/server";

import { CompleteTriageUseCase } from "./application/complete-triage.use-case.js";
import { GetActiveTriageUseCase } from "./application/get-active-triage.use-case.js";
import { GetTriageStatusUseCase } from "./application/get-triage-status.use-case.js";
import { StartTriageUseCase } from "./application/start-triage.use-case.js";
import { UpdateTriageStepUseCase } from "./application/update-triage-step.use-case.js";
import { TriageAlreadyCompletedError, TriageIncompleteError, TriageNotFoundError } from "./domain/triage.errors.js";
import { UpdateTriageBody } from "./triage.model.js";

export const triageController = new Elysia()
  .use(authPlugin)
  .group("/triage", (app) =>
    app
      .get("/", async ({ user }) => GetActiveTriageUseCase.execute(user.id, user.organizationId), { auth: true })
      .get("/status", async ({ user }) => GetTriageStatusUseCase.execute(user.id, user.organizationId), {
        auth: true,
      })
      .post("/", async ({ user }) => StartTriageUseCase.execute(user.id, user.organizationId), { auth: true })
      .patch(
        "/:id",
        async ({ params, body, user, status }) => {
          try {
            return await UpdateTriageStepUseCase.execute(params.id, user.id, user.organizationId, body);
          } catch (error) {
            if (error instanceof TriageNotFoundError) return status(404);
            throw error;
          }
        },
        { auth: true, body: UpdateTriageBody, params: t.Object({ id: t.String() }) },
      )
      .post(
        "/:id/complete",
        async ({ params, user, status }) => {
          try {
            return await CompleteTriageUseCase.execute(params.id, user.id, user.organizationId);
          } catch (error) {
            if (error instanceof TriageNotFoundError) return status(404);
            if (error instanceof TriageIncompleteError) return status(422, { message: error.message });
            if (error instanceof TriageAlreadyCompletedError) return status(409, { message: error.message });
            throw error;
          }
        },
        { auth: true, params: t.Object({ id: t.String() }) },
      ),
  );
