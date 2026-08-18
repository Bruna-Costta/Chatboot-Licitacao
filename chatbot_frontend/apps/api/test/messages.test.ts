import { afterEach, describe, expect, it, setDefaultTimeout } from "bun:test";

import type { AIProvider, ChatOutput } from "@workspace/ai";

import { app } from "../src/app";
import { SendMessageUseCase } from "../src/modules/conversations/application/send-message.use-case";
import { AIProviderError } from "../src/modules/conversations/domain/conversation.errors";
import { createTestSession, deleteTestSession, type TestSession } from "./helpers/test-session";

// The test DB is remote (network round trip per Prisma call) — each test here does several
// sequential calls (sign-up + triage start/patch/complete + send-message), so the 5s default
// bun:test timeout is occasionally too tight.
setDefaultTimeout(20_000);

class FailingProvider implements AIProvider {
  async chat(): Promise<ChatOutput> {
    throw new Error("provider unavailable");
  }
}

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

function pdfBytes(size = 16): Uint8Array {
  const bytes = new Uint8Array(size);
  bytes.set([0x25, 0x50, 0x44, 0x46], 0); // %PDF
  return bytes;
}

function pngBytes(): Uint8Array {
  return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
}

async function sendMessage(cookie: string, conversationId: string, formData: FormData) {
  return app.handle(
    new Request(`http://localhost/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { cookie },
      body: formData,
    }),
  );
}

describe("POST /conversations/:id/messages", () => {
  it("sends a text-only message and returns the mock AI reply", async () => {
    session = await createTestSession();
    const conversationId = await completeTriage(session.cookie);

    const formData = new FormData();
    formData.set("content", "Qual o prazo de recurso na fase de habilitação?");

    const res = await sendMessage(session.cookie, conversationId, formData);

    expect(res.status).toBe(201);
    const data = (await res.json()) as {
      userMessage: { role: string; content: string; attachments: unknown[] };
      assistantMessage: { role: string; content: string };
    };
    expect(data.userMessage.role).toBe("USER");
    expect(data.userMessage.content).toBe("Qual o prazo de recurso na fase de habilitação?");
    expect(data.userMessage.attachments).toEqual([]);
    expect(data.assistantMessage.role).toBe("ASSISTANT");
    expect(data.assistantMessage.content).toContain("[MockProvider]");
  });

  it("returns 404 when sending to another organization's conversation", async () => {
    session = await createTestSession();
    const conversationId = await completeTriage(session.cookie);
    otherSession = await createTestSession();

    const formData = new FormData();
    formData.set("content", "Tentando ler conversa de outra organização.");

    const res = await sendMessage(otherSession.cookie, conversationId, formData);

    expect(res.status).toBe(404);
  });

  it("returns 404 for a nonexistent conversation id", async () => {
    session = await createTestSession();

    const formData = new FormData();
    formData.set("content", "Olá?");

    const res = await sendMessage(session.cookie, "does-not-exist", formData);

    expect(res.status).toBe(404);
  });

  it("accepts attachments and persists them, visible on a follow-up GET", async () => {
    session = await createTestSession();
    const conversationId = await completeTriage(session.cookie);

    const formData = new FormData();
    formData.set("content", "Segue o edital em anexo.");
    formData.append("files", new Blob([pdfBytes()], { type: "application/pdf" }), "edital.pdf");
    formData.append("files", new Blob([pngBytes()], { type: "image/png" }), "print.png");

    const res = await sendMessage(session.cookie, conversationId, formData);
    expect(res.status).toBe(201);
    const data = (await res.json()) as {
      userMessage: { attachments: Array<{ fileName: string; mimeType: string }> };
    };
    expect(data.userMessage.attachments).toHaveLength(2);
    expect(data.userMessage.attachments.map((a) => a.fileName).sort()).toEqual(["edital.pdf", "print.png"]);

    const getRes = await app.handle(
      new Request(`http://localhost/conversations/${conversationId}`, { headers: { cookie: session.cookie } }),
    );
    const conversation = (await getRes.json()) as { messages: Array<{ attachments: unknown[] }> };
    expect(conversation.messages[0].attachments).toHaveLength(2);
  });

  it("returns 422 for a disallowed file type", async () => {
    session = await createTestSession();
    const conversationId = await completeTriage(session.cookie);

    const formData = new FormData();
    formData.set("content", "Anexando um tipo não permitido.");
    formData.append("files", new Blob([new Uint8Array([1, 2, 3])], { type: "text/plain" }), "notas.txt");

    const res = await sendMessage(session.cookie, conversationId, formData);

    expect(res.status).toBe(422);
  });

  it("returns 422 for a file exceeding the size limit", async () => {
    session = await createTestSession();
    const conversationId = await completeTriage(session.cookie);

    const formData = new FormData();
    formData.set("content", "Anexo grande demais.");
    formData.append("files", new Blob([pdfBytes(10 * 1024 * 1024 + 1024)], { type: "application/pdf" }), "grande.pdf");

    const res = await sendMessage(session.cookie, conversationId, formData);

    expect(res.status).toBe(422);
  });

  it("returns 422 when content is blank and no files are attached", async () => {
    session = await createTestSession();
    const conversationId = await completeTriage(session.cookie);

    const formData = new FormData();
    formData.set("content", "   ");

    const res = await sendMessage(session.cookie, conversationId, formData);

    expect(res.status).toBe(422);
  });

  it("returns 422 when a file's content does not match its declared type", async () => {
    session = await createTestSession();
    const conversationId = await completeTriage(session.cookie);

    const formData = new FormData();
    formData.set("content", "Arquivo com bytes incompatíveis.");
    formData.append(
      "files",
      new Blob([new Uint8Array([1, 2, 3, 4])], { type: "application/pdf" }),
      "falso.pdf",
    );

    const res = await sendMessage(session.cookie, conversationId, formData);

    expect(res.status).toBe(422);
  });

  it("keeps the persisted user message when the AI provider fails", async () => {
    session = await createTestSession();
    const conversationId = await completeTriage(session.cookie);

    let caughtError: unknown;
    try {
      await SendMessageUseCase.execute(
        conversationId,
        session.userId,
        session.organizationId,
        "Esta chamada de IA vai falhar.",
        [],
        new FailingProvider(),
      );
    } catch (error) {
      caughtError = error;
    }
    expect(caughtError).toBeInstanceOf(AIProviderError);

    const getRes = await app.handle(
      new Request(`http://localhost/conversations/${conversationId}`, { headers: { cookie: session.cookie } }),
    );
    const conversation = (await getRes.json()) as { messages: Array<{ content: string; role: string }> };
    expect(conversation.messages).toHaveLength(1);
    expect(conversation.messages[0].role).toBe("USER");
    expect(conversation.messages[0].content).toBe("Esta chamada de IA vai falhar.");
  });
});
