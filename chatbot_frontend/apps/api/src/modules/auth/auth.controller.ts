import { Elysia } from "elysia";

import { auth } from "@workspace/auth/server";

import { GetCurrentUserUseCase } from "./application/get-current-user.use-case.js";
import { SignInUseCase } from "./application/sign-in.use-case.js";
import { SignOutUseCase } from "./application/sign-out.use-case.js";
import { SignUpUseCase } from "./application/sign-up.use-case.js";
import { SignInBody, SignUpBody } from "./auth.model.js";
import { EmailAlreadyInUseError, InvalidCredentialsError } from "./domain/auth.errors.js";

function jsonWithCookies(body: unknown, setCookie: string[], status = 200): Response {
  const response = new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

  for (const cookie of setCookie) {
    response.headers.append("set-cookie", cookie);
  }

  return response;
}

export const authController = new Elysia()
  // Raw Better Auth surface (CSRF, rate limiting, cookies out of the box).
  .mount(auth.handler)
  // Curated product surface matching PRD §12, holding the Application-layer use cases.
  .group("/auth", (app) =>
    app
      .post(
        "/sign-up",
        async ({ body, request, status }) => {
          try {
            const { response, setCookie } = await SignUpUseCase.execute(body, request.headers);
            return jsonWithCookies(response, setCookie);
          } catch (error) {
            if (error instanceof EmailAlreadyInUseError) {
              return status(422, { message: error.message });
            }
            throw error;
          }
        },
        { body: SignUpBody },
      )
      .post(
        "/sign-in",
        async ({ body, request, status }) => {
          try {
            const { response, setCookie } = await SignInUseCase.execute(body, request.headers);
            return jsonWithCookies(response, setCookie);
          } catch (error) {
            if (error instanceof InvalidCredentialsError) {
              return status(401, { message: error.message });
            }
            throw error;
          }
        },
        { body: SignInBody },
      )
      .post("/sign-out", async ({ request }) => {
        const { setCookie } = await SignOutUseCase.execute(request.headers);
        return jsonWithCookies({ success: true }, setCookie);
      })
      .get("/me", async ({ request, status }) => {
        const user = await GetCurrentUserUseCase.execute(request.headers);

        if (!user) {
          return status(401);
        }

        return user;
      }),
  );
