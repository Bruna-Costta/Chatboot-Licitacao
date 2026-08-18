import { prisma } from "@workspace/database";

import { TriageNotFoundError } from "../domain/triage.errors.js";
import type { UpdateTriageBody } from "../triage.model.js";

export class UpdateTriageStepUseCase {
  static async execute(triageId: string, userId: string, organizationId: string, data: UpdateTriageBody) {
    const triage = await prisma.triage.findFirst({
      where: { id: triageId, userId, organizationId, status: "IN_PROGRESS" },
    });

    if (!triage) {
      throw new TriageNotFoundError();
    }

    const { subject, processStage, contractType, doubtType, description } = data;

    return prisma.triage.update({
      where: { id: triageId },
      data: { subject, processStage, contractType, doubtType, description },
    });
  }
}
