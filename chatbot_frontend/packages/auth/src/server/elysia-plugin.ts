import { Elysia } from "elysia";

import { getCurrentUser } from "./get-current-user.js";

/**
 * Single derivation point for the authenticated user across every Conversation/Message/Triage
 * route (Sprint 3+): organizationId is always read from here, never from request input.
 */
export const authPlugin = new Elysia({ name: "auth-plugin" }).macro({
  auth: {
    async resolve({ status, request: { headers } }) {
      const user = await getCurrentUser(headers);

      if (!user) {
        return status(401);
      }

      return { user };
    },
  },
});
