import { prisma } from "@workspace/database";

import { ConversationNotFoundError } from "../domain/conversation.errors.js";

export class GetConversationUseCase {
  static async execute(conversationId: string, userId: string, organizationId: string) {
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId, organizationId },
      include: { triage: true, messages: { orderBy: { createdAt: "asc" }, include: { attachments: true } } },
    });

    if (!conversation) {
      throw new ConversationNotFoundError();
    }

    return conversation;
  }
}
