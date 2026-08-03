# Project Overview and PDR

## Overview

Ideogram Learning is a Vietnamese-first AI learning platform for a Japanese-first launch, with later support planned for Chinese and Korean. The current source tree contains the foundation slice: workspace shells, shared contracts, Supabase migrations/RLS, public landing and `/showcase`, invite-only auth, learner catalog reads, onboarding and placement, vocabulary review, activity and review submission, offline sync, offline media gating, and a bounded tutor turn.

The key boundary is source state versus deployed proof. Several flows are implemented in code and tests, but hosted production runtime, real-device native proof, released audio assets, and deployed-worker proof are still pending. Browser Background Sync now has local authenticated Chromium proof only; production-host and cross-browser certification remain open.

## Product requirements

| Requirement         | Decision                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------- |
| Launch language     | Japanese first                                                                                          |
| Contract coverage   | JLPT N5-N1, HSK 1-6, TOPIK 1-6, including TOPIK I/II                                                    |
| Certification claim | No official exam certification claim                                                                    |
| Adult beta          | 18+ closed beta, fail-closed until named product/legal sign-off                                         |
| Minors              | Separate approved plan required                                                                         |
| AI provider         | DeepSeek, server-only                                                                                   |
| Platform shape      | Web, native mobile, worker, shared contracts                                                            |
| Web auth flow       | Invite-only email OTP, Supabase SSR PKCE callback, local sign-out                                       |
| Interactive slice   | Vocabulary acknowledgement, review queue, placement, and bounded tutor turn; server receipt is UI truth |

## Delivered foundation

- Web: public landing page, `/showcase`, protected learner shell, catalog/review/offline-media routes, placement flow, browser IndexedDB + Background Sync queue, and bounded AI tutor UI
- Mobile: Expo shell, protected session hydration, catalog-backed learning, onboarding/placement, review flow, SecureStore-backed durable sync, and optional BackgroundTask registration
- Offline sync verification: local authenticated Chromium proof for browser Background Sync, plus pure native executor and owned-storage tests for the v2 `(userId, sessionEpoch)` key, shared storage locking, legacy v1 migration, race re-checks, stale-A/correct-B ownership, abort-retryability, and retry/failure mapping
- Worker: readiness logging and optional placement-scoring job drain loop
- Shared packages: contracts, auth helpers, API client, learning engine, durable sync, design tokens, config, and AI gateway
- Supabase: auth baseline, learner privacy tables, learner catalog, review items, placement sessions, AI ledger, and worker-only helpers

## Scope

### In scope for the foundation

- Workspace structure and shared package boundaries
- Public landing, invite-only auth, protected learner shell, and catalog read route
- Adult-only registration approval, identity/profile/role/privacy contracts, private Storage policies, local RLS tests, and activity/review/placement write paths
- First interactive vocabulary acknowledgement slice on web and mobile
- Vocabulary review loop on web and Expo
- Versioned API contract surface
- Authenticated learner catalog projection with bounded response budgets
- Documentation baseline
- Public project-tour route that distinguishes the beta boundary from the target architecture without credentials or external configuration
- Mobile support policy and dependency matrix
- Load assumptions for closed-beta planning

### Not in scope today

- Enrollment/preferences writes beyond the delivered onboarding/placement UI
- Interactive lesson delivery beyond the first vocabulary slice
- Released media cache/download delivery and approved recorded audio
- Activity evaluators beyond vocabulary acknowledgement and objective listening
- Progress dashboard/write flows and durable tutor history/offline tutor queues
- Production login provisioning and deployment
- Payments, community, marketplace, and public launch infrastructure

## Non-functional requirements

- Fail closed on missing AI credentials
- Keep server-only secrets out of web and mobile public env variables
- Preserve a canonical API host under Next.js
- Keep mobile and web shells platform-native
- Treat docs as evidence-based, not aspirational
- Keep source claims separate from deployed proof

## Acceptance criteria

- README links resolve and match the current repo layout
- Docs distinguish implemented behavior from planned behavior
- `GET /api/v1/health`, `GET /api/v1/auth/session`, `POST /api/v1/auth/email-otp`, `GET /auth/callback`, `POST /api/v1/auth/sign-out`, `GET /api/v1/learning/catalog`, `GET /api/v1/learning/offline-media`, `GET /api/v1/learning/reviews`, `POST /api/v1/learning/placement/sessions`, `GET /api/v1/learning/placement/sessions/[sessionId]`, `POST /api/v1/learning/placement/sessions/[sessionId]/answers`, `POST /api/v1/learning/placement/sessions/[sessionId]/submit`, `POST /api/v1/learning/activities/submit`, `POST /api/v1/learning/reviews/submit`, and `POST /api/v1/ai/tutor/turn` are described as implemented today
- Product decisions are cross-linked and versioned
- No doc implies deployment or provisioning already happened
- A reviewer can understand the current beta boundary from `/showcase` without a Supabase session, AI provider configuration, or a fabricated learner state
- Learner-write changes retain an evidence trail for workspace format/lint/typecheck/test/build/audit, the named pgTAP suites, and the review lock-order probe

## Open questions

- Final owner for product/legal sign-off on the adult-only beta
- Final owner for production learning-login provisioning
- Hosted credential/platform wiring for the learning write path
- Exact launch authentication providers
- Cost and retention limits for AI usage beyond the planning caps
