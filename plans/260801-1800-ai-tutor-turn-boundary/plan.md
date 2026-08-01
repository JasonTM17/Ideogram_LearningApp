---
title: Authenticated AI Tutor Turn Boundary
description: ''
status: in-progress
priority: P1
branch: main
tags: []
blockedBy: []
blocks: []
created: '2026-08-01T11:21:53.874Z'
createdBy: 'ck:plan'
source: skill
---

# Authenticated AI Tutor Turn Boundary

## Overview

Create the first production AI boundary without opening an untracked chat surface: an
authenticated, non-streaming tutor turn with server-owned identity, strict contracts,
atomic idempotency/quota reservations, token/cost accounting, provider failure states,
and deletion cleanup. Grounded lesson-context retrieval, SSE transport, mobile UI, and
long-lived personalization remain explicit follow-up phases.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Contract and Policy](./phase-01-contract-and-policy.md) | Completed |
| 2 | [Database Turn Ledger](./phase-02-database-turn-ledger.md) | Completed |
| 3 | [Authenticated Tutor Route](./phase-03-authenticated-tutor-route.md) | Completed |
| 4 | [Validation and Documentation](./phase-04-validation-and-documentation.md) | In Progress |

## Dependencies

Phase 1 defines the public request/receipt and fail-closed provider policy. Phase 2
adds the private ledger and purge trigger. Phase 3 composes authentication, ledger,
provider, and safe HTTP errors. Phase 4 runs focused and workspace gates and updates
docs only to describe verified behavior.

## Acceptance criteria

- Every tutor turn is bound to a verified user, UUID turn/conversation, canonical
  payload hash, and active learner account inside the database boundary.
- Exact retries replay one completed receipt; mismatched payloads and concurrent work
  fail closed without a second provider call.
- Hourly turn/cost reservations are atomic; provider usage and estimated cost are
  persisted without returning secrets or raw provider errors.
- Disabled/misconfigured AI, inactive accounts, missing provider-consent, invalid
  language/level pairs, and quota exhaustion never reach DeepSeek.
- Account deletion trigger removes conversations, turns, and rate windows in the same
  purge transaction.
- `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm format:check`, and
  documentation validation pass before the final focused commits are pushed.
