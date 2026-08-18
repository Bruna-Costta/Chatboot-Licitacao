import { auth } from "@workspace/auth/server";
import { prisma } from "@workspace/database";
import type { SignInRequest, SignInResponse } from "@workspace/types";

import { InvalidCredentialsError } from "../domain/auth.errors.js";

export class SignInUseCase {
  static async execute(body: SignInRequest, headers: Headers): Promise<{ response: SignInResponse; setCookie: string[] }> {
    const authResponse = await auth.api.signInEmail({
      body,
      headers,
      asResponse: true,
    });

    if (!authResponse.ok) {
      throw new InvalidCredentialsError();
    }

    const data = (await authResponse.json()) as {
      user: { id: string; name: string; email: string; organizationId: string };
    };

    // RF-08: redirect to /chat only once the user has a completed Triage; organizationId is
    // sourced from the just-authenticated session user, never from client input.
    const completedTriage = await prisma.triage.findFirst({
      where: {
        userId: data.user.id,
        organizationId: data.user.organizationId,
        status: "COMPLETED",
      },
      select: { id: true },
    });

    return {
      response: {
        user: {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          organizationId: data.user.organizationId,
        },
        redirectTo: completedTriage ? "/chat" : "/triage",
      },
      setCookie: authResponse.headers.getSetCookie(),
    };
  }
}
