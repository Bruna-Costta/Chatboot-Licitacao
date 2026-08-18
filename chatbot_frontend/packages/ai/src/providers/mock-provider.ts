import type { AIProvider } from "../ai-provider.js";
import type { ChatInput, ChatOutput } from "../types.js";

export class MockProvider implements AIProvider {
  async chat(input: ChatInput): Promise<ChatOutput> {
    const start = Date.now();

    return {
      content: `[MockProvider] Recebi sua pergunta: "${input.question}". Esta é uma resposta simulada — nenhum provedor de IA real está configurado ainda.`,
      metadata: {
        model: "mock-provider",
        latencyMs: Date.now() - start,
      },
    };
  }
}
