# Ideogram Learning

Ideogram Learning is a Vietnamese-first language learning platform for a Japanese-first launch, with later Chinese and Korean support gated separately. The repo contains a Next.js web shell, an Expo mobile shell, a Node worker, shared contracts, local Supabase migrations, and docs that distinguish source state from deployed proof.

## Current foundation

- Web: Next.js App Router shell with protected learner pages, invite-only auth, a `/showcase` tour, catalog/review/placement/offline-media routes, browser IndexedDB + Background Sync queue code, and a bounded AI tutor route
- Mobile: Expo shell on Expo `~57.0.9` / React Native `0.86.2` with protected session hydration, catalog-backed learning, onboarding/placement, review flow, SecureStore-backed durable syncing, and optional Expo BackgroundTask registration
- Worker: Node worker with readiness logging and optional placement-scoring job draining when `PLACEMENT_SCORING_WORKER_ENABLED=true`
- Shared packages: `packages/contracts`, `packages/ai`, `packages/design-tokens`, `packages/config`, `packages/testing`, `packages/auth`, `packages/api-client`, `packages/learning-engine`, `packages/sync`
- Implemented routes: `GET /api/v1/health`, `GET /api/v1/auth/session`, `POST /api/v1/auth/email-otp`, `GET /auth/callback`, `POST /api/v1/auth/sign-out`, `GET /api/v1/learning/catalog`, `GET /api/v1/learning/offline-media`, `GET /api/v1/learning/reviews`, `POST /api/v1/learning/placement/sessions`, `GET /api/v1/learning/placement/sessions/[sessionId]`, `POST /api/v1/learning/placement/sessions/[sessionId]/answers`, `POST /api/v1/learning/placement/sessions/[sessionId]/submit`, `POST /api/v1/learning/activities/submit`, `POST /api/v1/learning/reviews/submit`, and `POST /api/v1/ai/tutor/turn`

The placement submit route now accepts an exact empty JSON object. The auth session route returns only `userId` and a derived `sessionEpoch`, and it is served with no-store headers. Browser offline-sync identity compares the local session namespace to that same server-derived epoch.

Placement routes expose only learner-safe prompts. The published Japanese N5 placement bank lives in `supabase/migrations/20260803002000_publish_japanese_n5_placement_and_scoring_jobs.sql`, while authored lesson/audio corpus content remains draft or review-only until content and media gates pass. Rubrics, answer keys, and internal scoring input stay private; the worker scoring path exists in source but is not yet proven in a deployed runtime. Browser IndexedDB + Background Sync and native Expo BackgroundTask code exist in source, but there is no real-device, browser, or deployed-worker proof yet.

The bounded AI tutor route is authenticated, server-only, and deliberately disabled by default. It stores private turn and quota ledger rows, but it does not yet claim grounded lesson retrieval, SSE, durable history, or offline tutor queues.

## Visual references

The credential-free project tour at local route `/showcase` explains what runs in the beta, what remains target state, and how to inspect the implementation.

![System architecture](docs/media/system-architecture.png)

![Mobile learning flow](docs/media/mobile-learning-flow.gif)

Design handoff and Stitch exports:

- [Stitch handoff](assets/designs/stitch/README.md)
- [Design guidelines](docs/design-guidelines.md)
- [System architecture](docs/system-architecture.md)
- [Media sources and regeneration](docs/media/README.md)
- [Docs index](docs/README.md)
- [Operational runbooks](docs/operations/local-verification-runbook.md)
- [Release docs](docs/release/README.md)

## Product status

- Current product state: internal beta foundation only
- Launch language priority: Japanese first
- Supported exam contracts: JLPT N5-N1, HSK 1-6, TOPIK 1-6, including TOPIK I/II grouping
- Active language-pack state: Japanese is active; Chinese and Korean are seeded as hidden packs until later release gates
- No claim of official exam certification
- Adult-only closed beta is fail-closed pending named product/legal sign-off
- Minors require a separate approved plan before any launch consideration

## Quick start

```bash
corepack enable
corepack pnpm install --frozen-lockfile
pnpm check:env
pnpm dev
```

## Validate and build

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Content and media generation

```bash
pnpm generate:ja-n5-content
pnpm generate:offline-media-manifest
pnpm content:lint
```

## Supabase local workflow

```bash
pnpm supabase:start
pnpm supabase:stop
```

Do not copy `pnpm supabase:status` into shared logs because its output can contain local development credentials.

## GitHub Actions and GHCR

