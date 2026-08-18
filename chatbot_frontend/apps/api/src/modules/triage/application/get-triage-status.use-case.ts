import { prisma } from "@workspace/database";

export class GetTriageStatusUseCase {
  static async execute(userId: string, organizationId: string) {
    const conversation = await prisma.conversation.findFirst({
      where: { organizationId, userId, triage: { status: "COMPLETED" } },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    return { completed: !!conversation, conversationId: conversation?.id ?? null };
  }
}
