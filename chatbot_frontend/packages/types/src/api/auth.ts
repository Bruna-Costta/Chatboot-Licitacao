import type { CurrentUser } from "../auth.js";

export interface SignUpRequest {
  name: string;
  email: string;
  password: string;
}

export interface SignInRequest {
  email: string;
  password: string;
}

export type AuthRedirectTarget = "/triage" | "/chat";

export interface SignUpResponse {
  user: CurrentUser;
  redirectTo: AuthRedirectTarget;
}

export interface SignInResponse {
  user: CurrentUser;
  redirectTo: AuthRedirectTarget;
}

export type MeResponse = CurrentUser;
