import { auth } from "@workspace/auth/server";

export class SignOutUseCase {
  static async execute(headers: Headers): Promise<{ setCookie: string[] }> {
    const authResponse = await auth.api.signOut({
      headers,
      asResponse: true,
    });

    return { setCookie: authResponse.headers.getSetCookie() };
  }
}
