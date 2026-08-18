import { prisma } from "@workspace/database";
import { DOUBT_TYPE_TO_SEMANTIC_DIMENSION, type TriageDoubtType } from "@workspace/types";

import { TriageAlreadyCompletedError, TriageIncompleteError, TriageNotFoundError } from "../domain/triage.errors.js";

const REQUIRED_FIELDS = ["subject", "processStage", "contractType", "doubtType", "description"] as const;

export class CompleteTriageUseCase {
  static async execute(triageId: string, userId: string, organizationId: string) {
    const triage = await prisma.triage.findFirst({
      where: { id: triageId, userId, organizationId },
    });

    if (!triage) {
      throw new TriageNotFoundError();
    }

    if (triage.status === "COMPLETED") {
      throw new TriageAlreadyCompletedError();
    }

    for (const field of REQUIRED_FIELDS) {
      if (!triage[field]) {
        throw new TriageIncompleteError(field);
      }
    }

    if (triage.description.length < 10 || triage.description.length > 2000) {
      throw new TriageIncompleteError("description");
    }

    const semanticDimension = DOUBT_TYPE_TO_SEMANTIC_DIMENSION[triage.doubtType as TriageDoubtType];

    if (!semanticDimension) {
      throw new TriageIncompleteError("doubtType");
    }

    const result = await prisma.$transaction(async (tx) => {
      const { count } = await tx.triage.updateMany({
        where: { id: triageId, status: "IN_PROGRESS" },
        data: { status: "COMPLETED", completedAt: new Date(), semanticDimension },
      });

      if (count === 0) {
        throw new TriageAlreadyCompletedError();
      }

      const updatedTriage = await tx.triage.findUniqueOrThrow({ where: { id: triageId } });
      const conversation = await tx.conversation.create({
        data: { organizationId, userId, triageId, status: "ACTIVE" },
      });

      return { triage: updatedTriage, conversation };
    });

    return result;
  }
}
