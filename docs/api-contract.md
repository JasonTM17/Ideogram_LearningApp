# API Contract

## Current implemented endpoints

| Method | Path                                 | Auth / boundary                                                                                   | Request                                        | Response                                 | Status      |
| ------ | ------------------------------------ | ------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------- | ----------- |
| GET    | `/api/v1/health`                     | None                                                                                              | None                                           | Shared health contract                   | Implemented |
| GET    | `/api/v1/learning/catalog`           | Verified Supabase bearer token or SSR cookie session                                              | None                                           | Shared learner-catalog response contract | Implemented |
| POST   | `/api/v1/learning/activities/submit` | Verified Supabase bearer token or SSR cookie session; cookie mutations require same-origin policy | JSON body with `activityAttemptInputSchema`    | Shared activity receipt contract         | Implemented |
| POST   | `/api/v1/learning/reviews/submit`    | Verified Supabase bearer token or SSR cookie session; cookie mutations require same-origin policy | JSON body with `reviewSubmissionInputSchema`   | Shared review receipt contract           | Implemented |
| POST   | `/api/v1/auth/email-otp`             | Same-origin cookie mutation; no verified session required                                         | JSON body with `email` and optional `returnTo` | Generic accepted response (`202`)        | Implemented |
| GET    | `/auth/callback`                     | Browser PKCE callback; handles optional `sb_flow_id`                                              | `code` plus optional `sb_flow_id` query values | Safe `303` redirect                      | Implemented |
| POST   | `/api/v1/auth/sign-out`              | Verified cookie session only; bearer rejected                                                     | Empty JSON object                              | Generic signed-out response (`200`)      | Implemented |

## Health response shape

Shared contract source: `packages/contracts/src/api.ts`

| Field       | Value                   |
| ----------- | ----------------------- |
| `service`   | `ideogram-learning-api` |
| `status`    | `ok`                    |
| `timestamp` | ISO string              |
| `version`   | `v1`                    |

The route handler at `apps/web/src/app/api/v1/health/route.ts` returns this shared health contract via `Response.json(...)`.
The auth lifecycle routes live under `apps/web/src/server/auth/*` and use route-specific envelopes or redirects rather than the shared health response shape.

The catalog route at `apps/web/src/app/api/v1/learning/catalog/route.ts` authenticates the request with Supabase Auth verification, reads the allowlisted aggregate RPC `public.get_learner_catalog_data()`, and returns the shared learner-catalog contract through `jsonNoStore(...)`.
The activity submission route at `apps/web/src/app/api/v1/learning/activities/submit/route.ts` authenticates first, validates the public activity envelope, and calls the database evaluator through the private transaction boundary.
The review submission route at `apps/web/src/app/api/v1/learning/reviews/submit/route.ts` authenticates first, validates the exact review schema, and writes through the private transaction boundary with private no-store headers and an opaque request ID.

## Shared API error shape

`packages/contracts/src/api.ts` defines the shared error payload shape used by the catalog route:

- `code`
- `message`
- `requestId`

The catalog route returns that shape on 401 and 503 responses. It also emits the same opaque request ID in `X-Request-Id`, together with private no-store cache headers.
The JSON auth routes use the same shared error envelope on failure; the callback route redirects instead of returning the JSON error body.

## Auth endpoint notes

- Email OTP accepts only exact-shape JSON, enforces the 65,536-byte mutation
  body cap and exact same-origin policy, and returns the same generic `202`
  envelope for account-specific provider rejections. App-local throttling can
  return `429` with `Retry-After`; provider/config outages return `503`.
- Callback accepts one code and at most one ASCII `sb_flow_id`, rejects
  token-bearing or duplicate queries, consumes a bounded callback-scoped return
  cookie, and sends `Referrer-Policy: no-referrer` on every redirect.
- Sign-out accepts only an empty JSON object from a verified same-origin cookie
  session and uses Supabase local scope. It is not global revocation or account
  deletion.

## Review submission notes

- `POST /api/v1/learning/reviews/submit` accepts only the exact
  `reviewSubmissionInputSchema` body:
  - `deviceId`
  - `deviceSequence`
  - `grade`
  - `idempotencyKey`
  - `itemId`
  - `reviewedAtClient`
  - `timezone`
- The route enforces the 65,536-byte JSON body cap and the same cookie-origin
  policy used by the other mutation routes; bearer requests do not require a
  browser Origin header.
- The server computes the canonical SHA-256 hash from
  `serializeReviewSubmissionForIdempotency(input)` before calling the private
  database helper.
- The route re-checks the active learner profile and learner role inside the
  mutation transaction before the helper runs, so a revoked role fails closed.
- The transaction boundary uses the server-only `LEARNING_DATABASE_URL` login,
  starts a transaction, `SET LOCAL ROLE app_learning_api_executor`, `SET LOCAL
statement_timeout = '5s'`, and `SET LOCAL lock_timeout = '2s'`.
- The database helper locks the active learner-role row and then the profile row
  through `private.require_active_learning_account(user_id)` before appending
  any review event; this `public.account_roles` before
  `public.profiles` to match the revocation path and avoid deadlocks.
