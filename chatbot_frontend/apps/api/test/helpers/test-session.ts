import { prisma } from "@workspace/database";

import { app } from "../../src/app";

export interface TestSession {
  cookie: string;
  userId: string;
  organizationId: string;
  email: string;
}

let counter = 0;

function toCookieHeader(setCookieHeaders: string[]): string {
  return setCookieHeaders.map((entry) => entry.split(";")[0]).join("; ");
}

export async function createTestSession(): Promise<TestSession> {
  counter += 1;
  const email = `triage-test-${Date.now()}-${counter}@example.com`;

  const res = await app.handle(
    new Request("http://localhost/auth/sign-up", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Test User", email, password: "senha12345" }),
    }),
  );

  const setCookies = res.headers.getSetCookie();
  if (setCookies.length === 0) {
    throw new Error(`sign-up did not return a session cookie (status ${res.status})`);
  }

  const data = (await res.json()) as { user: { id: string; organizationId: string } };

  return {
    cookie: toCookieHeader(setCookies),
    userId: data.user.id,
    organizationId: data.user.organizationId,
    email,
  };
}

export async function deleteTestSession(session: TestSession): Promise<void> {
  await prisma.user.delete({ where: { id: session.userId } }).catch(() => undefined);
  await prisma.organization.delete({ where: { id: session.organizationId } }).catch(() => undefined);
}
