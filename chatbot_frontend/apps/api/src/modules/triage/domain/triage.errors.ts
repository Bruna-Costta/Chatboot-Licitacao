export class TriageNotFoundError extends Error {
  constructor() {
    super("Triagem não encontrada.");
    this.name = "TriageNotFoundError";
  }
}

export class TriageIncompleteError extends Error {
  constructor(missingField: string) {
    super(`Campo obrigatório não preenchido: ${missingField}.`);
    this.name = "TriageIncompleteError";
  }
}

export class TriageAlreadyCompletedError extends Error {
  constructor() {
    super("Esta triagem já foi concluída.");
    this.name = "TriageAlreadyCompletedError";
  }
}
