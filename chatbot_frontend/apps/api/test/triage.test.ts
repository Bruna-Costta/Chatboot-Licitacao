import { afterEach, describe, expect, it } from "bun:test";

import { app } from "../src/app";
import { createTestSession, deleteTestSession, type TestSession } from "./helpers/test-session";

let session: TestSession;

afterEach(async () => {
  if (session) {
    await deleteTestSession(session);
  }
});

describe("POST /triage + GET /triage", () => {
  it("creates a new IN_PROGRESS triage and returns it on GET", async () => {
    session = await createTestSession();

    const startRes = await app.handle(
      new Request("http://localhost/triage", {
        method: "POST",
        headers: { cookie: session.cookie },
      }),
    );
    expect(startRes.status).toBe(200);
    const started = (await startRes.json()) as { id: string; status: string };
    expect(started.status).toBe("IN_PROGRESS");

    const getRes = await app.handle(
      new Request("http://localhost/triage", {
        headers: { cookie: session.cookie },
      }),
    );
    expect(getRes.status).toBe(200);
    const active = (await getRes.json()) as { id: string };
    expect(active.id).toBe(started.id);
  });

  it("is idempotent — calling start twice returns the same triage", async () => {
    session = await createTestSession();

    const first = await app.handle(
      new Request("http://localhost/triage", { method: "POST", headers: { cookie: session.cookie } }),
    );
    const second = await app.handle(
      new Request("http://localhost/triage", { method: "POST", headers: { cookie: session.cookie } }),
    );

    const firstData = (await first.json()) as { id: string };
    const secondData = (await second.json()) as { id: string };
    expect(firstData.id).toBe(secondData.id);
  });

  it("returns 401 without a session", async () => {
    const res = await app.handle(new Request("http://localhost/triage"));
    expect(res.status).toBe(401);
  });

  it("does not return another organization's active triage", async () => {
    session = await createTestSession();
    const otherSession = await createTestSession();

    try {
      await app.handle(
        new Request("http://localhost/triage", { method: "POST", headers: { cookie: otherSession.cookie } }),
      );

      const res = await app.handle(
        new Request("http://localhost/triage", { headers: { cookie: session.cookie } }),
      );

      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toBe("");
    } finally {
      await deleteTestSession(otherSession);
    }
  });
});

describe("PATCH /triage/:id", () => {
  it("persists a step field", async () => {
    session = await createTestSession();
    const startRes = await app.handle(
      new Request("http://localhost/triage", { method: "POST", headers: { cookie: session.cookie } }),
    );
    const { id } = (await startRes.json()) as { id: string };

    const patchRes = await app.handle(
      new Request(`http://localhost/triage/${id}`, {
        method: "PATCH",
        headers: { cookie: session.cookie, "content-type": "application/json" },
        body: JSON.stringify({ subject: "Licitações e contratações" }),
      }),
    );

    expect(patchRes.status).toBe(200);
    const updated = (await patchRes.json()) as { subject: string };
    expect(updated.subject).toBe("Licitações e contratações");
  });

  it("returns 404 when the triage belongs to another organization", async () => {
    session = await createTestSession();
    const otherSession = await createTestSession();

    try {
      const startRes = await app.handle(
        new Request("http://localhost/triage", { method: "POST", headers: { cookie: session.cookie } }),
      );
      const { id } = (await startRes.json()) as { id: string };

      const patchRes = await app.handle(
        new Request(`http://localhost/triage/${id}`, {
          method: "PATCH",
          headers: { cookie: otherSession.cookie, "content-type": "application/json" },
          body: JSON.stringify({ subject: "Licitações e contratações" }),
        }),
      );

      expect(patchRes.status).toBe(404);
    } finally {
      await deleteTestSession(otherSession);
    }
  });

  it("returns 422 for a subject value outside the fixed options", async () => {
    session = await createTestSession();
    const startRes = await app.handle(
      new Request("http://localhost/triage", { method: "POST", headers: { cookie: session.cookie } }),
    );
    const { id } = (await startRes.json()) as { id: string };

    const patchRes = await app.handle(
      new Request(`http://localhost/triage/${id}`, {
        method: "PATCH",
        headers: { cookie: session.cookie, "content-type": "application/json" },
        body: JSON.stringify({ subject: "Valor inventado" }),
      }),
    );

    expect(patchRes.status).toBe(422);
  });

  it("ignores extra fields like status outside the allowed whitelist", async () => {
    session = await createTestSession();
    const startRes = await app.handle(
      new Request("http://localhost/triage", { method: "POST", headers: { cookie: session.cookie } }),
    );
    const { id } = (await startRes.json()) as { id: string };

    const patchRes = await app.handle(
      new Request(`http://localhost/triage/${id}`, {
        method: "PATCH",
        headers: { cookie: session.cookie, "content-type": "application/json" },
        body: JSON.stringify({ subject: "Licitações e contratações", status: "COMPLETED" }),
      }),
    );

    expect(patchRes.status).toBe(200);
    const updated = (await patchRes.json()) as { subject: string; status: string };
    expect(updated.subject).toBe("Licitações e contratações");
    expect(updated.status).toBe("IN_PROGRESS");
  });
});