- Successful replays return the original receipt; payload mismatches and device
  sequence reuse fail closed with `409`.
- Safe error mapping keeps not-found, forbidden, validation, and unavailability
  responses opaque while preserving the shared `requestId` and no-store
  headers.

### Review receipt contract

The route returns the shared receipt shape below on success:

| Field                       | Meaning                                                                  |
| --------------------------- | ------------------------------------------------------------------------ |
| `eventId`                   | Server-assigned review event UUID                                        |
| `idempotentReplay`          | `true` when the server returned an existing receipt for the same payload |
| `serverReceiptSequence`     | Monotonic server receipt sequence for ordering                           |
| `schedule.algorithmVersion` | Scheduler version used to compute the next interval                      |
| `schedule.dueAt`            | Next review due time in ISO-8601 format                                  |
| `schedule.easeFactor`       | Persisted ease factor after the review                                   |
| `schedule.intervalMinutes`  | Next interval in minutes; positive for all post-review receipts          |
| `schedule.lapseCount`       | Persisted lapse count                                                    |
| `schedule.repetitionCount`  | Persisted repetition count                                               |
| `schedule.state`            | Review item state: `learning`, `review`, `relearning`, or `suspended`    |

Status behavior:

| HTTP status | Meaning                                                 |
| ----------- | ------------------------------------------------------- |
| `200`       | Review accepted or safely replayed                      |
| `400`       | Body shape or review payload invalid                    |
| `403`       | Learner account or role rejected inside the transaction |
| `404`       | Review item no longer available                         |
| `409`       | Idempotency key or device sequence conflict             |

## Activity submission notes

- `POST /api/v1/learning/activities/submit` accepts the exact
  `activityAttemptInputSchema` envelope: `activityId`, `contentReleaseId`,
  `deviceId`, `deviceSequence`, `idempotencyKey`, `responsePayload`,
  `reviewedAtClient`, and `timezone`. Server-owned completion, score, and
  evaluator-version fields are rejected at the HTTP contract boundary.
- The route applies the same 65,536-byte body cap, bearer/cookie authentication,
  origin rules, no-store headers, opaque request ID, transaction timeouts, and
  active-learner reauthorization as review submission.
- The Next.js repository computes the canonical SHA-256 from
  `serializeActivityAttemptForIdempotency(input)`. It calls
  `private.evaluate_and_submit_activity_attempt()`, never the raw persistence
  helper directly.
- The database reads the published server payload and currently supports only
  exact vocabulary acknowledgement (`{"acknowledged":true}`) and objective
  listening answers (`{"answers":{"questionId":"optionId"}}`). Listening
  scores come only from the private answer key. Speaking, writing, and other
  activity types return a safe `409` until their evaluators are designed.
- `private.submit_activity_attempt()` remains an internal persistence helper;
  `app_learning_api_executor` has no execute permission on it. The evaluator
  serializes each learner before inspecting an idempotency record, rechecks the
  active published release and enrollment for every retry, then returns the
  original immutable receipt only when every public input matches.

### Activity receipt contract

| Field                    | Meaning                                                             |
| ------------------------ | ------------------------------------------------------------------- |
| `attemptId`              | Server-assigned activity attempt UUID                               |
| `idempotentReplay`       | `true` when the identical submission returned its original receipt  |
| `lessonId`               | Lesson whose progress was recomputed                                |
| `completionState`        | Evaluator-owned result: `submitted`, `completed`, or `needs_review` |
| `progressState`          | Current lesson state after the attempt                              |
| `completedActivityCount` | Completed activities in that lesson                                 |
| `totalActivityCount`     | Total published activities in that lesson                           |

Status behavior:

| HTTP status | Meaning                                                           |
| ----------- | ----------------------------------------------------------------- |
| `200`       | Activity evaluated and persisted, or safely replayed              |
| `400`       | Envelope or response payload invalid                              |
| `403`       | Learner account, role, enrollment, or release access rejected     |
| `404`       | Activity is no longer in the selected published release           |
| `409`       | Idempotency/device conflict or activity type has no evaluator yet |

## Implemented learning database contracts

Phase 3 added database-private learning helpers. They are the current truth for learning persistence.

