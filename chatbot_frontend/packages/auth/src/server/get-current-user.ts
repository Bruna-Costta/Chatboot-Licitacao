import type { CurrentUser } from "@workspace/types";

import { auth } from "./auth.js";

export async function getCurrentUser(headers: Headers): Promise<CurrentUser | null> {
  const session = await auth.api.getSession({ headers });

  if (!session) {
    return null;
  }

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    organizationId: (session.user as { organizationId: string }).organizationId,
  };
}
