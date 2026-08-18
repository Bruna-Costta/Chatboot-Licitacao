# Triage Completion + Chat Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Triage wizard fully functional and persisted, and add a server-side gate so an authenticated user cannot reach chat (`/` or `/chat/:id`) until their Triage is `COMPLETED`.

**Architecture:** New `apps/api` modules (`triage`, `conversations`) following the existing Clean Architecture layering (`*.controller.ts` → `application/*.use-case.ts` → Prisma), guarded by the existing `authPlugin` macro. New `apps/web` route group `(protected)/(chat)/` gates `/` and `/chat/[conversationId]` behind triage completion, while `/triage` and `/sobre` stay reachable to any authenticated user. `semanticDimension` is computed server-side from a fixed `doubtType` vocabulary shared via `packages/types`.

**Tech Stack:** ElysiaJS + TypeBox (validation), Prisma (already migrated schema, no changes), `bun:test` (new — first test suite in this repo), React Hook Form + Zod (matches existing auth forms), Next.js 16 route groups.

**Spec:** `docs/superpowers/specs/2026-08-13-triage-completion-gate-design.md`

## Global Constraints

- `organizationId`/`userId` on every Triage/Conversation query must come from the session (`authPlugin`'s `user` context), never from request params/body — the Golden Rule (CLAUDE.md).
- Cross-tenant access to another org's Triage or Conversation must return `404`, never `200` with data or a `403` that reveals existence (RNF-03).
- `semanticDimension` is computed backend-only from `doubtType`; the client can never set it directly (RF-12).
- `description` must be 10–2000 characters (RF-11).
- The five `doubtType` values map exactly to: Legislação→`NORMATIVE`, Procedimento→`OPERATIONAL`, eSfinge→`OPERATIONAL`, Documentos→`DOCUMENTAL`, Não sei→`UNCERTAIN`.
- No test runner exists in this repo yet — this plan introduces `bun:test`, run against the real configured `DATABASE_URL` (no mocking, no test containers); every test that creates a user/org must clean it up.
- Follow existing conventions exactly: TypeBox models named `XBody` with `export type X = typeof X.static`; use-cases are classes with a single `static async execute(...)`; errors are `Error` subclasses with `this.name` set; controllers are thin, delegating to use-cases; `import type` kept separate from value imports (per `.agents/skills/typescript/SKILL.md`).
- Elysia serializes a handler's `null` return as an **empty response body**, not the JSON text `"null"` (confirmed empirically during Task 3). TypeBox validation failures on this Elysia version return **422**, not 400 (also confirmed empirically — corrected from an earlier wrong assumption in this plan). Any code that calls `response.json()` on a possibly-`null`-returning endpoint must read as text first (see `apiGet` in Task 10).

---

## Task 1: `packages/types` — Triage domain constants & DTOs

**Files:**
- Create: `packages/types/src/triage.ts`
- Create: `packages/types/src/api/triage.ts`
- Create: `packages/types/src/api/conversation.ts`
- Modify: `packages/types/src/index.ts`

**Interfaces:**
- Produces: `TRIAGE_SUBJECT_OPTIONS`, `TRIAGE_PROCESS_STAGE_OPTIONS`, `TRIAGE_CONTRACT_TYPE_OPTIONS`, `TRIAGE_DOUBT_TYPE_OPTIONS` (readonly string tuples), `TriageSubject`/`TriageProcessStage`/`TriageContractType`/`TriageDoubtType` (union types derived from them), `DOUBT_TYPE_TO_SEMANTIC_DIMENSION: Record<TriageDoubtType, SemanticDimension>`, `TriageResponse`, `TriageStatusResponse`, `ConversationResponse` — all consumed by both `apps/api` (Task 2+) and `apps/web` (Task 9+).

This task is pure data/types with no branching logic — `bun run typecheck` is the meaningful verification (there is nothing here worth a `bun:test`).

- [ ] **Step 1: Create the triage option constants**

`packages/types/src/triage.ts`:
```ts
import type { SemanticDimension } from "./database.js";

export const TRIAGE_SUBJECT_OPTIONS = [
  "Licitações e contratações",
  "Contratos administrativos",
  "Fiscalização de contratos",
  "eSfinge / TCE-MS",
] as const;
export type TriageSubject = (typeof TRIAGE_SUBJECT_OPTIONS)[number];

export const TRIAGE_PROCESS_STAGE_OPTIONS = [
  "Planejamento da contratação",
  "Publicação e disputa (edital/sessão)",
  "Habilitação e julgamento",
  "Execução e fiscalização do contrato",
] as const;
export type TriageProcessStage = (typeof TRIAGE_PROCESS_STAGE_OPTIONS)[number];

export const TRIAGE_CONTRACT_TYPE_OPTIONS = [
  "Pregão",
  "Concorrência",
  "Dispensa de licitação",
  "Inexigibilidade",
  "Outra modalidade",
] as const;
export type TriageContractType = (typeof TRIAGE_CONTRACT_TYPE_OPTIONS)[number];

export const TRIAGE_DOUBT_TYPE_OPTIONS = [
  "Legislação",
  "Procedimento",
  "eSfinge",
  "Documentos",
  "Não sei",
] as const;
export type TriageDoubtType = (typeof TRIAGE_DOUBT_TYPE_OPTIONS)[number];

export const DOUBT_TYPE_TO_SEMANTIC_DIMENSION: Record<TriageDoubtType, SemanticDimension> = {
  "Legislação": "NORMATIVE",
  "Procedimento": "OPERATIONAL",
  "eSfinge": "OPERATIONAL",
  "Documentos": "DOCUMENTAL",
  "Não sei": "UNCERTAIN",
};
```

- [ ] **Step 2: Create the Triage API DTOs**

`packages/types/src/api/triage.ts`:
```ts
import type { Triage } from "../database.js";

export type TriageResponse = Triage;

export interface TriageStatusResponse {
  completed: boolean;
  conversationId: string | null;
}
```

- [ ] **Step 3: Create the Conversation API DTO**

`packages/types/src/api/conversation.ts`:
```ts
import type { Conversation, Message, Triage } from "../database.js";

export interface ConversationResponse extends Conversation {
  triage: Triage;
  messages: Message[];
}
```

- [ ] **Step 4: Re-export from the package index**

Add to `packages/types/src/index.ts` (alongside the existing exports, keep alphabetical grouping as-is):
```ts
export type { ConversationResponse } from "./api/conversation.js";
export type { TriageResponse, TriageStatusResponse } from "./api/triage.js";
export {
  DOUBT_TYPE_TO_SEMANTIC_DIMENSION,
  TRIAGE_CONTRACT_TYPE_OPTIONS,
  TRIAGE_DOUBT_TYPE_OPTIONS,
  TRIAGE_PROCESS_STAGE_OPTIONS,
  TRIAGE_SUBJECT_OPTIONS,
} from "./triage.js";
export type {
  TriageContractType,
  TriageDoubtType,
  TriageProcessStage,
  TriageSubject,
} from "./triage.js";
```

- [ ] **Step 5: Verify**

Run: `bun run typecheck` (from repo root)
Expected: all packages pass, including `@workspace/types`.

- [ ] **Step 6: Commit**

```bash
git add packages/types
git commit -m "feat(types): add triage option constants and API DTOs"
```

---

## Task 2: `apps/api` — Triage TypeBox model + domain errors + test harness

**Files:**
- Create: `apps/api/src/modules/triage/triage.model.ts`
- Create: `apps/api/src/modules/triage/domain/triage.errors.ts`
- Create: `apps/api/test/triage-model.test.ts`
- Modify: `apps/api/package.json` (add `test` script)
- Modify: `turbo.json` (add `test` task)
- Modify: `package.json` (root — add `test` script)

**Interfaces:**
- Produces: `UpdateTriageBody` (TypeBox schema + `.static` type), `TriageNotFoundError`, `TriageIncompleteError`, `TriageAlreadyCompletedError` — consumed by Tasks 3–6's use-cases and controller.

- [ ] **Step 1: Add the `test` script and turbo wiring (setup for this and every later test task)**

In `apps/api/package.json`, add to `"scripts"`:
```json
"test": "dotenv -e ../../.env -- bun test"
```

In `turbo.json`, add a `test` task alongside the existing `typecheck`/`lint` tasks:
```json
"test": {
  "dependsOn": ["^build"]
}
```

In root `package.json`, add to `"scripts"`:
```json
"test": "turbo run test"
```

- [ ] **Step 2: Write the failing test**

`apps/api/test/triage-model.test.ts`:
```ts
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/api && bun run test` (from repo root, or `bun run test --filter=api`)
Expected: FAIL — `../src/modules/triage/triage.model` does not exist yet.

- [ ] **Step 4: Create the domain errors**

`apps/api/src/modules/triage/domain/triage.errors.ts`:
```ts
export class TriageNotFoundError extends Error {
  constructor() {
    super("Triagem não encontrada.");
    this.name = "TriageNotFoundError";
  }
}

export class TriageIncompleteError extends Error {
  constructor(missingField: string) {
    super(`Campo obrigatório não preenchido: ${missingField}.`);
    this.name = "TriageIncompleteError";
  }
}

export class TriageAlreadyCompletedError extends Error {
  constructor() {
    super("Esta triagem já foi concluída.");
    this.name = "TriageAlreadyCompletedError";
  }
}
```

- [ ] **Step 5: Create the TypeBox model**

`apps/api/src/modules/triage/triage.model.ts`:
```ts
import { t } from "elysia";

import {
  TRIAGE_CONTRACT_TYPE_OPTIONS,
  TRIAGE_DOUBT_TYPE_OPTIONS,
  TRIAGE_PROCESS_STAGE_OPTIONS,
  TRIAGE_SUBJECT_OPTIONS,
} from "@workspace/types";

const literalUnion = (values: readonly string[]) => t.Union(values.map((value) => t.Literal(value)));

export const UpdateTriageBody = t.Partial(
  t.Object({
    subject: literalUnion(TRIAGE_SUBJECT_OPTIONS),
    processStage: literalUnion(TRIAGE_PROCESS_STAGE_OPTIONS),
    contractType: literalUnion(TRIAGE_CONTRACT_TYPE_OPTIONS),
    doubtType: literalUnion(TRIAGE_DOUBT_TYPE_OPTIONS),
    description: t.String({ minLength: 10, maxLength: 2000 }),
  }),
);
export type UpdateTriageBody = typeof UpdateTriageBody.static;
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd apps/api && bun run test`
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/triage apps/api/test apps/api/package.json turbo.json package.json
git commit -m "feat(api): add triage validation model and domain errors"
```

---

## Task 3: `apps/api` — Start + resume Triage (`POST /triage`, `GET /triage`)

**Files:**
- Create: `apps/api/src/modules/triage/application/start-triage.use-case.ts`
- Create: `apps/api/src/modules/triage/application/get-active-triage.use-case.ts`
- Create: `apps/api/src/modules/triage/triage.controller.ts`
- Create: `apps/api/test/helpers/test-session.ts`
- Create: `apps/api/test/triage.test.ts`
- Modify: `apps/api/src/app.ts`

**Interfaces:**
- Consumes: `authPlugin` from `@workspace/auth/server` (produces `{ user: CurrentUser }` in context on routes with `{ auth: true }`), `prisma` from `@workspace/database`.
- Produces: `StartTriageUseCase.execute(userId, organizationId): Promise<Triage>`, `GetActiveTriageUseCase.execute(userId, organizationId): Promise<Triage | null>`, `triageController` (Elysia instance mounted in `app.ts`), `createTestSession(): Promise<{ cookie, userId, organizationId, email }>` and `deleteTestSession(userId, organizationId): Promise<void>` test helpers reused by every later test task.

- [ ] **Step 1: Write the test session helper (no test framework call yet — plain module)**

`apps/api/test/helpers/test-session.ts`:
```ts
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
```

- [ ] **Step 2: Write the failing test**

`apps/api/test/triage.test.ts`:
```ts
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
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/api && bun run test`
Expected: FAIL — `/triage` route does not exist (404s), or use-cases don't exist yet.

- [ ] **Step 4: Implement the use-cases**

`apps/api/src/modules/triage/application/start-triage.use-case.ts`:
```ts
import { prisma } from "@workspace/database";

export class StartTriageUseCase {
  static async execute(userId: string, organizationId: string) {
    const existing = await prisma.triage.findFirst({
      where: { userId, organizationId, status: "IN_PROGRESS" },
    });

    if (existing) {
      return existing;
    }

    return prisma.triage.create({
      data: {
        userId,
        organizationId,
        subject: "",
        processStage: "",
        contractType: "",
        doubtType: "",
        description: "",
      },
    });
  }
}
```

`apps/api/src/modules/triage/application/get-active-triage.use-case.ts`:
```ts
import { prisma } from "@workspace/database";

export class GetActiveTriageUseCase {
  static async execute(userId: string, organizationId: string) {
    return prisma.triage.findFirst({
      where: { userId, organizationId, status: "IN_PROGRESS" },
      orderBy: { createdAt: "desc" },
    });
  }
}
```

- [ ] **Step 5: Implement the controller**

`apps/api/src/modules/triage/triage.controller.ts`:
```ts
import { Elysia } from "elysia";

import { authPlugin } from "@workspace/auth/server";

import { GetActiveTriageUseCase } from "./application/get-active-triage.use-case.js";
import { StartTriageUseCase } from "./application/start-triage.use-case.js";

export const triageController = new Elysia()
  .use(authPlugin)
  .group("/triage", (app) =>
    app
      .get("/", async ({ user }) => GetActiveTriageUseCase.execute(user.id, user.organizationId), { auth: true })
      .post("/", async ({ user }) => StartTriageUseCase.execute(user.id, user.organizationId), { auth: true }),
  );
```

- [ ] **Step 6: Wire into `app.ts`**

`apps/api/src/app.ts` (add the import and `.use()`):
```ts
import { Elysia } from "elysia";

import { authController } from "./modules/auth/auth.controller";
import { healthController } from "./modules/health/health.controller";
import { triageController } from "./modules/triage/triage.controller";
import { corsPlugin } from "./plugins/cors";

export const app = new Elysia().use(corsPlugin).use(healthController).use(authController).use(triageController);

export type App = typeof app;
```

- [ ] **Step 7: Run test to verify it passes**

Run: `cd apps/api && bun run test`
Expected: PASS (all `triage.test.ts` + `triage-model.test.ts` tests).

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/modules/triage apps/api/src/app.ts apps/api/test
git commit -m "feat(api): add POST/GET /triage to start and resume a triage"
```

---

## Task 4: `apps/api` — Update a triage step (`PATCH /triage/:id`)

**Files:**
- Create: `apps/api/src/modules/triage/application/update-triage-step.use-case.ts`
- Modify: `apps/api/src/modules/triage/triage.controller.ts`
- Modify: `apps/api/test/triage.test.ts`

**Interfaces:**
- Consumes: `UpdateTriageBody` (Task 2), `TriageNotFoundError` (Task 2).
- Produces: `UpdateTriageStepUseCase.execute(triageId, userId, organizationId, data): Promise<Triage>` — throws `TriageNotFoundError` if the triage doesn't belong to the caller or isn't `IN_PROGRESS`.

- [ ] **Step 1: Write the failing tests**

Append to `apps/api/test/triage.test.ts`:
```ts
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && bun run test`
Expected: FAIL — `PATCH /triage/:id` doesn't exist (404 where 200 expected).

- [ ] **Step 3: Implement the use-case**

`apps/api/src/modules/triage/application/update-triage-step.use-case.ts`:
```ts
import { prisma } from "@workspace/database";

import { TriageNotFoundError } from "../domain/triage.errors.js";
import type { UpdateTriageBody } from "../triage.model.js";

export class UpdateTriageStepUseCase {
  static async execute(triageId: string, userId: string, organizationId: string, data: UpdateTriageBody) {
    const triage = await prisma.triage.findFirst({
      where: { id: triageId, userId, organizationId, status: "IN_PROGRESS" },
    });

    if (!triage) {
      throw new TriageNotFoundError();
    }

    return prisma.triage.update({
      where: { id: triageId },
      data,
    });
  }
}
```

- [ ] **Step 4: Add the route**

Modify `apps/api/src/modules/triage/triage.controller.ts` — add the import and the `.patch()` route inside the existing `.group("/triage", ...)` chain:
```ts
import { Elysia, t } from "elysia";

import { authPlugin } from "@workspace/auth/server";

import { GetActiveTriageUseCase } from "./application/get-active-triage.use-case.js";
import { StartTriageUseCase } from "./application/start-triage.use-case.js";
import { UpdateTriageStepUseCase } from "./application/update-triage-step.use-case.js";
import { TriageNotFoundError } from "./domain/triage.errors.js";
import { UpdateTriageBody } from "./triage.model.js";

export const triageController = new Elysia()
  .use(authPlugin)
  .group("/triage", (app) =>
    app
      .get("/", async ({ user }) => GetActiveTriageUseCase.execute(user.id, user.organizationId), { auth: true })
      .post("/", async ({ user }) => StartTriageUseCase.execute(user.id, user.organizationId), { auth: true })
      .patch(
        "/:id",
        async ({ params, body, user, status }) => {
          try {
            return await UpdateTriageStepUseCase.execute(params.id, user.id, user.organizationId, body);
          } catch (error) {
            if (error instanceof TriageNotFoundError) return status(404);
            throw error;
          }
        },
        { auth: true, body: UpdateTriageBody, params: t.Object({ id: t.String() }) },
      ),
  );
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/api && bun run test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/triage apps/api/test/triage.test.ts
git commit -m "feat(api): add PATCH /triage/:id to persist wizard step answers"
```

---

## Task 5: `apps/api` — Complete a triage (`POST /triage/:id/complete`)

**Files:**
- Create: `apps/api/src/modules/triage/application/complete-triage.use-case.ts`
- Modify: `apps/api/src/modules/triage/triage.controller.ts`
- Modify: `apps/api/test/triage.test.ts`

**Interfaces:**
- Consumes: `DOUBT_TYPE_TO_SEMANTIC_DIMENSION`, `TriageDoubtType` (Task 1), `TriageNotFoundError`/`TriageIncompleteError`/`TriageAlreadyCompletedError` (Task 2).
- Produces: `CompleteTriageUseCase.execute(triageId, userId, organizationId): Promise<{ triage: Triage; conversation: Conversation }>`.

- [ ] **Step 1: Write the failing tests**

Append to `apps/api/test/triage.test.ts`:
```ts
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && bun run test`
Expected: FAIL — `/triage/:id/complete` route doesn't exist.

- [ ] **Step 3: Implement the use-case**

`apps/api/src/modules/triage/application/complete-triage.use-case.ts`:
```ts
import { prisma } from "@workspace/database";
import { DOUBT_TYPE_TO_SEMANTIC_DIMENSION, type TriageDoubtType } from "@workspace/types";

import { TriageAlreadyCompletedError, TriageIncompleteError, TriageNotFoundError } from "../domain/triage.errors.js";

const REQUIRED_FIELDS = ["subject", "processStage", "contractType", "doubtType", "description"] as const;

export class CompleteTriageUseCase {
  static async execute(triageId: string, userId: string, organizationId: string) {
    const triage = await prisma.triage.findFirst({
      where: { id: triageId, userId, organizationId },
    });

    if (!triage) {
      throw new TriageNotFoundError();
    }

    if (triage.status === "COMPLETED") {
      throw new TriageAlreadyCompletedError();
    }

    for (const field of REQUIRED_FIELDS) {
      if (!triage[field]) {
        throw new TriageIncompleteError(field);
      }
    }

    if (triage.description.length < 10 || triage.description.length > 2000) {
      throw new TriageIncompleteError("description");
    }

    const semanticDimension = DOUBT_TYPE_TO_SEMANTIC_DIMENSION[triage.doubtType as TriageDoubtType];

    const [updatedTriage, conversation] = await prisma.$transaction([
      prisma.triage.update({
        where: { id: triageId },
        data: { status: "COMPLETED", completedAt: new Date(), semanticDimension },
      }),
      prisma.conversation.create({
        data: { organizationId, userId, triageId, status: "ACTIVE" },
      }),
    ]);

    return { triage: updatedTriage, conversation };
  }
}
```

- [ ] **Step 4: Add the route**

Modify `apps/api/src/modules/triage/triage.controller.ts` — add the import and the `.post("/:id/complete", ...)` route:
```ts
import { Elysia, t } from "elysia";

import { authPlugin } from "@workspace/auth/server";

import { CompleteTriageUseCase } from "./application/complete-triage.use-case.js";
import { GetActiveTriageUseCase } from "./application/get-active-triage.use-case.js";
import { StartTriageUseCase } from "./application/start-triage.use-case.js";
import { UpdateTriageStepUseCase } from "./application/update-triage-step.use-case.js";
import { TriageAlreadyCompletedError, TriageIncompleteError, TriageNotFoundError } from "./domain/triage.errors.js";
import { UpdateTriageBody } from "./triage.model.js";

export const triageController = new Elysia()
  .use(authPlugin)
  .group("/triage", (app) =>
    app
      .get("/", async ({ user }) => GetActiveTriageUseCase.execute(user.id, user.organizationId), { auth: true })
      .post("/", async ({ user }) => StartTriageUseCase.execute(user.id, user.organizationId), { auth: true })
      .patch(
        "/:id",
        async ({ params, body, user, status }) => {
          try {
            return await UpdateTriageStepUseCase.execute(params.id, user.id, user.organizationId, body);
          } catch (error) {
            if (error instanceof TriageNotFoundError) return status(404);
            throw error;
          }
        },
        { auth: true, body: UpdateTriageBody, params: t.Object({ id: t.String() }) },
      )
      .post(
        "/:id/complete",
        async ({ params, user, status }) => {
          try {
            return await CompleteTriageUseCase.execute(params.id, user.id, user.organizationId);
          } catch (error) {
            if (error instanceof TriageNotFoundError) return status(404);
            if (error instanceof TriageIncompleteError) return status(422, { message: error.message });
            if (error instanceof TriageAlreadyCompletedError) return status(409, { message: error.message });
            throw error;
          }
        },
        { auth: true, params: t.Object({ id: t.String() }) },
      ),
  );
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/api && bun run test`
Expected: PASS (includes all 5 `doubtType`→`semanticDimension` cases).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/triage apps/api/test/triage.test.ts
git commit -m "feat(api): add POST /triage/:id/complete with semanticDimension mapping and Conversation creation"
```

---

## Task 6: `apps/api` — Triage status (`GET /triage/status`)

**Files:**
- Create: `apps/api/src/modules/triage/application/get-triage-status.use-case.ts`
- Modify: `apps/api/src/modules/triage/triage.controller.ts`
- Modify: `apps/api/test/triage.test.ts`

**Interfaces:**
- Produces: `GetTriageStatusUseCase.execute(userId, organizationId): Promise<{ completed: boolean; conversationId: string | null }>` — this is what the frontend gate (Task 12) calls.

- [ ] **Step 1: Write the failing tests**

Append to `apps/api/test/triage.test.ts`:
```ts
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && bun run test`
Expected: FAIL — `/triage/status` route doesn't exist (note: register `/status` **before** `/:id` routes so it isn't shadowed — see Step 4).

- [ ] **Step 3: Implement the use-case**

`apps/api/src/modules/triage/application/get-triage-status.use-case.ts`:
```ts
import { prisma } from "@workspace/database";

export class GetTriageStatusUseCase {
  static async execute(userId: string, organizationId: string) {
    const conversation = await prisma.conversation.findFirst({
      where: { organizationId, userId, triage: { status: "COMPLETED" } },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    return { completed: !!conversation, conversationId: conversation?.id ?? null };
  }
}
```

- [ ] **Step 4: Add the route**

Modify `apps/api/src/modules/triage/triage.controller.ts` — add the import and place `.get("/status", ...)` right after `.get("/", ...)` (Elysia matches static paths before param paths regardless of registration order, but keep this ordering for readability):
```ts
import { Elysia, t } from "elysia";

import { authPlugin } from "@workspace/auth/server";

import { CompleteTriageUseCase } from "./application/complete-triage.use-case.js";
import { GetActiveTriageUseCase } from "./application/get-active-triage.use-case.js";
import { GetTriageStatusUseCase } from "./application/get-triage-status.use-case.js";
import { StartTriageUseCase } from "./application/start-triage.use-case.js";
import { UpdateTriageStepUseCase } from "./application/update-triage-step.use-case.js";
import { TriageAlreadyCompletedError, TriageIncompleteError, TriageNotFoundError } from "./domain/triage.errors.js";
import { UpdateTriageBody } from "./triage.model.js";

export const triageController = new Elysia()
  .use(authPlugin)
  .group("/triage", (app) =>
    app
      .get("/", async ({ user }) => GetActiveTriageUseCase.execute(user.id, user.organizationId), { auth: true })
      .get("/status", async ({ user }) => GetTriageStatusUseCase.execute(user.id, user.organizationId), {
        auth: true,
      })
      .post("/", async ({ user }) => StartTriageUseCase.execute(user.id, user.organizationId), { auth: true })
      .patch(
        "/:id",
        async ({ params, body, user, status }) => {
          try {
            return await UpdateTriageStepUseCase.execute(params.id, user.id, user.organizationId, body);
          } catch (error) {
            if (error instanceof TriageNotFoundError) return status(404);
            throw error;
          }
        },
        { auth: true, body: UpdateTriageBody, params: t.Object({ id: t.String() }) },
      )
      .post(
        "/:id/complete",
        async ({ params, user, status }) => {
          try {
            return await CompleteTriageUseCase.execute(params.id, user.id, user.organizationId);
          } catch (error) {
            if (error instanceof TriageNotFoundError) return status(404);
            if (error instanceof TriageIncompleteError) return status(422, { message: error.message });
            if (error instanceof TriageAlreadyCompletedError) return status(409, { message: error.message });
            throw error;
          }
        },
        { auth: true, params: t.Object({ id: t.String() }) },
      ),
  );
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/api && bun run test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/triage apps/api/test/triage.test.ts
git commit -m "feat(api): add GET /triage/status for the frontend chat gate"
```

---

## Task 7: `apps/api` — Conversations module (`GET /conversations/:id`)

**Files:**
- Create: `apps/api/src/modules/conversations/domain/conversation.errors.ts`
- Create: `apps/api/src/modules/conversations/application/get-conversation.use-case.ts`
- Create: `apps/api/src/modules/conversations/conversations.controller.ts`
- Create: `apps/api/test/conversations.test.ts`
- Modify: `apps/api/src/app.ts`

**Interfaces:**
- Produces: `GetConversationUseCase.execute(conversationId, userId, organizationId): Promise<Conversation & { triage: Triage; messages: Message[] }>` — throws `ConversationNotFoundError`. `conversationsController` mounted in `app.ts`.

- [ ] **Step 1: Write the failing test**

`apps/api/test/conversations.test.ts`:
```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && bun run test`
Expected: FAIL — `/conversations/:id` route doesn't exist.

- [ ] **Step 3: Implement the domain error and use-case**

`apps/api/src/modules/conversations/domain/conversation.errors.ts`:
```ts
export class ConversationNotFoundError extends Error {
  constructor() {
    super("Conversa não encontrada.");
    this.name = "ConversationNotFoundError";
  }
}
```

`apps/api/src/modules/conversations/application/get-conversation.use-case.ts`:
```ts
import { prisma } from "@workspace/database";

import { ConversationNotFoundError } from "../domain/conversation.errors.js";

export class GetConversationUseCase {
  static async execute(conversationId: string, userId: string, organizationId: string) {
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId, organizationId },
      include: { triage: true, messages: { orderBy: { createdAt: "asc" } } },
    });

    if (!conversation) {
      throw new ConversationNotFoundError();
    }

    return conversation;
  }
}
```

- [ ] **Step 4: Implement the controller**

`apps/api/src/modules/conversations/conversations.controller.ts`:
```ts
import { Elysia, t } from "elysia";

