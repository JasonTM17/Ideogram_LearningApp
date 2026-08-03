# Code Standards

## Repository shape

| Area                       | Purpose                                                       | Current state             |
| -------------------------- | ------------------------------------------------------------- | ------------------------- |
| `apps/web`                 | Next.js App Router web shell and canonical `/api/v1` host     | Foundation shell          |
| `apps/mobile`              | Expo native shell                                             | Foundation shell          |
| `apps/worker`              | Node worker for async or heavy background jobs                | Optional placement scorer |
| `packages/contracts`       | Shared API and content contracts                              | Active                    |
| `packages/design-tokens`   | Shared semantic color, spacing, motion, and typography tokens | Active                    |
| `packages/config`          | Shared runtime/config helpers                                 | Active                    |
| `packages/testing`         | Shared test helpers and setup                                 | Active                    |
| `packages/auth`            | Auth session, PKCE, callback, and nonce helpers               | Active                    |
| `packages/api-client`      | Shared request descriptors and response parsers               | Active                    |
| `packages/learning-engine` | Deterministic review scheduling helpers                       | Active                    |
| `packages/sync`            | Platform-neutral durable mutation queue and storage port      | Active                    |

## Standards

- Keep server-only code out of mobile and browser public bundles.
- Prefer small, explicit contracts over inferred behavior.
- Keep shared packages platform-neutral.
- Treat auth and privacy as database-first concerns; do not use mutable `user_metadata` for authorization decisions.
- `pnpm lint` runs executable import-boundary probes before package linting; mobile and shared packages must reject Node, server-only, cross-app, dynamic non-literal, and CommonJS loader imports.
- Use TypeScript strictness and avoid widening types with `any`.
- Add tests with new public behavior, especially contract changes.
- Keep file names descriptive and kebab-case where new files are introduced.
- Use one runtime boundary per app: web, mobile, worker.

## API and contract rules

- `packages/contracts` owns shared API types.
- Implemented routes today are `GET /api/v1/health`, `GET /api/v1/auth/session`, `POST /api/v1/auth/email-otp`, `GET /auth/callback`, `POST /api/v1/auth/sign-out`, `GET /api/v1/learning/catalog`, `GET /api/v1/learning/offline-media`, `GET /api/v1/learning/reviews`, `POST /api/v1/learning/placement/sessions`, `GET /api/v1/learning/placement/sessions/[sessionId]`, `POST /api/v1/learning/placement/sessions/[sessionId]/answers`, `POST /api/v1/learning/placement/sessions/[sessionId]/submit`, `POST /api/v1/learning/activities/submit`, `POST /api/v1/learning/reviews/submit`, and `POST /api/v1/ai/tutor/turn`.
- Planned privacy request contracts live in `packages/api-client/src/auth`.
- The implemented learner-catalog descriptor and parser live in `packages/api-client/src/learning`.
- Learner write routes bind the verified learner, compute a canonical payload hash, and write through the `app_learning_api_executor` role.
- Placement submit uses an exact empty JSON body. Review and activity submission continue to own their server receipt and replay logic.
- Activity submission must call the database evaluator rather than the raw activity persistence helper, so scores and completion state remain server-owned.
- The web vocabulary activity slice must build the exact public body `{ acknowledged: true }`, keep its pending input in memory for safe retry, and treat the server receipt as the only completion signal.
- Browser activity-operation identity adapters resolve `localStorage` lazily, fail closed when storage or UUID generation is unavailable, and do not claim cross-tab locking.
- Native activity screens must bind request cancellation to the session lifecycle and unmount path so stale UI cannot commit after a session change.
- Web SSR learner pages use the server-side learner-session gate and read the current profile plus learner role before reading the catalog directly on the server; the HTTP catalog route remains the external client surface.
- `public.data_subject_requests` is the canonical terminology for export and deletion requests in the current phase work.
- Future endpoints should be versioned under `/api/v1`.
- Error payloads should use the shared error payload shape from contracts.

## Environment and secrets

- `.env.example` is non-secret and is the only committed env reference.
- `DEEPSEEK_API_KEY` is server-only.
- Do not place secrets in `NEXT_PUBLIC_*` or `EXPO_PUBLIC_*`.
- `LEARNING_DATABASE_URL` is the server-only login for learner mutation routes and must be able to `SET ROLE app_learning_api_executor`.
- Production must use the dedicated `ideogram_learning_web_login` login, or a pooler-style suffix for that login if the host requires it. The URL accepts only `sslmode=verify-full` in its query; driver-level user, password, host, database, port, TLS, and libpq-compatibility overrides are rejected.
- `LEARNING_DATABASE_POOL_MAX` defaults to `2`, must stay in the `1` to `5` range, and should keep `replicas * pool max` at or below `16` under the login's 20-connection limit.
- Local ignored env files are the expected place for developer secrets.
- `APP_ORIGIN` is mandatory for canonical same-origin mutation and callback construction; open the web app using that exact origin.
- `TRUST_PROXY_IP_HEADERS` defaults to `false` and may be enabled only behind an ingress that overwrites forwarded IP headers.
- `pnpm check:env` scans root and target runtime dotenv files without printing values; it rejects public AI-key names and validates the non-secret DeepSeek configuration contract.

## UI and design rules

- Web and mobile should follow the shared design tokens, not copied DOM shells.
- Use the editorial token set for current foundation screens.
- Keep platform-specific navigation and media controls native to each runtime.
- Keep security-sensitive state changes in the server or worker path only.

## Testing and validation

- Run `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, and `pnpm test` before shipping foundation changes.
- Run `pnpm build` for production validation.
- Learner-write changes require workspace format/lint/typecheck/test/build/audit, `supabase/tests/learning_rls_test.sql`, `supabase/tests/placement_lifecycle_test.sql`, `supabase/tests/review_idempotency_test.sql`, `supabase/tests/ai_tutor_turn_ledger_test.sql`, and the dedicated review lock-order integration test.
- GitHub Actions also runs the database checks against local Supabase. That is workflow configuration, not hosted-green evidence.
- Use `pnpm supabase:start` and `pnpm supabase:stop` for local backend workflow. Do not copy `pnpm supabase:status` output to shared logs because it can expose local development credentials.
