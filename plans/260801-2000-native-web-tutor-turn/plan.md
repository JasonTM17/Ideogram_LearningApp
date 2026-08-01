---
title: "Native and Web Tutor Turn Experience"
description: "Connect the existing authenticated bounded AI tutor turn to the web and Expo assistant surfaces through one validated API-client boundary."
status: in_progress
priority: P1
effort: "3–5 engineer-days"
branch: "main"
tags: [ai, tutor, mobile, web, api-client, accessibility]
blockedBy:
  - "Grounded retrieval and direct SSE remain later Phase 6 work."
blocks:
  - "Mobile tutor history, offline queue, and grounded lesson context."
created: "2026-08-01"
createdBy: "ck:plan"
source: skill
---

# Native and Web Tutor Turn Experience

## Scope

Replace the web and Expo assistant placeholders with a bounded JSON tutor-turn
experience backed by the already shipped authenticated route. Share request
construction and receipt parsing through `@ideogram/api-client`, while keeping
web cookie auth and native bearer auth in their existing boundaries.

## Phases

| Phase | Name | Status |
| --- | --- | --- |
| 1 | [Shared Tutor API Client](./phase-01-shared-tutor-api-client.md) | In Progress |
| 2 | [Web and Expo Assistant](./phase-02-web-mobile-assistant.md) | Pending |
| 3 | [Validation and Documentation](./phase-03-validation-and-docs.md) | Pending |

## Acceptance criteria

1. The shared API client validates the public tutor request, sends only the
   versioned JSON envelope, parses the receipt schema, and exposes stable
   HTTP/session/abort errors without importing server-only AI code.
2. The Expo assistant accepts Vietnamese learner input, generates stable UUIDs
   for conversation/turn identity, submits through the session-bound native
   client, renders every bounded response section, and handles loading, retry,
   auth/session change, timeout, offline/network and `503` states truthfully.
3. The web assistant sends the same request through the browser cookie session,
   renders the same six response sections, preserves the selected preference
   for the current component session, and never claims that the response is
   grounded in a lesson.
4. Empty/oversized/invalid input is rejected before a network call; duplicate
   submission is disabled while pending; abort/account-switch cannot commit a
   stale response to the next session.
5. Focused unit/component tests cover request contract, native client transport,
   web state transitions, mobile state transitions, accessibility labels and
   all safe error states. Existing full workspace gates remain green.

## Explicitly out of scope

- Direct SSE/streaming transport, grounded retrieval/source citations, durable
  chat history, save-to-review side effects, offline mutation queues, audio,
  push notifications, and production AI enablement.
- Changes to Supabase schema or the existing turn ledger contract.

## File ownership

- Phase 1: `packages/api-client/src/ai/*`, `packages/api-client/src/native/*`
  and related API-client tests/exports.
- Phase 2: `apps/mobile/src/features/assistant/*`,
  `apps/web/src/features/ai/*`, and their route-level tests.
- Phase 3: this plan's reports, relevant API/AI/mobile docs, and validation
  only; no unrelated formatting or generated assets.

## Quality gates

- `pnpm --filter @ideogram/api-client test`
- `pnpm --filter @ideogram/mobile test`
- `pnpm --filter @ideogram/web test`
- `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm format:check`,
  `pnpm check:boundaries`, `pnpm check:env`, `pnpm content:lint`, and docs
  validation.
- CK code review must verify public contracts, session fencing, accessibility,
  and no server-only import leakage before commit/push.
