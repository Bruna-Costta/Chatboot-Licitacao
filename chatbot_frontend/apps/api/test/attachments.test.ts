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

async function sendMessageWithAttachment(cookie: string, conversationId: string): Promise<string> {
  const formData = new FormData();
  formData.set("content", "Segue o edital em anexo.");
  const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0, 0, 0, 0]);
  formData.append("files", new Blob([pdfBytes], { type: "application/pdf" }), "edital.pdf");

  const res = await app.handle(
    new Request(`http://localhost/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { cookie },
      body: formData,
    }),
  );
  const data = (await res.json()) as { userMessage: { attachments: Array<{ id: string }> } };
  return data.userMessage.attachments[0].id;
}

describe("GET /attachments/:id", () => {
  it("streams the file back to the owner", async () => {
    session = await createTestSession();
    const conversationId = await completeTriage(session.cookie);
    const attachmentId = await sendMessageWithAttachment(session.cookie, conversationId);

    const res = await app.handle(
      new Request(`http://localhost/attachments/${attachmentId}`, { headers: { cookie: session.cookie } }),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(bytes.slice(0, 4)).toEqual(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
  });

  it("returns 404 when the attachment belongs to another organization", async () => {
    session = await createTestSession();
    const conversationId = await completeTriage(session.cookie);
    const attachmentId = await sendMessageWithAttachment(session.cookie, conversationId);
    otherSession = await createTestSession();

    const res = await app.handle(
      new Request(`http://localhost/attachments/${attachmentId}`, { headers: { cookie: otherSession.cookie } }),
    );

    expect(res.status).toBe(404);
  });

  it("returns 404 for a nonexistent attachment id", async () => {
    session = await createTestSession();

    const res = await app.handle(
      new Request("http://localhost/attachments/does-not-exist", { headers: { cookie: session.cookie } }),
    );

    expect(res.status).toBe(404);
  });
});