| Surface                                        | Caller boundary             | Purpose                                                                      | Status                     |
| ---------------------------------------------- | --------------------------- | ---------------------------------------------------------------------------- | -------------------------- |
| `private.start_placement_session`              | `app_learning_api_executor` | Create a draft placement session for an owned learner                        | Implemented DB helper      |
| `private.record_placement_answer`              | `app_learning_api_executor` | Record a learner placement answer with idempotency and device sequencing     | Implemented DB helper      |
| `private.submit_placement_session`             | `app_learning_api_executor` | Finalize a placement session after at least one answer exists                | Implemented DB helper      |
| `private.evaluate_and_submit_activity_attempt` | `app_learning_api_executor` | Evaluate a supported activity from private content, then persist its receipt | Implemented route boundary |
| `private.submit_activity_attempt`              | Evaluator helper only       | Persist an evaluator-owned activity attempt and recompute lesson progress    | Internal DB helper         |
| `private.submit_review_event`                  | `app_learning_api_executor` | Submit a learner review event with deterministic scheduling and receipts     | Implemented DB helper      |
| `private.enroll_learner_in_release`            | `app_learning_api_executor` | Enroll a learner in an active published release                              | Implemented DB helper      |
| `private.initialize_review_item`               | `app_learning_api_executor` | Create a review item for a learner and release                               | Implemented DB helper      |
| `private.score_placement_session`              | `service_role`              | Worker-only placement scoring and outcome writeback                          | Implemented DB helper      |
| `private.get_placement_scoring_input`          | `service_role`              | Worker-only read path for placement scoring input                            | Implemented DB helper      |
| `private.purge_learner_learning_data`          | `service_role`              | Worker-only purge path for learner learning state                            | Implemented DB helper      |

Notes:

- These Postgres helpers are the persistence layer. The catalog read route,
  review submission route, and server-evaluated activity submission route now
  exist. The remaining learning mutation routes are still not implemented.
- The migration defines `app_learning_api_executor` as the narrow app executor
  boundary and grants it to `postgres` locally so pgTAP can `SET LOCAL ROLE`
  during tests. Production provisioning still needs a real login role.
- Placement answers are replay-safe after session submission when the idempotency key and payload match; new answers still require a draft session.
- Review events are replay-safe when the payload matches, and the database assigns the server receipt sequence.

## Planned HTTP endpoints

Any future route should be versioned under `/api/v1` and documented here only after it exists in source.

The shared client contracts still define request shapes for routes that are not implemented yet:

| Method | Path                                    | Purpose                      | Status                |
| ------ | --------------------------------------- | ---------------------------- | --------------------- |
| POST   | `/api/v1/privacy/data-subject-requests` | Data subject request enqueue | Planned contract only |

`packages/api-client/src/auth/auth-api-requests.ts` currently exposes the email-OTP, sign-out, and data-subject request envelopes. There is no callback request builder because `GET /auth/callback` is a browser route handled by Supabase SSR.

The learning catalog, activity submission, and review submission routes are
live. Activity submission is intentionally scoped to vocabulary acknowledgement
and objective listening evaluation; the other learning mutation routes and full
interactive learner screens are still planned.

## Learning catalog contract

The protected catalog read route returns the shared learner-catalog contract from `packages/contracts/src/learning/learner-catalog-contract.ts`.

Verified behavior:

- `GET /api/v1/learning/catalog`
- accepts a verified Supabase bearer token or SSR cookie session
- returns `200` with the shared learner-catalog response contract
- returns `401` for missing or rejected credentials
- returns `503` for unexpected auth or repository unavailability
- sets private no-store cache headers and an opaque `X-Request-Id`
- reads only `public.get_learner_catalog_data()`
- rejects raw answer keys, rubrics, editorial fields, provenance fields, and other non-allowlisted nested payload data
- exposes only active packs and published learning content
- remains fail-closed for frozen or revoked accounts
- web SSR learner pages call the catalog repository helper directly after the SSR learner-page gate; the HTTP catalog route remains the external/mobile entry point

Response hierarchy:

1. `languagePacks`
2. `releases`
3. `units`
4. `lessons`
5. `activities`

Use the shared contract file for the full field list. Do not duplicate the database RPC shape in docs.

### Aggregate catalog budget

The current route is a bounded pilot surface:

| Boundary              | Limit                           |
| --------------------- | ------------------------------- |
| Published releases    | 36                              |
| Published units       | 360                             |
| Published lessons     | 600                             |
| Published activities  | 600                             |
| Raw activity payloads | 384 KiB total before projection |
| Projected RPC JSON    | 512 KiB                         |
| Serialized HTTP body  | 512 KiB                         |

The database validates the public activity payload shape when content is
published, requires every published unit and lesson branch to be non-empty,
and rejects the exact projected aggregate when it exceeds 512 KiB. The Next.js
assembler checks the final serialized response again. Before the Chinese and
Korean release gates open or the corpus exceeds this pilot budget, the read
model must split into a paged catalog index plus lesson/activity detail routes.

## Verification notes

- The current health route has a passing route test.
- The contract is shared between the route and the contracts package.
- The learner catalog route is covered by route, repository, assembler, and
  pgTAP tests after the latest fresh local migration reset.
- Activity and review submission coverage includes route, repository, and
  api-client tests; both named pgTAP suites; existing-login provisioning drift
  probes; the dedicated lock-order integration test; and the workspace
  format/lint/typecheck/test/build/audit gates. GitHub Actions also defines a
  local-Supabase database job; confirm its hosted run separately.
