# Review and Sync Contract

## Purpose

This document explains how learner actions will synchronize across client,
database, and worker boundaries. Auth/catalog reads and protected SSR learner
pages exist; `POST /api/v1/learning/reviews/submit` now wires the first learner
write route, but placement, activity, the other review flows, and client
synchronization are still not wired.

## Runtime boundaries

| Runtime                     | Allowed work                                                                     |
| --------------------------- | -------------------------------------------------------------------------------- |
| Web / mobile client         | Future action writes call the app route layer only after the active learner gate |
| Next.js review route        | `POST /api/v1/learning/reviews/submit` for verified bearer or cookie sessions    |
| `app_learning_api_executor` | Learner-safe placement, activity, review, and enrollment writes                  |
| `service_role`              | Placement scoring and privacy purge only                                         |

## Learner-safe operations

| Helper                               | Semantics                                                                                                            |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `private.start_placement_session()`  | Creates a draft placement session for an owned learner                                                               |
| `private.record_placement_answer()`  | Records a placement answer with idempotency and device sequencing                                                    |
| `private.submit_placement_session()` | Submits a draft session after at least one answer exists                                                             |
| `private.submit_activity_attempt()`  | Records an activity attempt and recomputes lesson progress                                                           |
| `private.submit_review_event()`      | Records a review event and advances the schedule deterministically; now surfaced through the review submission route |

## Review submission transaction

The review route keeps the public payload small and the write boundary private:

1. The client sends the exact `reviewSubmissionInputSchema` body.
2. The route validates the session, parses the body, and computes the canonical
   SHA-256 payload hash from the public input only.
3. The route opens a transaction with `app_learning_api_executor`, bounded
   statement and lock timeouts, and the same-origin policy already enforced by
   the mutation policy layer.
4. `private.require_active_learning_account()` locks the learner-role row and
   then the profile row, matching the revocation-trigger order so concurrent
   revocation becomes visible without a deadlock cycle.
5. `private.submit_review_event()` appends the event and returns the receipt.
6. The response body exposes only the public receipt contract:

| Receipt field               | Meaning                                                          |
| --------------------------- | ---------------------------------------------------------------- |
| `eventId`                   | Server-assigned review event UUID                                |
| `idempotentReplay`          | Whether the server returned an existing receipt                  |
| `schedule.algorithmVersion` | Scheduler version used for the next interval                     |
| `schedule.dueAt`            | Next review due time                                             |
| `schedule.easeFactor`       | Persisted ease factor                                            |
| `schedule.intervalMinutes`  | Next interval; always positive in the receipt                    |
| `schedule.lapseCount`       | Persisted lapse count                                            |
| `schedule.repetitionCount`  | Persisted repetition count                                       |
| `schedule.state`            | Review state: `learning`, `review`, `relearning`, or `suspended` |
| `serverReceiptSequence`     | Monotonic receipt sequence for ordering                          |

## Worker-only operations

| Helper                                  | Semantics                                                      |
| --------------------------------------- | -------------------------------------------------------------- |
| `private.score_placement_session()`     | Writes the internal placement recommendation and confidence    |
| `private.get_placement_scoring_input()` | Reads the rubric and answer data needed for scoring            |
| `private.purge_learner_learning_data()` | Deletes learner learning state and writes an auditable receipt |

## Idempotency and retry rules

- Reusing the same idempotency key with the same payload returns the original
  receipt.
- Reusing the same idempotency key with a different payload fails.
- Device sequence numbers must stay unique per learner operation stream.
- `private.record_placement_answer()` keeps replaying safely even after session
  submission, but new answers still require a draft session.
- `private.submit_placement_session()` returns the already submitted or scored session
  if the call is replayed.
- `private.submit_review_event()` uses the database receipt sequence, so retries do not
  double-count progress.
- The web learner shell now checks active profile and learner role state before any of these helpers are reachable from the browser.
- The review submission route re-checks the active learner profile and learner
  role inside the mutation transaction before the private helper runs.
- Replays return the original receipt; idempotency-key or device-sequence
  conflicts surface as `409` rather than appending a duplicate event.

## Archive behavior

When a content release is archived:

- review items in that release are suspended
- active and paused enrollments are archived
- existing history is preserved
- new learner mutations are rejected

This is important for sync because an offline retry must fail closed once the
source release is no longer active.

## Retry expectations

| Scenario                                | Expected result                          |
| --------------------------------------- | ---------------------------------------- |
| Same placement answer replay            | Original placement answer receipt        |
| Same review event replay                | Original review receipt and schedule     |
| Worker purge retry after receipt exists | Recorded purge counts are returned again |
| New mutation after archive              | Rejected                                 |

## Related docs

- [API contract](./api-contract.md)
- [Learning engine contract](./learning-engine-contract.md)
- [Content governance](./content-governance.md)