import { authPlugin } from "@workspace/auth/server";

import { GetConversationUseCase } from "./application/get-conversation.use-case.js";
import { ConversationNotFoundError } from "./domain/conversation.errors.js";

export const conversationsController = new Elysia()
  .use(authPlugin)
  .group("/conversations", (app) =>
    app.get(
      "/:id",
      async ({ params, user, status }) => {
        try {
          return await GetConversationUseCase.execute(params.id, user.id, user.organizationId);
        } catch (error) {
          if (error instanceof ConversationNotFoundError) return status(404);
          throw error;
        }
      },
      { auth: true, params: t.Object({ id: t.String() }) },
    ),
  );
```

- [ ] **Step 5: Wire into `app.ts`**

```ts
import { Elysia } from "elysia";

import { authController } from "./modules/auth/auth.controller";
import { conversationsController } from "./modules/conversations/conversations.controller";
import { healthController } from "./modules/health/health.controller";
import { triageController } from "./modules/triage/triage.controller";
import { corsPlugin } from "./plugins/cors";

export const app = new Elysia()
  .use(corsPlugin)
  .use(healthController)
  .use(authController)
  .use(triageController)
  .use(conversationsController);

export type App = typeof app;
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd apps/api && bun run test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/conversations apps/api/src/app.ts apps/api/test/conversations.test.ts
git commit -m "feat(api): add GET /conversations/:id scoped to the session's org"
```

---

## Task 8: `apps/api` — Full verification

**Files:** none (verification-only task).

- [ ] **Step 1: Run the full test suite**

Run: `cd apps/api && bun run test`
Expected: PASS — every test from Tasks 2–7.

- [ ] **Step 2: Run typecheck, lint, build for the whole monorepo**

Run (from repo root): `bun run typecheck && bun run lint && bun run build`
Expected: all pass (warnings on pre-existing `turbo/no-undeclared-env-vars` items are expected and unrelated to this change).

- [ ] **Step 3: Commit (only if any of the above required fixes)**

```bash
git add -A
git commit -m "chore(api): fix typecheck/lint issues from triage module"
```
(Skip this step if nothing needed fixing.)

---

## Task 9: `packages/ui` — Textarea component

**Files:**
- Create: `packages/ui/src/components/textarea.tsx`

**Interfaces:**
- Produces: `Textarea` (React component, `React.ComponentProps<"textarea">`) — consumed by `TriageWizard` (Task 11).

No `bun:test` for this — it's a presentational component with no branching logic, matching how `input.tsx`/`label.tsx`/`card.tsx` have no tests either. Verified via `typecheck` and later via the manual E2E pass (Task 13).

- [ ] **Step 1: Create the component**

`packages/ui/src/components/textarea.tsx`:
```tsx
import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-24 w-full rounded-2xl border border-transparent bg-input/50 px-3 py-2 text-base transition-[color,box-shadow,background-color] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
```

- [ ] **Step 2: Verify**

Run: `bun run typecheck --filter=@workspace/ui` (from repo root)
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/ui/src/components/textarea.tsx
git commit -m "feat(ui): add Textarea component"
```

