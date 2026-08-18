import type { SemanticDimension } from "./database.js";

export const TRIAGE_SUBJECT_OPTIONS = [
  "Licitações e contratações",
  "Contratos administrativos",
  "Fiscalização de contratos",
  "eSfinge / TCE-MS",
] as const;
export type TriageSubject = (typeof TRIAGE_SUBJECT_OPTIONS)[number];

export const TRIAGE_PROCESS_STAGE_OPTIONS = [
  "Planejamento da contratação",
  "Publicação e disputa (edital/sessão)",
  "Habilitação e julgamento",
  "Execução e fiscalização do contrato",
] as const;
export type TriageProcessStage = (typeof TRIAGE_PROCESS_STAGE_OPTIONS)[number];

export const TRIAGE_CONTRACT_TYPE_OPTIONS = [
  "Pregão",
  "Concorrência",
  "Dispensa de licitação",
  "Inexigibilidade",
  "Outra modalidade",
] as const;
export type TriageContractType = (typeof TRIAGE_CONTRACT_TYPE_OPTIONS)[number];

export const TRIAGE_DOUBT_TYPE_OPTIONS = [
  "Legislação",
  "Procedimento",
  "eSfinge",
  "Documentos",
  "Não sei",
] as const;
export type TriageDoubtType = (typeof TRIAGE_DOUBT_TYPE_OPTIONS)[number];

export const DOUBT_TYPE_TO_SEMANTIC_DIMENSION: Record<TriageDoubtType, SemanticDimension> = {
  "Legislação": "NORMATIVE",
  "Procedimento": "OPERATIONAL",
  "eSfinge": "OPERATIONAL",
  "Documentos": "DOCUMENTAL",
  "Não sei": "UNCERTAIN",
};
