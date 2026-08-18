export class EmailAlreadyInUseError extends Error {
  constructor() {
    super("Não foi possível concluir o cadastro.");
    this.name = "EmailAlreadyInUseError";
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("E-mail ou senha inválidos.");
    this.name = "InvalidCredentialsError";
  }
}
