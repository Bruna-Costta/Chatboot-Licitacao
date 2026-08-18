import { prisma } from "@workspace/database";

export class GetActiveTriageUseCase {
  static async execute(userId: string, organizationId: string) {
    return prisma.triage.findFirst({
      where: { userId, organizationId, status: "IN_PROGRESS" },
      orderBy: { createdAt: "desc" },
    });
  }
}