---

## Task 10: `apps/web` — Generic GET/PATCH helpers in `api-client.ts`

**Files:**
- Modify: `apps/web/lib/api-client.ts`

**Interfaces:**
- Produces: `apiGet<TResponse>(path): Promise<TResponse>`, `apiPatch<TResponse>(path, body): Promise<TResponse>` — consumed by `TriageWizard` (Task 11) and the new gate/page server components (Task 12). `apiPost`'s `body` parameter becomes optional (backward compatible — existing callers in `sign-up-form.tsx`/`sign-in-form.tsx` always pass a body).

- [ ] **Step 1: Replace the file with GET/POST/PATCH helpers sharing one error-parsing path**

`apps/web/lib/api-client.ts` (full replacement):
```ts
const API_URL = process.env.NEXT_PUBLIC_API_URL

export class ApiError extends Error {}

async function parseErrorOrThrow(response: Response): Promise<never> {
  const data = (await response.json().catch(() => null)) as { message?: string } | null
  throw new ApiError(data?.message ?? "Não foi possível concluir a solicitação.")
}

export async function apiGet<TResponse>(path: string): Promise<TResponse> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "GET",
    credentials: "include",
  })

  if (!response.ok) {
    return parseErrorOrThrow(response)
  }

  // Elysia serializes a handler's `null` return (e.g. GET /triage with no active triage)
  // as an EMPTY body, not the JSON text "null" — response.json() throws a SyntaxError on
  // an empty body, so read as text first and only parse when there's something to parse.
  const text = await response.text()
  return (text ? JSON.parse(text) : null) as TResponse
}

export async function apiPost<TResponse>(path: string, body?: unknown): Promise<TResponse> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    return parseErrorOrThrow(response)
  }

  return (await response.json()) as TResponse
}

export async function apiPatch<TResponse>(path: string, body: unknown): Promise<TResponse> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    return parseErrorOrThrow(response)
  }

  return (await response.json()) as TResponse
}
```

