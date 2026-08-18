export class ConversationNotFoundError extends Error {
  constructor() {
    super("Conversa não encontrada.");
    this.name = "ConversationNotFoundError";
  }
}

export class ConversationNotActiveError extends Error {
  constructor() {
    super("Esta conversa não está ativa.");
    this.name = "ConversationNotActiveError";
  }
}

export class EmptyMessageError extends Error {
  constructor() {
    super("A mensagem precisa ter texto ou ao menos um arquivo anexado.");
    this.name = "EmptyMessageError";
  }
}

export class InvalidFileContentError extends Error {
  constructor(fileName: string) {
    super(`O arquivo "${fileName}" não corresponde ao tipo declarado.`);
    this.name = "InvalidFileContentError";
  }
}

export class AIProviderError extends Error {
  constructor(public readonly userMessage: unknown) {
    super("Não foi possível obter uma resposta do assistente de IA.");
    this.name = "AIProviderError";
  }
}
