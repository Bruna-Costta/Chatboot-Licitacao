import { Elysia, t } from "elysia";

import { authPlugin } from "@workspace/auth/server";

import { GetConversationUseCase } from "./application/get-conversation.use-case.js";
import { SendMessageUseCase } from "./application/send-message.use-case.js";
import {
  AIProviderError,
  ConversationNotActiveError,
  ConversationNotFoundError,
  EmptyMessageError,
  InvalidFileContentError,
} from "./domain/conversation.errors.js";
import { SendMessageBody } from "./messages.model.js";

export const conversationsController = new Elysia()
  .use(authPlugin)
  .group("/conversations", (app) =>
    app
      .get(
        "/:id",
        async ({ params, user, status }) => {
          try {
            return await GetConversationUseCase.execute(params.id, user.id, user.organizationId);
          } catch (error) {
            if (error instanceof ConversationNotFoundError) return status(404);
            throw error;
          }
        },
        { auth: true, params: t.Object({ id: t.String() }) },
      )
      .post(
        "/:id/messages",
        async ({ params, body, user, status }) => {
          try {
            const result = await SendMessageUseCase.execute(
              params.id,
              user.id,
              user.organizationId,
              body.content,
              body.files ?? [],
            );
            return status(201, result);
          } catch (error) {
            if (error instanceof ConversationNotFoundError) return status(404);
            if (error instanceof ConversationNotActiveError) return status(409, { message: error.message });
            if (error instanceof EmptyMessageError) return status(422, { message: error.message });
            if (error instanceof InvalidFileContentError) return status(422, { message: error.message });
            if (error instanceof AIProviderError) {
              return status(502, { message: error.message, userMessage: error.userMessage });
            }
            throw error;
          }
        },
        { auth: true, params: t.Object({ id: t.String() }), body: SendMessageBody },
      ),
  );
