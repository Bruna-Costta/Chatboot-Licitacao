import { t } from "elysia";

import { ATTACHMENT_MAX_FILES_PER_MESSAGE, ATTACHMENT_MAX_SIZE_BYTES, MESSAGE_MAX_CONTENT_LENGTH } from "@workspace/types";

// MIME allowlist is deliberately NOT enforced here via t.Files({ type }) — on this Elysia
// version that option collides with TypeBox's own reserved `type` keyword and corrupts
// validation (always rejects). The allowlist + magic-byte check both live in
// SendMessageUseCase instead, which is the authoritative check regardless.
export const SendMessageBody = t.Object({
  content: t.String({ maxLength: MESSAGE_MAX_CONTENT_LENGTH }),
  files: t.Optional(
    t.Files({
      maxSize: ATTACHMENT_MAX_SIZE_BYTES,
      maxItems: ATTACHMENT_MAX_FILES_PER_MESSAGE,
    }),
  ),
});
export type SendMessageBody = typeof SendMessageBody.static;
