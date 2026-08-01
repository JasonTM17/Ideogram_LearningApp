# Codebase Summary

Updated against the current workspace on 2026-08-01 after the bounded AI tutor-turn slice.

## Snapshot

The repository is a greenfield learning-platform workspace with three runnable
app shells, eight shared packages, local Supabase migrations/RLS tests,
baseline docs, and phase-planning artifacts. The product surface now includes a
public landing page, invite-only auth, protected learner shell pages, a health
route, and a protected learner-catalog surface. The learning product still also
exists as database contracts and private helpers.

## Top-level layout

| Path                       | Purpose                                                                                                                                |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web`                 | Next.js App Router shell, public landing, sign-in/callback pages, protected learner pages, catalog/auth routes, bounded AI tutor route |
| `apps/mobile`              | Expo app shell and foundation metadata                                                                                                 |
| `apps/worker`              | Node worker stub that prints a readiness line                                                                                          |
| `packages/contracts`       | Shared API version, health response, auth flow, and error contract shapes                                                              |
| `packages/ai`              | Server-only DeepSeek V4 Flash gateway, timeout/abort handling, structured tutor output, token usage, and configurable cost estimate    |
| `packages/design-tokens`   | Editorial palette, spacing, and radius tokens                                                                                          |
| `packages/config`          | Shared runtime/platform guard helpers                                                                                                  |
| `packages/testing`         | Shared testing support placeholder                                                                                                     |
| `packages/auth`            | PKCE, callback, verified-nonce exchange, and session lifecycle helper contracts                                                        |
| `packages/api-client`      | Auth/privacy/learning request builders plus shared bounded tutor request/receipt parsing and native transport                          |
| `packages/learning-engine` | Deterministic review scheduler, idempotency, and event ordering helpers                                                                |
| `supabase`                 | Local Auth configuration, identity/privacy migrations, RLS, and pgTAP                                                                  |
| `docs`                     | Design, architecture, policy, and summary docs                                                                                         |
| `plans`                    | Product planning and research artifacts                                                                                                |

## Current implementation details

- Web home page is a foundation landing page with feature and trust sections, not a blank placeholder.
- Web auth is invite-only email OTP plus Supabase SSR PKCE callback handling and cookie-only local sign-out.
- The protected learner pages `/today`, `/learn`, and `/lessons/[lessonId]` call the SSR learner-page gate and read the catalog directly from the server.
- The health endpoint returns the shared health response contract from `packages/contracts`.
- The protected catalog route authenticates a Supabase bearer token or SSR cookie session, reads the allowlisted aggregate catalog RPC, and returns the shared learner-catalog response contract.
- Learner write routes are `POST /api/v1/learning/activities/submit` and `POST /api/v1/learning/reviews/submit`. Both bind the verified learner, compute a canonical server-side idempotency hash, re-check active learner state inside a bounded executor transaction, and return only no-store public receipts.
- The bounded AI route is `POST /api/v1/ai/tutor/turn`. It validates the shared
  tutor request, requires `AI_TUTOR_ENABLED=true` plus the configured append-only
  provider-consent policy, reserves a private conversation/turn/rate-window row,
  calls the server-only DeepSeek gateway outside the transaction, and finalizes
  structured response, token usage, and estimated cost or a normalized failure.
  It is disabled by default and does not yet claim grounded lesson context or SSE.
  Web and Expo consume it through the shared `@ideogram/api-client` request and
  receipt boundary; neither client imports `@ideogram/ai`.
- Activity submission calls `private.evaluate_and_submit_activity_attempt()` rather than the raw persistence helper. The database serializes a learner before idempotency lookup, rechecks release/enrollment on every retry, stores an immutable private receipt snapshot, reads private published content, and owns the completion state and listening score. It currently accepts only exact vocabulary acknowledgement and complete objective listening responses; unsupported activity types fail safely.
- Mobile is still an internal beta, not a released learning flow. It now has
  SecureStore + installation-bound storage, PKCE shadow registry, native
  sign-in/callback screens, state/nonce verification, session hydration route
  guards, refresh control, session-epoch primitives, and account-switch request
  cancellation. Authenticated users read the protected catalog through the
  shared native API client; Today and Lesson render only contract-validated
  published content. Claimed HTTPS links and real-device auth validation remain
  pending. The assistant screen submits bounded tutor turns with session-bound
  bearer transport, Vietnamese preference controls, safe error states, and all
  six response sections; durable history/offline tutor queues remain pending.
- Worker currently boots a health object and logs readiness.
- Shared tokens are editorial and currently expose paper, ink, muted, accent, sage, card radius, control radius, and spacing steps.
- Self-service Supabase signup is disabled. Approved registrations, profile and
  role state, consent history, data-subject requests, private Storage policies,
  and RLS are implemented and tested locally.
- Phase 3 adds active Japanese content catalogs, hidden Chinese/Korean packs,
  placement sessions, activity attempts, review items, review events, learner
  progress, and purge receipts in Supabase migrations plus pgTAP coverage.
- The catalog output is intentionally answer-free at the application boundary,
  and raw learner-catalog source tables are not directly readable by
  authenticated callers.
- Catalog publication rejects empty branches and malformed projected payloads;
  the RPC and HTTP assembler independently enforce the 512 KiB final response
  budget.
- `app_learning_api_executor` is the trusted learning executor boundary. It is
  used by the private database helpers for learner-safe placement, activity,
  and review writes. `service_role` is reserved for placement scoring and
  learning-data purge work, and the current worker runtime is readiness-only.
- Learner authorization now locks `public.account_roles` before `public.profiles`
  inside `private.require_active_learning_account()` to match the revocation
  path and avoid a deadlock cycle.
- `LEARNING_DATABASE_POOL_MAX` defaults to `2`; the production login must stay
  within the `1` to `5` pool range and keep `replicas * pool max` at or below
  `16` under the login's `20`-connection limit.
- Shared auth contracts guard PKCE entropy/digests, atomic state-plus-redirect
  consumption, nonce verification after adapter-level ID-token verification,
  and local sign-out cleanup. The wired web flow currently uses Supabase SSR
  rather than the generic `packages/auth` implementation path.

## What is only planned

- Remaining learning mutation route handlers beyond activity/review submission and full interactive learner flows
- Grounded/SSE AI chat, durable tutor history/offline queues, offline sync, admin workflows, and production content/audio release flows
- Claimed HTTPS link association, real-device native auth validation, and an
  authoritative session revocation adapter
- Hosted production login credential setup for the learning write path; the
  provisioning SQL exists, but the secret credential and platform wiring are
  still external
- Search, embeddings, and AI orchestration beyond the current bounded tutor-turn baseline

## Evidence boundary

This summary only describes files present in the workspace and behavior that is visible in the source tree. It does not claim deployed environments, provisioned accounts, or live production traffic.
