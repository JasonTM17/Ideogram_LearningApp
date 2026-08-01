---
title: "Native Activity Operation Foundation"
description: "Harden the native activity write boundary and install-scoped operation identity before enabling interactive lesson UI."
status: completed
priority: P1
branch: "main"
tags: []
blockedBy: []
blocks: []
created: "2026-08-01T10:20:24.571Z"
createdBy: "ck:plan"
source: skill
---

# Native Activity Operation Foundation

## Overview

This slice makes the mobile write path safe to build on: the shared native
client can send the already-authorized activity submission contract, catalog
lesson contexts retain the published release identity required by that
contract, and the app can durably allocate a per-install device identity plus
monotonic sequence. It does not turn the current review-only catalog into a
fake interactive experience and it does not implement a durable mutation queue;
Phase 7 remains the owner of offline queue/reconciliation.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Native Transport and Catalog Context](./phase-01-native-transport-and-catalog-context.md) | Completed |
| 2 | [Durable Operation State](./phase-02-durable-operation-state.md) | Completed |
| 3 | [Tests and Documentation](./phase-03-tests-and-documentation.md) | Completed |

## Dependencies

Depends on the authenticated native session and the server-evaluated
`POST /api/v1/learning/activities/submit` boundary already present on `main`.
The output unblocks the later mobile activity runner; it does not replace the
Phase 7 queue contract or the Phase 6 AI feature plan.

## Scope decisions

- Preserve the server-owned evaluator: no score, answer key, or correctness
  state is added to client contracts.
- Keep retry identity in the active operation object. Persist only the
  install-scoped `deviceId` and the next sequence number in this slice; a
  crash-safe pending queue belongs to Phase 7.
- Keep browser lesson pages review-only until a browser operation store and
  client mutation boundary are designed and tested separately.

## Acceptance evidence

- Native POST sends the exact validated body, bearer session, JSON headers,
  redirect rejection, timeout and session-epoch checks already required by the
  GET transport.
- Web and native lesson contexts expose `contentReleaseId` from the published
  catalog without deriving learner progress.
- Concurrent identity reservations serialize, survive a restart, reject
  corrupted persisted state, and never return a reused sequence.
- Focused tests, workspace typecheck/lint/test/build, and documentation-link
  validation pass before the commits are pushed.