- [ ] **Step 2: Verify existing callers still typecheck**

Run: `bun run typecheck --filter=web` (from repo root)
Expected: PASS — `sign-up-form.tsx`/`sign-in-form.tsx`'s `apiPost<SignUpResponse>("/auth/sign-up", values)` calls remain valid since `body` is now optional, not required-then-removed.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/api-client.ts
git commit -m "feat(web): add apiGet/apiPatch helpers to api-client"
```

---

## Task 11: `apps/web` — `StepSelect` + `TriageWizard` components

**Files:**
- Create: `apps/web/components/triage/step-select.tsx`
- Create: `apps/web/components/triage/triage-wizard.tsx`

**Interfaces:**
- Consumes: `TRIAGE_SUBJECT_OPTIONS`/`TRIAGE_PROCESS_STAGE_OPTIONS`/`TRIAGE_CONTRACT_TYPE_OPTIONS`/`TRIAGE_DOUBT_TYPE_OPTIONS` (Task 1), `TriageResponse` (Task 1), `apiGet`/`apiPatch`/`apiPost`/`ApiError` (Task 10), `Textarea` (Task 9), `Alert`/`AlertDescription`/`Button` (existing).
- Produces: `TriageWizard` (default export consumed by `apps/web/app/(protected)/triage/page.tsx` in Task 12).

No automated test — this repo has no frontend test runner and Sprint 1/2 established manual dev-server verification as the pattern for UI. Verified in Task 13's end-to-end pass.

- [ ] **Step 1: Create `StepSelect`**

`apps/web/components/triage/step-select.tsx`:
```tsx
"use client"

