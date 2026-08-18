import type { Triage } from "../database.js";

export type TriageResponse = Triage;

export interface TriageStatusResponse {
  completed: boolean;
  conversationId: string | null;
}
