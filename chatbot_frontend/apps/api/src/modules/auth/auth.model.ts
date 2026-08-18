import { t } from "elysia";

// Never add an organizationId field here — the Golden Rule requires organizationId to always
// derive from the session, never from client input (see CLAUDE.md).
export const SignUpBody = t.Object({
  name: t.String({ minLength: 1 }),
  email: t.String({ format: "email" }),
  password: t.String({ minLength: 8 }),
});
export type SignUpBody = typeof SignUpBody.static;

export const SignInBody = t.Object({
  email: t.String({ format: "email" }),
  password: t.String({ minLength: 1 }),
});
export type SignInBody = typeof SignInBody.static;
