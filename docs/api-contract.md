# API Contract

## Current implemented endpoint

| Method | Path             | Auth | Request | Response               | Status      |
| ------ | ---------------- | ---- | ------- | ---------------------- | ----------- |
| GET    | `/api/v1/health` | None | None    | Shared health contract | Implemented |

## Health response shape

Shared contract source: `packages/contracts/src/api.ts`

| Field       | Value                   |
| ----------- | ----------------------- |
| `service`   | `ideogram-learning-api` |
| `status`    | `ok`                    |
| `timestamp` | ISO string              |
| `version`   | `v1`                    |

The route handler at `apps/web/src/app/api/v1/health/route.ts` returns this shared health contract via `Response.json(...)`.

## Shared API error shape

`packages/contracts/src/api.ts` also defines a shared error payload shape for future endpoints:

- `code`
- `message`
- `requestId`

That error shape is not yet used by any implemented route.

## Implemented learning database contracts

Phase 3 added database-private learning helpers. They are not HTTP endpoints yet, but they are the current truth for learning persistence.

| Surface                               | Caller boundary             | Purpose                                                                  | Status                |
| ------------------------------------- | --------------------------- | ------------------------------------------------------------------------ | --------------------- |
| `private.start_placement_session`     | `app_learning_api_executor` | Create a draft placement session for an owned learner                    | Implemented DB helper |
| `private.record_placement_answer`     | `app_learning_api_executor` | Record a learner placement answer with idempotency and device sequencing | Implemented DB helper |
| `private.submit_placement_session`    | `app_learning_api_executor` | Finalize a placement session after at least one answer exists            | Implemented DB helper |
| `private.submit_activity_attempt`     | `app_learning_api_executor` | Submit a learner activity attempt and recompute lesson progress          | Implemented DB helper |
| `private.submit_review_event`         | `app_learning_api_executor` | Submit a learner review event with deterministic scheduling and receipts | Implemented DB helper |
| `private.enroll_learner_in_release`   | `app_learning_api_executor` | Enroll a learner in an active published release                          | Implemented DB helper |
| `private.initialize_review_item`      | `app_learning_api_executor` | Create a review item for a learner and release                           | Implemented DB helper |
| `private.score_placement_session`     | `service_role`              | Worker-only placement scoring and outcome writeback                      | Implemented DB helper |
| `private.get_placement_scoring_input` | `service_role`              | Worker-only read path for placement scoring input                        | Implemented DB helper |
| `private.purge_learner_learning_data` | `service_role`              | Worker-only purge path for learner learning state                        | Implemented DB helper |

Notes:

- These are Postgres helpers, not route handlers. No `/api/v1/learning/*` HTTP route exists yet.
- The migration defines `app_learning_api_executor` as the narrow app executor boundary and grants it to `postgres` locally so pgTAP can `SET LOCAL ROLE` during tests. Production provisioning still needs a real login role.
- Placement answers are replay-safe after session submission when the idempotency key and payload match; new answers still require a draft session.
- Review events are replay-safe when the payload matches, and the database assigns the server receipt sequence.

## Planned HTTP endpoints

Any future route should be versioned under `/api/v1` and documented here only after it exists in source.

The shared client contracts already define request shapes for routes that are not implemented yet:

| Method | Path                                    | Purpose                                                      | Status                |
| ------ | --------------------------------------- | ------------------------------------------------------------ | --------------------- |
| POST   | `/api/v1/auth/email-otp`                | Invite-only email OTP request with `shouldCreateUser: false` | Planned contract only |
| POST   | `/api/v1/auth/callback`                 | Authorization-code exchange with PKCE verifier               | Planned contract only |
| POST   | `/api/v1/auth/sign-out`                 | Session sign-out                                             | Planned contract only |
| POST   | `/api/v1/privacy/data-subject-requests` | Data subject request enqueue contract                        | Planned contract only |

Those request shapes live in `packages/api-client/src/auth/auth-api-requests.ts`.
The server route handlers do not exist yet.

## Verification notes

- The current health route has a passing route test.
- The contract is shared between the route and the contracts package.
