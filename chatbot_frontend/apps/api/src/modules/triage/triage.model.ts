import { t } from "elysia";

import {
  TRIAGE_CONTRACT_TYPE_OPTIONS,
  TRIAGE_DOUBT_TYPE_OPTIONS,
  TRIAGE_PROCESS_STAGE_OPTIONS,
  TRIAGE_SUBJECT_OPTIONS,
} from "@workspace/types";

const literalUnion = (values: readonly string[]) => t.Union(values.map((value) => t.Literal(value)));

export const UpdateTriageBody = t.Partial(
  t.Object({
    subject: literalUnion(TRIAGE_SUBJECT_OPTIONS),
    processStage: literalUnion(TRIAGE_PROCESS_STAGE_OPTIONS),
    contractType: literalUnion(TRIAGE_CONTRACT_TYPE_OPTIONS),
    doubtType: literalUnion(TRIAGE_DOUBT_TYPE_OPTIONS),
    description: t.String({ minLength: 10, maxLength: 2000 }),
  }),
);
export type UpdateTriageBody = typeof UpdateTriageBody.static;
