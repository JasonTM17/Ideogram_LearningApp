# Review and Sync Contract

## Purpose

This document explains how learner actions will synchronize across client,
database, and worker boundaries. Auth/catalog reads and protected SSR learner
pages exist; review submission, scoped server-evaluated activity submission,
and the first vocabulary acknowledgement activity slice are wired, but
placement, broader interactive lesson/review flows, and client synchronization
are still not wired.

## Runtime boundaries

| Runtime                     | Allowed work                                                               |
| --------------------------- | -------------------------------------------------------------------------- |
| Web / mobile client         | Learner writes call the app route layer only after the active learner gate |
| Next.js write routes        | Activity/review submission for verified bearer or cookie sessions          |
| `app_learning_api_executor` | Learner-safe placement, activity, review, and enrollment writes            |
| `service_role`              | Placement scoring and privacy purge only                                   |

## Client retry behavior

- The web vocabulary activity view keeps the exact pending input in memory for
  retry until a receipt or terminal error clears it. It does not expose the
  pending body in storage.
- The browser activity-operation identity adapter resolves `localStorage`
  lazily, fails closed when storage or UUID generation is unavailable, and does
  not promise cross-tab locking.
- The native vocabulary activity screen binds request cancellation to the
  session lifecycle. A stopped, session-changed, or unmounted request does not
  update stale UI.
- Operation identity is replay metadata only. Authorization, release access,
  and evaluator decisions remain server-owned.

## Learner-safe operations

| Helper                                           | Semantics                                                                                                            |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `private.start_placement_session()`              | Creates a draft placement session for an owned learner                                                               |
| `private.record_placement_answer()`              | Records a placement answer with idempotency and device sequencing                                                    |
| `private.submit_placement_session()`             | Submits a draft session after at least one answer exists                                                             |
| `private.evaluate_and_submit_activity_attempt()` | Reads private activity content, evaluates a supported response, then persists it                                     |
| `private.submit_activity_attempt()`              | Internal persistence helper; app executor cannot call it directly                                                    |
| `private.submit_review_event()`                  | Records a review event and advances the schedule deterministically; now surfaced through the review submission route |

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

## Activity submission transaction

`POST /api/v1/learning/activities/submit` shares the verified-session,
same-origin, bounded-body, transaction-timeout, and active-learner checks with
review submission. The route hashes the canonical public input and calls only
`private.evaluate_and_submit_activity_attempt()`.

1. The evaluator obtains the per-learner advisory lock before it reads an
   idempotency record and rechecks the active release plus enrollment before
   returning any prior result.
2. An identical retry returns its immutable original activity receipt without
   repeating progress work; a mismatched retry or reused device sequence fails
   with `409`.
3. The evaluator loads the published activity payload inside the database. It
   accepts only exact vocabulary acknowledgement and complete objective
   listening answer maps today.
4. For listening, option membership and the correct answer are checked against
   private content. The client never sends completion state, score, evaluator
   version, or answer keys.
5. Unsupported activity types, including speaking and writing, return a safe
   conflict until an asynchronous grading lifecycle is implemented.

## Shared activity operation identity boundary

The shared learning client owns the generic identity primitive; native and web
apps provide their platform storage adapters:

- Expo SecureStore retains one device-only UUID and the next monotonic sequence;
  a document-directory installation sentinel clears retained iOS keychain state
  when a fresh installation is detected.
- A sequence is persisted before the identity reservation returns, so a storage failure does
  not expose an operation identifier that may later be reused.
- Concurrent reservations in one JavaScript runtime serialize across store
  instances; a future headless/background writer needs a transactional counter.
- The identity is an idempotency/replay coordinate only; bearer session checks,
  learner authorization, release access, and evaluation remain server-owned.
- No durable queue, retry scheduler, or reconciliation is included yet. An
  offline operation must not be considered complete until the server receipt is
  accepted by the later queue phase. The current vocabulary slice keeps retry
  state in memory only.

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
- `private.evaluate_and_submit_activity_attempt()` returns an existing receipt
  only after matching all public inputs and the current access checks. Its
  private receipt snapshot does not change when later activity attempts update
  the same lesson, and it does not re-evaluate an accepted retry when evaluator
  logic changes later.
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
| Same activity attempt replay            | Original activity receipt and progress   |
| Same review event replay                | Original review receipt and schedule     |
| Worker purge retry after receipt exists | Recorded purge counts are returned again |
| New mutation after archive              | Rejected                                 |

## Related docs

- [API contract](./api-contract.md)
- [Learning engine contract](./learning-engine-contract.md)
- [Content governance](./content-governance.md)