import { cn } from "@workspace/ui/lib/utils"

interface StepSelectProps {
  options: readonly string[]
  value: string
  onSelect: (value: string) => void
}

function StepSelect({ options, value, onSelect }: StepSelectProps) {
  return (
    <div className="mt-6 flex flex-col gap-4">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onSelect(option)}
          className={cn(
            "w-full rounded-2xl border px-6 py-4 text-left text-lg transition-colors",
            value === option
              ? "border-primary bg-primary/10 text-foreground"
              : "border-border bg-background text-foreground hover:bg-muted"
          )}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

export { StepSelect }
```

- [ ] **Step 2: Create `TriageWizard`**

`apps/web/components/triage/triage-wizard.tsx`:
```tsx
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import {
  TRIAGE_CONTRACT_TYPE_OPTIONS,
  TRIAGE_DOUBT_TYPE_OPTIONS,
  TRIAGE_PROCESS_STAGE_OPTIONS,
  TRIAGE_SUBJECT_OPTIONS,
} from "@workspace/types"
import type { TriageResponse } from "@workspace/types"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"

import { StepSelect } from "@/components/triage/step-select"
import { apiGet, apiPatch, apiPost, ApiError } from "@/lib/api-client"

const optionTuple = (values: readonly string[]) => values as unknown as [string, ...string[]]

const triageSchema = z.object({
  subject: z.enum(optionTuple(TRIAGE_SUBJECT_OPTIONS), { errorMap: () => ({ message: "Selecione um assunto." }) }),
  processStage: z.enum(optionTuple(TRIAGE_PROCESS_STAGE_OPTIONS), {
    errorMap: () => ({ message: "Selecione a etapa do processo." }),
  }),
  contractType: z.enum(optionTuple(TRIAGE_CONTRACT_TYPE_OPTIONS), {
    errorMap: () => ({ message: "Selecione o tipo de contratação." }),
  }),
  doubtType: z.enum(optionTuple(TRIAGE_DOUBT_TYPE_OPTIONS), {
    errorMap: () => ({ message: "Selecione a natureza da dúvida." }),
  }),
  description: z
    .string()
    .min(10, "A descrição deve ter no mínimo 10 caracteres.")
    .max(2000, "A descrição deve ter no máximo 2000 caracteres."),
})

type TriageValues = z.infer<typeof triageSchema>

const STEPS = ["subject", "processStage", "contractType", "doubtType", "description"] as const
type StepField = (typeof STEPS)[number]

const STEP_TITLES: Record<StepField, string> = {
  subject: "Qual é o assunto da sua dúvida?",
  processStage: "Em qual etapa do processo você está?",
  contractType: "Qual o tipo de contratação?",
  doubtType: "Qual a natureza da sua dúvida?",
  description: "Descreva sua dúvida com mais detalhes",
}

function TriageWizard() {
  const router = useRouter()
  const [triageId, setTriageId] = useState<string | null>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<TriageValues>({
    resolver: zodResolver(triageSchema),
    defaultValues: { subject: "", processStage: "", contractType: "", doubtType: "", description: "" },
  })

  useEffect(() => {
    async function loadOrStart() {
      try {
        const active = await apiGet<TriageResponse | null>("/triage")
        const triage = active ?? (await apiPost<TriageResponse>("/triage"))

        setTriageId(triage.id)
        form.reset({
          subject: triage.subject,
          processStage: triage.processStage,
          contractType: triage.contractType,
          doubtType: triage.doubtType,
          description: triage.description,
        })

        const firstIncomplete = STEPS.findIndex((field) => !triage[field])
        setStepIndex(firstIncomplete === -1 ? STEPS.length - 1 : firstIncomplete)
      } catch (error) {
        setFormError(error instanceof ApiError ? error.message : "Não foi possível carregar a triagem.")
      } finally {
        setLoading(false)
      }
    }

    void loadOrStart()
    // Runs once on mount to load-or-start the active triage; form/router are stable RHF/Next refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const currentField: StepField = STEPS[stepIndex]!
  const isLastStep = stepIndex === STEPS.length - 1

  async function handleAdvance() {
    setFormError(null)
    const valid = await form.trigger(currentField)
    if (!valid || !triageId) return

    setSubmitting(true)
    try {
      await apiPatch(`/triage/${triageId}`, { [currentField]: form.getValues(currentField) })

      if (isLastStep) {
        const result = await apiPost<{ conversation: { id: string } }>(`/triage/${triageId}/complete`)
        router.push(`/chat/${result.conversation.id}`)
        return
      }

      setStepIndex((index) => index + 1)
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Não foi possível salvar sua resposta.")
    } finally {
      setSubmitting(false)
    }
  }

  function handleBack() {
    setFormError(null)
    setStepIndex((index) => Math.max(0, index - 1))
  }

  if (loading) {
    return <p className="text-muted-foreground">Carregando triagem…</p>
  }

  return (
    <div className="w-full max-w-4xl rounded-3xl bg-card p-10 shadow-sm">
      <h1 className="text-2xl font-semibold text-foreground">Triagem</h1>

      <div className="relative mt-10 flex items-center justify-between px-2">
        <div className="absolute left-6 right-6 top-1/2 h-0.5 -translate-y-1/2 bg-border" />
        {STEPS.map((step, index) => (
          <div
            key={step}
            className={cn(
              "relative z-10 flex size-9 items-center justify-center rounded-full border-2 text-sm font-medium",
              index === stepIndex
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground"
            )}
          >
            {index + 1}
          </div>
        ))}
      </div>

      <h2 className="mt-12 text-xl text-foreground">{STEP_TITLES[currentField]}</h2>

      {formError ? (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="mt-6">
        {currentField === "subject" ? (
          <StepSelect
            options={TRIAGE_SUBJECT_OPTIONS}
            value={form.watch("subject")}
            onSelect={(value) => form.setValue("subject", value as TriageValues["subject"], { shouldValidate: true })}
          />
        ) : null}
        {currentField === "processStage" ? (
          <StepSelect
            options={TRIAGE_PROCESS_STAGE_OPTIONS}
            value={form.watch("processStage")}
            onSelect={(value) =>
              form.setValue("processStage", value as TriageValues["processStage"], { shouldValidate: true })
            }
          />
        ) : null}
        {currentField === "contractType" ? (
          <StepSelect
            options={TRIAGE_CONTRACT_TYPE_OPTIONS}
            value={form.watch("contractType")}
            onSelect={(value) =>
              form.setValue("contractType", value as TriageValues["contractType"], { shouldValidate: true })
            }
          />
        ) : null}
        {currentField === "doubtType" ? (
          <StepSelect
            options={TRIAGE_DOUBT_TYPE_OPTIONS}
            value={form.watch("doubtType")}
            onSelect={(value) => form.setValue("doubtType", value as TriageValues["doubtType"], { shouldValidate: true })}
          />
        ) : null}
        {currentField === "description" ? (
          <div className="flex flex-col gap-2">
            <Textarea rows={6} maxLength={2000} placeholder="Descreva sua dúvida em detalhes…" {...form.register("description")} />
            <p className="text-right text-sm text-muted-foreground">{form.watch("description").length}/2000</p>
          </div>
        ) : null}
      </div>

      <div className="mt-10 flex justify-between">
        <Button type="button" variant="outline" onClick={handleBack} disabled={stepIndex === 0 || submitting}>
          Voltar
        </Button>
        <Button type="button" onClick={handleAdvance} disabled={submitting}>
          {isLastStep ? "Concluir" : "Avançar"}
        </Button>
      </div>
    </div>
  )
}

export { TriageWizard }
```

- [ ] **Step 3: Verify**

Run: `bun run typecheck --filter=web` (from repo root)
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/triage
git commit -m "feat(web): add TriageWizard with per-step autosave and resume"
```

---

## Task 12: `apps/web` — Wire the gate, `/triage` page, and `/chat/[conversationId]`

**Files:**
- Create: `apps/web/lib/get-triage-status.ts`
- Modify: `apps/web/app/(protected)/triage/page.tsx`
- Create: `apps/web/app/(protected)/(chat)/layout.tsx`
- Move: `apps/web/app/(protected)/page.tsx` → `apps/web/app/(protected)/(chat)/page.tsx` (rewritten)
- Create: `apps/web/app/(protected)/(chat)/chat/[conversationId]/page.tsx`

**Interfaces:**
- Consumes: `TriageStatusResponse`/`ConversationResponse` (Task 1), `TriageWizard` (Task 11), `getCurrentUser` (existing), `SidebarNav` (existing).

- [ ] **Step 1: Create the shared `getTriageStatus` helper**

`apps/web/lib/get-triage-status.ts`:
```ts
import { cookies } from "next/headers"

import type { TriageStatusResponse } from "@workspace/types"

export async function getTriageStatus(): Promise<TriageStatusResponse> {
  const cookieStore = await cookies()

  const response = await fetch(`${process.env.API_INTERNAL_URL}/triage/status`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  })

  if (!response.ok) {
    return { completed: false, conversationId: null }
  }

  return (await response.json()) as TriageStatusResponse
}
```

- [ ] **Step 2: Rewrite the triage page to check status and render the wizard**

`apps/web/app/(protected)/triage/page.tsx` (full replacement):
```tsx
import { redirect } from "next/navigation"

import { SidebarNav } from "@/components/sidebar-nav"
import { TriageWizard } from "@/components/triage/triage-wizard"
import { getCurrentUser } from "@/lib/get-current-user"
import { getTriageStatus } from "@/lib/get-triage-status"

export default async function TriagePage() {
  const [user, status] = await Promise.all([getCurrentUser(), getTriageStatus()])

  if (status.completed && status.conversationId) {
    redirect(`/chat/${status.conversationId}`)
  }

  return (
    <div className="flex min-h-svh">
      <SidebarNav active="chat" userName={user?.name} />

      <main className="flex flex-1 items-center justify-center bg-background p-8">
        <TriageWizard />
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Create the `(chat)` gate layout**

`apps/web/app/(protected)/(chat)/layout.tsx`:
```tsx
import { redirect } from "next/navigation"

import { getTriageStatus } from "@/lib/get-triage-status"

export default async function ChatGateLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const status = await getTriageStatus()

  if (!status.completed) {
    redirect("/triage")
  }

  return children
}
```

- [ ] **Step 4: Move and rewrite the root page**

```bash
mkdir -p "apps/web/app/(protected)/(chat)"
git mv "apps/web/app/(protected)/page.tsx" "apps/web/app/(protected)/(chat)/page.tsx"
```

Replace the content of `apps/web/app/(protected)/(chat)/page.tsx` with:
```tsx
import { redirect } from "next/navigation"

import { getTriageStatus } from "@/lib/get-triage-status"

export default async function ChatIndexPage() {
  const status = await getTriageStatus()

  // The layout above already guarantees status.completed === true here.
  redirect(`/chat/${status.conversationId}`)
}
```

- [ ] **Step 5: Create the conversation shell page**

`apps/web/app/(protected)/(chat)/chat/[conversationId]/page.tsx`:
```tsx
import { cookies } from "next/headers"
import { notFound } from "next/navigation"

import type { ConversationResponse } from "@workspace/types"

import { SidebarNav } from "@/components/sidebar-nav"
import { getCurrentUser } from "@/lib/get-current-user"

async function getConversation(id: string): Promise<ConversationResponse | null> {
  const cookieStore = await cookies()

  const response = await fetch(`${process.env.API_INTERNAL_URL}/conversations/${id}`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  })

  if (!response.ok) {
    return null
  }

  return (await response.json()) as ConversationResponse
}

export default async function ChatConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>
}) {
  const { conversationId } = await params
  const [user, conversation] = await Promise.all([getCurrentUser(), getConversation(conversationId)])

  if (!conversation) {
    notFound()
  }

  return (
    <div className="flex min-h-svh">
      <SidebarNav active="chat" userName={user?.name} />

      <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-background px-8 py-12">
        <p className="text-2xl text-foreground">{conversation.triage.subject}</p>

        <div className="w-full max-w-4xl rounded-full bg-muted px-10 py-7 shadow-sm">
          <p className="text-2xl text-foreground/60">Como posso te ajudar?</p>
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 6: Verify**

Run: `rm -rf apps/web/.next && bun run typecheck --filter=web && bun run build --filter=web` (from repo root — clears any stale Next.js route-manifest types before checking, same fix applied during Sprint 2)
Expected: PASS, build lists `/`, `/chat/[conversationId]`, `/sobre`, `/triage`, `/sign-in`, `/sign-up` as routes.

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/get-triage-status.ts "apps/web/app/(protected)"
git commit -m "feat(web): gate chat behind triage completion, add /chat/[conversationId]"
```

---

## Task 13: End-to-end verification

**Files:** none.

- [ ] **Step 1: Full monorepo check**

Run (from repo root): `bun run typecheck && bun run lint && bun run test && bun run build`
Expected: all green.

- [ ] **Step 2: Start dev servers**

Run: `bun run dev` (background)
Expected: `apps/api` on :5173, `apps/web` on :3000.

- [ ] **Step 3: Manual flow via curl (mirrors the spec's verification list)**

```bash
# Sign up a fresh user, capture the cookie
curl -sS -c /tmp/triage-cookies.txt -X POST http://localhost:5173/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{"name":"Triage E2E","email":"triage-e2e@example.com","password":"senha12345"}'

# Direct GET / must NOT show chat — must redirect to /triage
curl -sS -b /tmp/triage-cookies.txt -o /dev/null -D - http://localhost:3000/ | head -5

# Start + fill + complete triage via the API directly (fast path to verify the backend independent of the UI)
TRIAGE_ID=$(curl -sS -b /tmp/triage-cookies.txt -X POST http://localhost:5173/triage | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
curl -sS -b /tmp/triage-cookies.txt -X PATCH "http://localhost:5173/triage/$TRIAGE_ID" \
  -H "Content-Type: application/json" \
  -d '{"subject":"Licitações e contratações","processStage":"Planejamento da contratação","contractType":"Pregão","doubtType":"Legislação","description":"Preciso entender melhor o prazo de recurso na fase de habilitação."}'
curl -sS -b /tmp/triage-cookies.txt -X POST "http://localhost:5173/triage/$TRIAGE_ID/complete"

# Re-fetch status — should now be completed with a conversationId
curl -sS -b /tmp/triage-cookies.txt http://localhost:5173/triage/status

# GET / again — should now redirect straight to /chat/:id (not /triage)
curl -sS -b /tmp/triage-cookies.txt -o /dev/null -D - http://localhost:3000/ | head -5

# Re-visiting /triage should also redirect to /chat/:id, not re-show the wizard
curl -sS -b /tmp/triage-cookies.txt -o /dev/null -D - http://localhost:3000/triage | head -5
```
Expected: `/` → `307` to `/triage` (before completion) → `307` to `/chat/<id>` (after); `/triage/status` → `{"completed":true,"conversationId":"..."}`; `/triage` (after completion) → `307` to `/chat/<id>`.

- [ ] **Step 4: Cross-tenant check**

```bash
curl -sS -c /tmp/triage-cookies-2.txt -X POST http://localhost:5173/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{"name":"Triage E2E 2","email":"triage-e2e-2@example.com","password":"senha12345"}'

curl -sS -b /tmp/triage-cookies-2.txt -o /dev/null -w "STATUS:%{http_code}\n" "http://localhost:3000/chat/$(cat /tmp/triage-cookies.txt | grep -o 'conversationId[^,}]*' || echo unknown)"
```
Confirm the second user gets Next's not-found page (not the first user's conversation).

- [ ] **Step 5: Clean up test data and stop dev servers**

Delete the `triage-e2e@example.com` / `triage-e2e-2@example.com` users + their orgs from the database (same pattern as Sprint 2 — via a `bun -e` script calling `prisma.user.delete`/`prisma.organization.delete`), then stop the background `bun run dev` process.

- [ ] **Step 6: Final commit (if Step 3 needed any fixes)**

```bash
git add -A
git commit -m "fix: address issues found during triage gate end-to-end verification"
```
(Skip if nothing needed fixing.)

---

## Self-Review Notes

- **Spec coverage:** every section of the design doc maps to a task — step content (Task 1), Triage API (Tasks 2–6), Conversation module (Task 7), wizard autosave/resume (Task 11), gate (Task 12), `/chat/[conversationId]` (Task 12), verification (Task 13). No spec requirement without a task.
- **Placeholder scan:** no TBD/TODO; every code step is complete, runnable code, not a description.
- **Type consistency checked:** `UpdateTriageStepUseCase.execute`'s 4th parameter type (`UpdateTriageBody` from `triage.model.ts`) matches what the controller passes (`body` typed by the same schema); `CompleteTriageUseCase`'s return shape `{ triage, conversation }` matches what `TriageWizard` (Task 11) destructures (`result.conversation.id`) and what `triage.test.ts` (Task 5) asserts on (`data.triage.status`, `data.conversation.triageId`); `GetTriageStatusUseCase`'s `{ completed, conversationId }` shape matches `TriageStatusResponse` (Task 1) and every consumer (`get-triage-status.ts`, `(chat)/layout.tsx`, `(chat)/page.tsx`, `triage/page.tsx`).