async function startAndFillTriage(cookie: string, doubtType: string) {
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
        doubtType,
        description: "Preciso entender melhor o prazo de recurso na fase de habilitação.",
      }),
    }),
  );

  return id;
}

describe("POST /triage/:id/complete", () => {
  it("returns 422 when required fields are missing", async () => {
    session = await createTestSession();
    const startRes = await app.handle(
      new Request("http://localhost/triage", { method: "POST", headers: { cookie: session.cookie } }),
    );
    const { id } = (await startRes.json()) as { id: string };

    const completeRes = await app.handle(
      new Request(`http://localhost/triage/${id}/complete`, { method: "POST", headers: { cookie: session.cookie } }),
    );

    expect(completeRes.status).toBe(422);
  });

  it.each([
    ["Legislação", "NORMATIVE"],
    ["Procedimento", "OPERATIONAL"],
    ["eSfinge", "OPERATIONAL"],
    ["Documentos", "DOCUMENTAL"],
    ["Não sei", "UNCERTAIN"],
  ])("maps doubtType %s to semanticDimension %s and creates a Conversation", async (doubtType, expectedDimension) => {
    session = await createTestSession();
    const id = await startAndFillTriage(session.cookie, doubtType);

    const completeRes = await app.handle(
      new Request(`http://localhost/triage/${id}/complete`, { method: "POST", headers: { cookie: session.cookie } }),
    );

    expect(completeRes.status).toBe(200);
    const data = (await completeRes.json()) as {
      triage: { status: string; semanticDimension: string };
      conversation: { id: string; triageId: string };
    };
    expect(data.triage.status).toBe("COMPLETED");
    expect(data.triage.semanticDimension).toBe(expectedDimension);
    expect(data.conversation.triageId).toBe(id);
  });

  it("returns 409 when the triage is already completed", async () => {
    session = await createTestSession();
    const id = await startAndFillTriage(session.cookie, "Legislação");

    await app.handle(
      new Request(`http://localhost/triage/${id}/complete`, { method: "POST", headers: { cookie: session.cookie } }),
    );
    const secondAttempt = await app.handle(
      new Request(`http://localhost/triage/${id}/complete`, { method: "POST", headers: { cookie: session.cookie } }),
    );

    expect(secondAttempt.status).toBe(409);
  });

  it("returns 404 when completing another organization's triage", async () => {
    session = await createTestSession();
    const otherSession = await createTestSession();

    try {
      const id = await startAndFillTriage(session.cookie, "Legislação");

      const completeRes = await app.handle(
        new Request(`http://localhost/triage/${id}/complete`, {
          method: "POST",
          headers: { cookie: otherSession.cookie },
        }),
      );

      expect(completeRes.status).toBe(404);
    } finally {
      await deleteTestSession(otherSession);
    }
  });
});

describe("GET /triage/status", () => {
  it("returns completed: false before the triage is completed", async () => {
    session = await createTestSession();

    const res = await app.handle(new Request("http://localhost/triage/status", { headers: { cookie: session.cookie } }));
    const data = (await res.json()) as { completed: boolean; conversationId: string | null };

    expect(data).toEqual({ completed: false, conversationId: null });
  });

  it("returns completed: true with the conversationId after completion", async () => {
    session = await createTestSession();
    const id = await startAndFillTriage(session.cookie, "Legislação");
    const completeRes = await app.handle(
      new Request(`http://localhost/triage/${id}/complete`, { method: "POST", headers: { cookie: session.cookie } }),
    );
    const { conversation } = (await completeRes.json()) as { conversation: { id: string } };

    const statusRes = await app.handle(
      new Request("http://localhost/triage/status", { headers: { cookie: session.cookie } }),
    );
    const data = (await statusRes.json()) as { completed: boolean; conversationId: string | null };

    expect(data).toEqual({ completed: true, conversationId: conversation.id });
  });

  it("does not return another organization's completed triage/conversation", async () => {
    session = await createTestSession();
    const otherSession = await createTestSession();

    try {
      const id = await startAndFillTriage(otherSession.cookie, "Legislação");
      await app.handle(
        new Request(`http://localhost/triage/${id}/complete`, {
          method: "POST",
          headers: { cookie: otherSession.cookie },
        }),
      );

      const statusRes = await app.handle(
        new Request("http://localhost/triage/status", { headers: { cookie: session.cookie } }),
      );
      const data = (await statusRes.json()) as { completed: boolean; conversationId: string | null };

      expect(data).toEqual({ completed: false, conversationId: null });
    } finally {
      await deleteTestSession(otherSession);
    }
  });
});