The repository publishes the web image from the `publish-container.yml` workflow. The workflow pushes branch and semver tags, an immutable `sha-<commit>` tag, and `latest` on the default branch.

```bash
docker pull ghcr.io/jasontm17/ideogram-learning-app/web:latest
docker pull ghcr.io/jasontm17/ideogram-learning-app/web:sha-<commit>
```

- [GitHub About](https://github.com/JasonTM17/Ideogram_LearningApp)
- [Public GHCR package](https://github.com/JasonTM17/Ideogram_LearningApp/pkgs/container/ideogram-learning-app%2Fweb)

`latest` is only updated by the default branch. Prefer the immutable `sha-*` tag for release evidence, rollback, and reproducible deployment checks.

## Environment

- Copy `.env.example` to a local ignored env file before running secret-backed features.
- `DEEPSEEK_API_KEY` is server-only and must never be placed in `NEXT_PUBLIC_*` or `EXPO_PUBLIC_*`.
- `AI_TUTOR_ENABLED` defaults to `false`. Enabling it requires owner approval, a replacement secret loaded from a deployment secret store, an accepted `AI_TUTOR_CONSENT_POLICY_KEY`, and configured integer micro-USD price inputs.
- `EXPO_PUBLIC_AUTH_CALLBACK_URL` is optional only in native development, where `ideogram-learning://auth/callback` is the fallback. Production mobile builds must supply one exact claimed HTTPS Universal Link or App Link callback.
- `EXPO_PUBLIC_API_ORIGIN` is public configuration for the mobile read client, not a credential. It must be an HTTPS origin in production; development can use loopback HTTP.
- `APP_ORIGIN` must exactly match the origin opened in the browser; local Supabase and the example config use `http://127.0.0.1:3000`.
- `LEARNING_DATABASE_URL` is server-only. Production must use the dedicated `ideogram_learning_web_login` login, or a pooler-style suffix for that login if the platform requires it, with `sslmode=verify-full` as the only query parameter.
- `LEARNING_DATABASE_POOL_MAX` defaults to `2`, must stay between `1` and `5`, and should keep `replicas * pool max` at or below `16` under the login's `20`-connection limit.
- Keep `TRUST_PROXY_IP_HEADERS=false` unless a trusted ingress overwrites `x-forwarded-for` and `x-real-ip`.
- `pnpm check:env` scans framework dotenv files without printing their values and rejects accidental public AI-key exposure.

## What is not implemented yet

- Broader lesson onboarding preferences/enrollment writes, a reviewed recorded-media release, grounded/SSE AI chat, durable tutor history/offline tutor queues, progress writes, and admin workflows
- Activity evaluators beyond vocabulary acknowledgement and objective listening, including speaking and writing assessment
- Production web runtime deployment or cloud provisioning
- Hosted production login credential setup for the learning write path; the provisioning SQL exists, but the secret credential and platform wiring remain external
- No additional API surface is claimed beyond the implemented health, auth,
  catalog, offline-media, review, placement, activity, and tutor routes

## Docs

- [Docs index](docs/README.md)
- [Project overview and PDR](docs/project-overview-pdr.md)
- [Code standards](docs/code-standards.md)
- [Codebase summary](docs/codebase-summary.md)
- [System architecture](docs/system-architecture.md)
- [Security and privacy baseline](docs/security-and-privacy-baseline.md)
- [Authentication guide](docs/authentication-guide.md)
- [Privileged operation matrix](docs/privileged-operation-matrix.md)
- [Data lifecycle matrix](docs/data-lifecycle-matrix.md)
- [Account deletion and export saga](docs/account-deletion-and-export-saga.md)
- [API contract](docs/api-contract.md)
- [Mobile support policy](docs/mobile-support-policy.md)
- [External dependency matrix](docs/external-dependency-matrix.md)
- [Execution capacity and load assumptions](docs/execution-capacity-and-load-assumptions.md)
- [Deployment guide](docs/deployment-guide.md)
- [GitHub Container Registry image](https://github.com/JasonTM17/Ideogram_LearningApp/pkgs/container/ideogram-learning-app%2Fweb)
- [Project roadmap](docs/project-roadmap.md)
- [Content governance](docs/content-governance.md)
- [Learning engine contract](docs/learning-engine-contract.md)
- [AI system and safety](docs/ai-system-and-safety.md)
- [Review and sync contract](docs/review-and-sync-contract.md)
- [Offline sync contract](docs/offline-sync-contract.md)
- [Offline media contract](docs/offline-media-contract.md)
- [Foundation engineering journal](docs/journals/2026-07-29-foundation-safety-rails.md)
