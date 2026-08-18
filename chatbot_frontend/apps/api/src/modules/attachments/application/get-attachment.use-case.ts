import { prisma } from "@workspace/database";

import { AttachmentNotFoundError } from "../domain/attachment.errors.js";

export class GetAttachmentUseCase {
  static async execute(attachmentId: string, userId: string, organizationId: string) {
    const attachment = await prisma.attachment.findFirst({
      where: { id: attachmentId, organizationId, message: { conversation: { userId, organizationId } } },
    });

    if (!attachment) {
      throw new AttachmentNotFoundError();
    }

    return attachment;
  }
}
