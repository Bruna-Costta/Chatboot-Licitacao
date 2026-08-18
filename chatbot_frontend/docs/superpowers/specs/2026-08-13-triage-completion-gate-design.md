# Triage Completion + Chat Gate — Design

**Status:** Approved
**Date:** 2026-08-13

## Context

The Triage wizard (`apps/web/app/(protected)/triage/page.tsx`) is currently pure static markup: it only ever renders step 1, its options have no `onClick`/state, and there is no Triage API in `apps/api`. Nothing server-side stops an authenticated user from navigating straight to `/` (the chat placeholder) without ever completing triage — `proxy.ts` only checks for a session cookie, and `SignInUseCase`'s `redirectTo` (built in Sprint 2) is advisory only, not enforced.

This work makes the Triage wizard fully functional and persisted, and adds a real server-side gate so an authenticated user with no completed Triage cannot reach the chat surface. It corresponds to PRD Sprint 3 (§16), plus the chat-gating requirement from the current request. Full chat send/receive (Sprint 4) stays out of scope — only enough of the Conversation domain is touched to give the post-triage redirect a real destination.

## Decisions

- **Redirect target after triage completion**: a new `/chat/[conversationId]` route is built now (not just the existing static `/`), showing a real conversation shell. Message send/receive remains non-functional (Sprint 4).
- **Steps 1-3 content**: fixed single-select options (not free text), defined below — aligned to PRD §1's own stated problem domains rather than the placeholder options currently in the mock.
- **Recurring triage**: explicitly out of scope. Once `Triage.status = COMPLETED`, it is never forced again for that user.
- **Autosave**: each wizard step persists via `PATCH /triage/:id` as the user advances, so a refresh mid-wizard does not lose progress (satisfies RF-13's "resume where left off").
- **Resume step**: derived (first step whose required field is still empty), no new `currentStep` column added to the `Triage` model.

## Step content (final)

| Step | Field | Options |
|---|---|---|
| 1 — Assunto | `subject` | Licitações e contratações · Contratos administrativos · Fiscalização de contratos · eSfinge / TCE-MS |
| 2 — Etapa do processo | `processStage` | Planejamento da contratação · Publicação e disputa (edital/sessão) · Habilitação e julgamento · Execução e fiscalização do contrato |
| 3 — Tipo de contratação | `contractType` | Pregão · Concorrência · Dispensa de licitação · Inexigibilidade · Outra modalidade |
| 4 — Natureza da dúvida | `doubtType` | Legislação · Procedimento · eSfinge · Documentos · Não sei |
| 5 — Descrição livre | `description` | free text, 10–2000 chars (RF-11) |

`doubtType` → `semanticDimension` mapping (computed backend-only, RF-12, per PRD §7.2 / CLAUDE.md):

| doubtType | semanticDimension |
|---|---|
| Legislação | `NORMATIVE` |
| Procedimento | `OPERATIONAL` |
| eSfinge | `OPERATIONAL` |
| Documentos | `DOCUMENTAL` |
| Não sei | `UNCERTAIN` |

No Prisma schema changes — `Triage` already has all five fields plus `status`/`semanticDimension`/`completedAt` from Sprint 1.

## `apps/api/src/modules/triage/`

Clean Architecture layers, mirroring the existing `modules/auth/` module shape (`*.controller.ts` / `*.model.ts` / `application/*.use-case.ts` / `domain/*.errors.ts`).

- `POST /triage` — `StartTriageUseCase`: creates a Triage row with `status: IN_PROGRESS`, `organizationId`/`userId` from session only. If an `IN_PROGRESS` triage already exists for the user, returns that one instead of creating a duplicate (idempotent start).
- `PATCH /triage/:id` — `UpdateTriageStepUseCase`: updates one or more of `subject`/`processStage`/`contractType`/`doubtType`/`description`. 404 (not 403) if the triage doesn't belong to the session's `organizationId`+`userId` (Golden Rule — never reveal existence of another org's data). No-ops on `status`/`semanticDimension`/`completedAt` — those are never client-settable.
- `POST /triage/:id/complete` — `CompleteTriageUseCase` (name matches CLAUDE.md's Application-layer example list exactly). Validates every field is present and `description` is 10–2000 chars (422 with field-level messages otherwise). Computes `semanticDimension` from `doubtType` server-side. Inside a single `prisma.$transaction`: sets `status: COMPLETED`, `completedAt: now()`, `semanticDimension`, and creates a `Conversation` row (`organizationId`, `userId`, `triageId` from the just-completed triage, `status: ACTIVE`). Returns `{ triage, conversation }`. Transaction prevents a COMPLETED triage ever existing without its Conversation, or vice versa.
- `GET /triage/status` — `GetTriageStatusUseCase`: cheap read used by the gate. Returns `{ completed: boolean, conversationId: string | null }` — the most recent `COMPLETED` triage's linked conversation, or `null` if none/still in progress.
- `GET /triage` — `GetActiveTriageUseCase`: returns the user's `IN_PROGRESS` triage if one exists (for the wizard to prefill on load/resume), else `null`.

All five routes require the existing `authPlugin` macro (`{ auth: true }`) from `@workspace/auth/server` — organizationId/userId always come from `user`, never from params or body.

## `apps/api/src/modules/conversations/` (new, minimal)

Only what the new chat shell route needs:

- `GET /conversations/:id` — `GetConversationUseCase`: scoped by session `organizationId`+`userId` (404 if not the caller's), returns the conversation plus its linked Triage's context fields (for the chat page to eventually pass to `AIProvider`) and an empty `messages: []` (no `Message` rows exist yet — nothing sends them until Sprint 4).

`POST /conversations`, `DELETE /conversations/:id`, and all of `/conversations/:id/messages` are explicitly deferred to Sprint 4.

## `packages/types` additions

- `TriageStepInput` (partial, matches `PATCH` body shape)
- `TriageResponse`, `TriageStatusResponse`
- `ConversationResponse` (id, title, status, triage context, empty messages array)

## Frontend wizard (`apps/web`)

`components/triage/triage-wizard.tsx` (`"use client"`): one `useForm` (RHF + zod) covering all 5 fields; `form.trigger([...fieldsForCurrentStep])` validates only the active step before allowing "Avançar" (same pattern as `sign-up-form.tsx`/`sign-in-form.tsx`). On mount: `GET /triage` — if `null`, `POST /triage` to create the `IN_PROGRESS` row; if present, prefill the form and jump to the first step whose field is still empty. Each successful step-advance fires `PATCH /triage/:id` with just that step's field (autosave). Step 5's "Concluir" calls `POST /triage/:id/complete`, then `router.push(`/chat/${conversation.id}`)`. Server-side (422) and client-side validation errors both render via the existing `Alert`/`FormMessage` components.

Steps 1–4 render as the existing button-list UI (single-select, `aria-pressed`/highlight on selection) already established by the current mock's visual style — just wired to real state instead of dead markup. Step 5 is a `Textarea` (new shadcn component — none exists yet, generated into `packages/ui` same as the others) with a live character counter (10–2000).

## Gate

- `proxy.ts` — unchanged (auth-cookie-presence only).
- New nested route group `app/(protected)/(chat)/` wraps `page.tsx` (`/`) and the new `chat/[conversationId]/page.tsx`. Its `layout.tsx` calls `GET /triage/status` (server-side, cookie-forwarded like `get-current-user.ts`); if `completed === false`, `redirect("/triage")`. `/sobre` and `/triage` itself stay outside this group — always reachable to any authenticated user regardless of triage state.
- `triage/page.tsx` — checks `GET /triage/status` on load: if `completed === true`, `redirect(`/chat/${conversationId}`)` immediately (wizard never re-shown once done).

## `/chat/[conversationId]/page.tsx` (new)

Server component: `GET /conversations/:id` (cookie-forwarded); Next.js `notFound()` on 404 (not-your-conversation or doesn't exist — Golden Rule, never a generic 200). Renders the same visual shell as today's static `/` placeholder, now backed by real `Conversation`/`Triage` data. Message input stays visually present but inert (`disabled`) — actual send/receive is Sprint 4.

`/` (`(chat)/page.tsx`): once past the gate (triage guaranteed complete), redirects to `/chat/${status.conversationId}` — the root URL never renders its own chat UI once a conversation exists; it exists solely as the gate's entry point today the gate `layout.tsx` already resolves `conversationId` in `GET /triage/status`, so `page.tsx` reuses it rather than re-fetching.

## Testing / Verification

1. Sign up a fresh user → land on `/triage` (existing Sprint 2 behavior).
2. Attempt `GET /` directly (authenticated, no triage) → redirected to `/triage`.
3. Answer steps 1–4, refresh the browser mid-wizard → wizard resumes at the correct step with prior answers intact (proves autosave).
4. Submit step 5 with description under 10 chars → clear client-side error, no request sent.
5. Complete step 5 validly → `POST /triage/:id/complete` → `Triage.status=COMPLETED`, `semanticDimension` set correctly per the mapping table, one `Conversation` row created, redirected to `/chat/:id`.
6. Reload `/triage` → immediately redirected to `/chat/:id` (wizard not re-shown).
7. Reload `/` → redirected to `/chat/:id` (not blocked, not re-triaged).
8. Second user (different org) attempts `GET /chat/<first-user's-conversation-id>` → 404.
9. `bun run typecheck && bun run lint && bun run build` clean across all workspaces.

## Explicitly out of scope

Message send/receive and `AIProvider` wiring, `POST /conversations` (manual "new chat"), conversation history/sidebar list, recurring/expiring triage, any change to `proxy.ts`'s edge-level logic.
