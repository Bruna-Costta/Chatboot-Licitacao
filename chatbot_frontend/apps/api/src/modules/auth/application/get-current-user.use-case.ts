import { getCurrentUser } from "@workspace/auth/server";
import type { MeResponse } from "@workspace/types";

export class GetCurrentUserUseCase {
  static async execute(headers: Headers): Promise<MeResponse | null> {
    return getCurrentUser(headers);
  }
}
