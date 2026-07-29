# API Contract

## Current implemented endpoints

| Method | Path                       | Auth                                                 | Request | Response                 | Status      |
| ------ | -------------------------- | ---------------------------------------------------- | ------- | ------------------------ | ----------- |
| GET    | `/api/v1/health`           | None                                                 | None    | Shared health contract   | Implemented |
| GET    | `/api/v1/learning/catalog` | Verified Supabase bearer token or SSR cookie session | None    | `LearnerCatalogResponse` | Implemented |

## Health response shape

Shared contract source: `packages/contracts/src/api.ts`

| Field       | Value                   |
| ----------- | ----------------------- |
| `service`   | `ideogram-learning-api` |
| `status`    | `ok`                    |
| `timestamp` | ISO string              |
| `version`   | `v1`                    |

The route handler at `apps/web/src/app/api/v1/health/route.ts` returns this shared health contract via `Response.json(...)`.

The catalog route at `apps/web/src/app/api/v1/learning/catalog/route.ts` authenticates the request with Supabase Auth `getUser()`, reads the allowlisted aggregate RPC `public.get_learner_catalog_data()`, and returns the shared learner-catalog contract through `jsonNoStore(...)`.

## Shared API error shape

`packages/contracts/src/api.ts` defines the shared error payload shape used by the catalog route:

- `code`
- `message`
- `requestId`

The catalog route returns that shape on 401 and 503 responses. It also emits the same opaque request ID in `X-Request-Id`, together with private no-store cache headers.

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

- These Postgres helpers are not route handlers. The catalog read route exists,
  but no learning mutation route is implemented yet.
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

The learning catalog is now implemented. The remaining learning mutation routes and user-facing learning screens are still planned.

## Learning catalog contract

The protected catalog read route returns the shared `LearnerCatalogResponse` contract from `packages/contracts/src/learning/learner-catalog-contract.ts`.

Verified behavior:

- `GET /api/v1/learning/catalog`
- accepts a verified Supabase bearer token or SSR cookie session
- returns `200` with `LearnerCatalogResponse`
- returns `401` for missing or rejected credentials
- returns `503` for unexpected auth or repository unavailability
- sets private no-store cache headers and an opaque `X-Request-Id`
- reads only `public.get_learner_catalog_data()`
- rejects raw answer keys, rubrics, editorial fields, provenance fields, and other non-allowlisted nested payload data
- exposes only active packs and published learning content
- remains fail-closed for frozen or revoked accounts

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
- The learner catalog route is covered by route, repository, assembler, and pgTAP tests after the latest fresh local migration reset.
