import { Elysia, t } from "elysia";

import { authPlugin } from "@workspace/auth/server";

import { storageService } from "../../infrastructure/storage/local-disk-storage.service.js";
import { GetAttachmentUseCase } from "./application/get-attachment.use-case.js";
import { AttachmentNotFoundError } from "./domain/attachment.errors.js";

export const attachmentsController = new Elysia()
  .use(authPlugin)
  .get(
    "/attachments/:id",
    async ({ params, user, status }) => {
      try {
        const attachment = await GetAttachmentUseCase.execute(params.id, user.id, user.organizationId);
        const path = storageService.resolvePath(user.organizationId, attachment.storedName);

        return new Response(Bun.file(path), {
          headers: {
            "content-type": attachment.mimeType,
            "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(attachment.fileName)}`,
          },
        });
      } catch (error) {
        if (error instanceof AttachmentNotFoundError) return status(404);
        throw error;
      }
    },
    { auth: true, params: t.Object({ id: t.String() }) },
  );
