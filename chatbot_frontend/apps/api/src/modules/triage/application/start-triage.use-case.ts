import { prisma } from "@workspace/database";

export class StartTriageUseCase {
  static async execute(userId: string, organizationId: string) {
    const existing = await prisma.triage.findFirst({
      where: { userId, organizationId, status: "IN_PROGRESS" },
    });

    if (existing) {
      return existing;
    }

    return prisma.triage.create({
      data: {
        userId,
        organizationId,
        subject: "",
        processStage: "",
        contractType: "",
        doubtType: "",
        description: "",
      },
    });
  }
}
