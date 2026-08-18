import { describe, expect, it } from "bun:test";
import { Elysia } from "elysia";

import { UpdateTriageBody } from "../src/modules/triage/triage.model";

describe("UpdateTriageBody", () => {
  const app = new Elysia().post("/test", ({ body }) => body, { body: UpdateTriageBody });

  it("accepts a valid subject option", async () => {
    const res = await app.handle(
      new Request("http://localhost/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subject: "Licitações e contratações" }),
      }),
    );

    expect(res.status).toBe(200);
  });

  it("rejects a subject value outside the fixed option list", async () => {
    const res = await app.handle(
      new Request("http://localhost/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subject: "Valor inventado" }),
      }),
    );

    expect(res.status).toBe(422);
  });

  it("rejects a description shorter than 10 characters", async () => {
    const res = await app.handle(
      new Request("http://localhost/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description: "curta" }),
      }),
    );

    expect(res.status).toBe(422);
  });

  it("accepts a description within the valid length range", async () => {
    const res = await app.handle(
      new Request("http://localhost/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description: "Isso tem mais de dez caracteres." }),
      }),
    );

    expect(res.status).toBe(200);
  });
});
