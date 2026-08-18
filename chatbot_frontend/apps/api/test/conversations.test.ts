import { afterEach, describe, expect, it } from "bun:test";

import { app } from "../src/app";
import { createTestSession, deleteTestSession, type TestSession } from "./helpers/test-session";

let session: TestSession;
let otherSession: TestSession | undefined;

afterEach(async () => {
  if (session) await deleteTestSession(session);
  if (otherSession) {
    await deleteTestSession(otherSession);
    otherSession = undefined;
  }
});

async function completeTriage(cookie: string): Promise<string> {
  const startRes = await app.handle(new Request("http://localhost/triage", { method: "POST", headers: { cookie } }));
  const { id } = (await startRes.json()) as { id: string };

  await app.handle(
    new Request(`http://localhost/triage/${id}`, {
      method: "PATCH",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({
        subject: "Licitações e contratações",
        processStage: "Planejamento da contratação",
        contractType: "Pregão",
        doubtType: "Legislação",
        description: "Preciso entender melhor o prazo de recurso na fase de habilitação.",
      }),
    }),
  );

  const completeRes = await app.handle(
    new Request(`http://localhost/triage/${id}/complete`, { method: "POST", headers: { cookie } }),
  );
  const { conversation } = (await completeRes.json()) as { conversation: { id: string } };
  return conversation.id;
}

describe("GET /conversations/:id", () => {
  it("returns the conversation with its triage context for the owner", async () => {
    session = await createTestSession();
    const conversationId = await completeTriage(session.cookie);

    const res = await app.handle(
      new Request(`http://localhost/conversations/${conversationId}`, { headers: { cookie: session.cookie } }),
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as { id: string; triage: { subject: string }; messages: unknown[] };
    expect(data.id).toBe(conversationId);
    expect(data.triage.subject).toBe("Licitações e contratações");
    expect(data.messages).toEqual([]);
  });

  it("returns 404 when the conversation belongs to another organization", async () => {
    session = await createTestSession();
    const conversationId = await completeTriage(session.cookie);
    otherSession = await createTestSession();

    const res = await app.handle(
      new Request(`http://localhost/conversations/${conversationId}`, { headers: { cookie: otherSession.cookie } }),
    );

    expect(res.status).toBe(404);
  });

  it("returns 404 for a nonexistent conversation id", async () => {
    session = await createTestSession();

    const res = await app.handle(
      new Request("http://localhost/conversations/does-not-exist", { headers: { cookie: session.cookie } }),
    );

    expect(res.status).toBe(404);
  });
});
