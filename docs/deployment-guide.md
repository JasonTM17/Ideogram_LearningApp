# Deployment Guide

## Status

No production deployment or cloud provisioning has been completed from this repository yet. This guide documents the intended local and future deployment shape only.

## Local workflow

Prerequisites: Node.js `>=24.12 <25`, pnpm `11.0.9`, Docker Desktop for the
local Supabase stack, and an ignored runtime dotenv file copied from
[`../.env.example`](../.env.example). Set `APP_ORIGIN` to the exact browser
origin; the repository default is `http://127.0.0.1:3000`.

```bash
corepack enable
corepack pnpm install --frozen-lockfile
pnpm check:env
pnpm supabase:start
pnpm dev
```

## Validation workflow

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm audit --prod
pnpm exec supabase test db supabase/tests/review_idempotency_test.sql
pnpm test:db:review-lock-order
```

The lock-order command needs the local DB URL from `pnpm supabase:status` in
its process environment:

```powershell
$env:SUPABASE_DB_URL='<local-db-url>'
pnpm test:db:review-lock-order
```

The script accepts only the local Supabase admin database on `127.0.0.1` or
`localhost`, port `54322`, database `postgres`, user `postgres`, and no URL
query overrides. It removes its exact test fixture before exit. Never point it
at staging or production.

The configured GitHub Actions `database` job starts local Supabase, obtains this
ephemeral URL without printing it, then runs pgTAP and the lock-order regression.
That is CI configuration, not hosted-green evidence; confirm the first remote
run before treating it as release proof.

The exact full local validation count is recorded with the current delivery
commit and must be re-run after contract or test changes. pgTAP currently has
42 assertions for review submission.

Smoke validation should also cover:

- `401` when no valid credentials are supplied
- `200` when an active verified learner is supplied
- `503` when auth or data dependencies are unavailable
- the cache-control headers plus `X-Request-Id` on both success and error responses
- review submission success, invalid body, revoked learner role, stale item,
  and idempotency/device-sequence conflict responses
- generic `202` OTP acceptance plus invalid body/origin/content-type, local
  rate-limit `429`, and provider outage `503`
- callback rejection for token-bearing or invalid flow queries, safe `303`
  redirects, `Referrer-Policy: no-referrer`, and return-cookie consumption
- cookie-only same-origin local sign-out and rejection of bearer sign-out
- protected learner-page redirect for absent, frozen, pending-deletion, or
  learner-role-revoked sessions

## Supabase local commands

```bash
pnpm supabase:start
pnpm supabase:status
pnpm supabase:stop
```

Current local status probes show the core Supabase services as available; the
optional imgproxy, edge-runtime, analytics, vector, and pooler services may
still appear stopped and are not required for the review-submission slice.

## Learning login provisioning

Run `supabase/production-learning-api-login.sql` from an administrative
PostgreSQL connection after the Supabase migrations are in place. The script
intentionally does not set a password. Use your platform or secret manager to
set the credential separately, then store only the resulting connection URL in
`LEARNING_DATABASE_URL`.

The provisioned login is expected to be able to `SET ROLE app_learning_api_executor`.
That role is the dedicated server boundary for learner mutation routes; the
review submission route uses it today, and the remaining learning mutation
routes are still pending. The production connection string should use the
dedicated `ideogram_learning_web_login` login, or the platform-specific
pooler-style suffix for that login if required, together with
`sslmode=verify-full` as the only connection-string query parameter. Install
the project CA from the Supabase SSL Configuration page in the runtime trust
store before deployment. Query-level identity, destination, and alternate TLS
options are rejected so they cannot override the checked URL authority.
`LEARNING_DATABASE_POOL_MAX` defaults to `2`, must stay between `1` and `5`,
and should keep `replicas * pool max` at or below `16` under the login's
20-connection limit. The provisioning SQL exists in-repo, but the hosted
credential and platform wiring remain external release work.

For an existing login, the provisioning script fails closed if it finds elevated
attributes, unapproved role memberships, executor membership with `ADMIN
OPTION`, object/database/extension/default-ACL ownership, or direct ACL grants.
An administrator must remove the drift and rerun the script; it deliberately
does not silently revoke unknown production privileges.

Local analytics is explicitly disabled in `supabase/config.toml`. The foundation
does not need Logs Explorer, and keeping Logflare/Vector off avoids granting a
log collector access to the host Docker socket. Auth, Postgres, Realtime,
Storage, Studio, and the versioned app API remain available.

The local Supabase baseline is deliberately conservative: self-service signup is
off; invite-only OTP requests set `shouldCreateUser: false`, and the internal
`storage` schema is not exposed through PostgREST. Use the Storage API and
policy-tested application routes instead of direct storage metadata writes.
The local Site URL and callback allowlist are aligned to `127.0.0.1`; production
Supabase URL configuration and mail delivery are still unverified release gates.

## Intended deployment shape

| Surface    | Planned target        | Current evidence                               |
| ---------- | --------------------- | ---------------------------------------------- |
| Web        | Next.js host          | No production host configuration               |
| Mobile     | Expo release pipeline | No `eas.json` or released binary               |
| Worker     | Node runtime          | Readiness stub only                            |
| Data plane | Supabase              | Local config/migrations; no production project |

## Secrets handling

- Keep `DEEPSEEK_API_KEY` server-only.
- Set `APP_ORIGIN` exactly and configure the Supabase Site URL plus
  `/auth/callback*` redirect entry for every deployed origin.
- Keep `TRUST_PROXY_IP_HEADERS=false` unless the selected host guarantees
  forwarded-header overwrite; horizontally scaled OTP throttling requires a
  distributed limiter.
- Use protected deployment secrets for shared environments.
- Do not publish real secrets in docs, screenshots, or repo files.
- The web runtime reads `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or the accepted server aliases) for
  the protected catalog route. The URL validator only accepts a Supabase origin,
  requires HTTPS outside localhost and 127.0.0.1, and rejects embedded
  credentials or path/query fragments.

## Open items

- Production environment provisioning
- Learning login credential setup
- Store release ownership
- Monitoring and alerting thresholds for live traffic
- Hosted success of [the CI workflow](../.github/workflows/ci.yml)
- Production mail provider, callback allowlist, and secret ownership
