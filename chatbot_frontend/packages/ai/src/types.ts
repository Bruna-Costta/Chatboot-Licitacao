import type { SemanticDimension } from "@workspace/database";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface TriageContext {
  subject: string;
  processStage: string;
  contractType: string;
  doubtType: string;
  semanticDimension: SemanticDimension;
  description: string;
}

/**
 * Field order mirrors CLAUDE.md's mandated context-assembly order:
 * system prompt -> triage context -> conversation history -> new question.
 */
export interface ChatInput {
  systemPrompt: string;
  triageContext: TriageContext | null;
  history: ChatMessage[];
  question: string;
}

export interface ChatOutputMetadata {
  model?: string;
  tokens?: number;
  latencyMs?: number;
}

export interface ChatOutput {
  content: string;
  metadata?: ChatOutputMetadata;
}
