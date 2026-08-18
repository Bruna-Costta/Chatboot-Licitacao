import { auth } from "@workspace/auth/server";
import type { SignUpRequest, SignUpResponse } from "@workspace/types";

import { EmailAlreadyInUseError } from "../domain/auth.errors.js";

export class SignUpUseCase {
  static async execute(body: SignUpRequest, headers: Headers): Promise<{ response: SignUpResponse; setCookie: string[] }> {
    const authResponse = await auth.api.signUpEmail({
      body,
      headers,
      asResponse: true,
    });

    if (!authResponse.ok) {
      // Generic message regardless of the underlying reason (account-enumeration prevention).
      throw new EmailAlreadyInUseError();
    }

    const data = (await authResponse.json()) as {
      user: { id: string; name: string; email: string; organizationId: string };
    };

    return {
      response: {
        user: {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          organizationId: data.user.organizationId,
        },
        // RF-06: sign-up always redirects to /triage.
        redirectTo: "/triage",
      },
      setCookie: authResponse.headers.getSetCookie(),
    };
  }
}
