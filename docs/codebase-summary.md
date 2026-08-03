# Codebase Summary

Updated against the current workspace on 2026-08-03 after placement submit, auth-session identity, offline-media, and workflow updates were added.

## Snapshot

The repository is a modular learning-platform workspace with three runnable app shells, shared packages, local Supabase migrations, baseline docs, and phase-planning artifacts. The product surface now includes a public landing page, a credential-free `/showcase` tour, invite-only auth, protected learner shell pages, a health route, protected catalog and offline-media surfaces, one vocabulary acknowledgement slice on web + Expo, protected web + Expo review queues, answer-safe placement flows, a bounded tutor turn, and source-only offline sync/media queues.

## Top-level layout

| Path                       | Purpose                                                                                                                                                        |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web`                 | Next.js App Router shell, public landing/project tour, protected learner pages, catalog/media/auth routes, placement, browser sync, and bounded AI tutor route |
| `apps/mobile`              | Expo app shell, native auth/session plumbing, vocabulary/review/placement screens, native background sync, and offline-media download/playback UI              |
| `apps/worker`              | Node worker with readiness logging and optional placement-scoring job drain loop                                                                               |
| `packages/contracts`       | Shared API version, health, auth, placement, sync, content, and error contract shapes                                                                          |
| `packages/ai`              | Server-only DeepSeek gateway, timeout/abort handling, structured tutor output, token usage, and configurable cost estimate                                     |
| `packages/design-tokens`   | Editorial palette, spacing, motion, typography, and radius tokens                                                                                              |
| `packages/config`          | Shared runtime/platform guard helpers                                                                                                                          |
| `packages/testing`         | Shared testing support placeholder                                                                                                                             |
| `packages/auth`            | PKCE, callback, nonce, and session lifecycle helper contracts                                                                                                  |
| `packages/api-client`      | Shared request descriptors and response parsers plus bounded tutor request/receipt parsing and native transport                                                |
| `packages/learning-engine` | Deterministic review scheduler, idempotency, and event ordering helpers                                                                                        |
| `packages/sync`            | Platform-neutral durable queue with storage port, bounds, namespace isolation, and sequential drain                                                            |
| `supabase`                 | Local Auth configuration, identity/privacy migrations, RLS, pgTAP, and placement-scoring jobs                                                                  |
| `docs`                     | Design, architecture, policy, runbook, release, and summary docs                                                                                               |
| `plans`                    | Product planning and research artifacts                                                                                                                        |

## Current implementation details

- Web home page is a foundation landing page with feature and trust sections, not a blank placeholder. Its `/showcase` route is intentionally session-independent so reviewers can inspect verified beta boundaries, project visuals, and scope without Supabase public configuration or an invited account.
- Web auth is invite-only email OTP plus Supabase SSR PKCE callback handling and cookie-only local sign-out.
- `GET /api/v1/auth/session` returns only `userId` and a derived `sessionEpoch` with no-store headers.
- The protected learner pages `/today`, `/learn`, and `/lessons/[lessonId]` call the SSR learner-page gate and read the catalog directly from the server.
- The health endpoint returns the shared health response contract from `packages/contracts`.
- The protected catalog route authenticates a Supabase bearer token or SSR cookie session, reads the allowlisted aggregate catalog RPC, and returns the shared learner-catalog response contract.
- Learner review reads use `GET /api/v1/learning/reviews`; the route authenticates, uses the RLS-bound Supabase client, and returns at most 50 owned due non-suspended vocabulary items.
- Learner write routes are `POST /api/v1/learning/activities/submit`, `POST /api/v1/learning/reviews/submit`, and the placement start/answer/submit routes. They bind the verified learner, compute a canonical server-side idempotency hash where relevant, re-check active learner state inside bounded executor transactions, and return only no-store public receipts.
- The placement catalog is answer-safe at the route boundary. The Japanese N5 placement bank is published in source, while the authored lesson/audio corpus remains draft or review-only until content and media gates pass. Worker placement scoring exists in source, but no deployed-worker proof is claimed here.
- The placement submit route now accepts an empty JSON body and returns the server receipt only after the session is finalized.
- The bounded AI route is `POST /api/v1/ai/tutor/turn`. It validates the shared tutor request, requires `AI_TUTOR_ENABLED=true` plus the configured append-only provider-consent policy, reserves a private conversation/turn/rate-window row, calls the server-only DeepSeek gateway outside the transaction, and finalizes structured response, token usage, and estimated cost or a normalized failure. It is disabled by default and does not yet claim grounded lesson context or SSE.
- Activity submission calls `private.evaluate_and_submit_activity_attempt()` rather than the raw persistence helper. The database serializes a learner before idempotency lookup, rechecks release/enrollment on every retry, stores an immutable private receipt snapshot, reads private published content, and owns the completion state and listening score. It currently accepts only exact vocabulary acknowledgement and complete objective listening responses; unsupported activity types fail safely. The client receipt is the UI source of truth.
- Web offline sync now has IndexedDB storage plus a service-worker background sync path in source. Local authenticated Chromium proof now covers reload persistence and a receipt-gated Background Sync drain. Native offline sync now has SecureStore storage plus Expo BackgroundTask registration in source, and the pure native executor tests plus storage ownership tests cover the v2 `(userId, sessionEpoch)` key, shared storage locking, legacy v1 migration, malformed/owner-mismatch clearing, race re-checks after session lookup, stale-A/correct-B compare-and-clear ownership, missing-session preservation, abort-retryability, and retry/failure mapping. Both adapters keep queued writes namespaced by user/session, but production-host/cross-browser/deployed-worker and real-device proof are still pending.
- Mobile is still an internal beta, not a released learning flow. It now has SecureStore + installation-bound storage, PKCE shadow registry, native sign-in/callback screens, state/nonce verification, session hydration route guards, refresh control, session-epoch primitives, account-switch request cancellation, the first vocabulary acknowledgement activity screen, the placement onboarding screen, and the native offline-sync provider.
- Worker currently boots a health object and can optionally drain placement-scoring jobs when enabled through environment variables.
- Shared tokens are editorial and currently expose paper, ink, muted, accent, sage, card radius, control radius, and spacing steps.
- Self-service Supabase signup is disabled. Approved registrations, profile and role state, consent history, data-subject requests, private Storage policies, and RLS are implemented and tested locally.
- Supabase migrations plus pgTAP coverage provide active Japanese content catalogs, hidden Chinese/Korean packs, placement sessions, activity attempts, review items, review events, learner progress, placement-scoring jobs, and purge receipts.
- Catalog publication rejects empty branches and malformed projected payloads; the RPC and HTTP assembler independently enforce the 512 KiB final response budget.
- `app_learning_api_executor` is the trusted learning executor boundary. It is used by the private database helpers for learner-safe placement, activity, review, and enrollment writes. `service_role` is reserved for placement scoring and learning-data purge work, and the current worker runtime can exercise those helpers when enabled.
- Learner authorization now locks `public.account_roles` before `public.profiles` inside `private.require_active_learning_account()` to match the revocation path and avoid a deadlock cycle.
- `LEARNING_DATABASE_POOL_MAX` defaults to `2`; the production login must stay within the `1` to `5` pool range and keep `replicas * pool max` at or below `16` under the login's `20`-connection limit.
- Shared auth contracts guard PKCE entropy/digests, atomic state-plus-redirect consumption, nonce verification after adapter-level ID-token verification, and local sign-out cleanup. The wired web flow currently uses Supabase SSR rather than the generic `packages/auth` implementation path.

## What is only planned

- Broader enrollment/preference/progress writes and full speaking/writing learner flows
- Grounded/SSE AI chat, durable tutor history/offline queues, admin workflows, deployed-worker operation, approved audio/CDN assets, and production content release flows
- Claimed HTTPS link association, real-device native auth validation, and an authoritative session revocation adapter
- Hosted production login credential setup for the learning write path; the provisioning SQL exists, but the secret credential and platform wiring are still external
- Search, embeddings, and AI orchestration beyond the current bounded tutor-turn baseline

## Evidence boundary

This summary only describes files present in the workspace and behavior that is visible in the source tree. It does not claim deployed environments, provisioned accounts, real-device background execution, or live production traffic.
