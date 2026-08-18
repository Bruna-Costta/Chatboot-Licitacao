import type { ChatInput, ChatOutput } from "./types.js";

export interface AIProvider {
  chat(input: ChatInput): Promise<ChatOutput>;
}
