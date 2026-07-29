# Learning Engine Contract

## Purpose

This document records the verified scheduling and persistence contract for the
review engine. The contract is database-first: the scheduler state lives in
Postgres, and the server helpers write deterministic events into that state.

## What is implemented

- `public.review_items` holds the current schedule state.
- `public.review_events` holds the append-only event log.
- `private.submit_review_event()` is the current learning write helper for SRS.
- `packages/learning-engine` holds the pure scheduling helpers and tests.

## Scheduling rules

| Rule              | Verified behavior                                           |
| ----------------- | ----------------------------------------------------------- |
| Algorithm version | `srs-v1` only                                               |
| Clock source      | Server UTC clock, not client wall clock                     |
| Payload size      | Bounded JSON payloads; review input is capped before insert |
| Idempotency       | Same key + same payload returns the original receipt        |
| Replay safety     | Same key + different payload is rejected                    |
| History           | Review events are append-only                               |
| Receipt order     | Server receipt sequence is assigned by the database         |

## Grade transitions

| Grade   | Main effect                                                                        |
| ------- | ---------------------------------------------------------------------------------- |
| `again` | Moves the item to relearning with a 10 minute interval and a lower ease factor     |
| `hard`  | Keeps the item in review with a floor at one day when the current interval is zero |
| `good`  | Advances the item; relearning items move to learning with a 20 minute interval     |
| `easy`  | Extends the interval more aggressively, still capped by the max interval limit     |

Important edge cases already covered by tests:

- a zero-interval item can re-enter the relearning path
- a relearning item can recover into learning with a 20 minute interval on `good`
- the scheduler never uses client timestamps as authoritative state
- duplicate event replay does not double-count progress

## Persistence contract

The database stores both the previous schedule and the next schedule so future
algorithm versions can be replayed and audited later. That is deliberate: the
event history is the source of truth, not a recalculated guess.

## Access boundaries

| Caller                      | Allowed surface                         | Notes                                   |
| --------------------------- | --------------------------------------- | --------------------------------------- |
| `app_learning_api_executor` | Learner-facing review submission helper | Trusted app boundary for learner writes |
| `service_role`              | Worker-only scoring and purge helpers   | Not used for direct learner writes      |
| Browser/mobile client       | None directly                           | Must go through the app boundary        |

## What is not in scope yet

- Adaptive/FSRS tuning beyond the current deterministic baseline
- AI tutor personalization logic
- Route handlers for `/api/v1/learning/*`
- Offline conflict resolution outside the current idempotency rules

## Related docs

- [API contract](./api-contract.md)
- [Review and sync contract](./review-and-sync-contract.md)
- [Content governance](./content-governance.md)
