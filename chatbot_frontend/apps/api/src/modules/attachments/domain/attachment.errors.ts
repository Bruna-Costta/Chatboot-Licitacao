export class AttachmentNotFoundError extends Error {
  constructor() {
    super("Anexo não encontrado.");
    this.name = "AttachmentNotFoundError";
  }
}
