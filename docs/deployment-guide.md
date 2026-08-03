# Deployment Guide

## Status

The web and placement-worker images are built from `Dockerfile` and
`Dockerfile.worker`. The container jobs in
[`ci.yml`](../.github/workflows/ci.yml) run only after the quality and database
jobs pass, then build/load one local artifact. Smoke tests and Trivy scan that
artifact before registry login or publication. The workflow tags and pushes the
same loaded image without rebuilding, checks that every registry tag resolves
to one digest, pulls that digest back, and confirms its image identity matches
the tested local image. It then attaches a CycloneDX SBOM and GitHub build
provenance to that digest. Version-tag releases are mirrored to Docker Hub only when the protected
namespace and credentials exist, keeping semantic and full-SHA digest evidence
aligned across both registries. No unverified candidate tag is exposed in a
public registry. This is image/package release evidence, not
proof that a public runtime or Supabase production project has been
provisioned. The worker check proves enabled startup and process liveness; it
does not claim database readiness.

Package: `ghcr.io/jasontm17/ideogram-learning-app/web`

Package page: [GitHub Container Registry](https://github.com/JasonTM17/Ideogram_LearningApp/pkgs/container/ideogram-learning-app%2Fweb)

## Local workflow

Prerequisites: Node.js `>=24.12 <25`, pnpm `11.0.9`, Docker Desktop for the local Supabase stack, and an ignored runtime dotenv file copied from [`../.env.example`](../.env.example). Set `APP_ORIGIN` to the exact browser origin; the repository default is `http://127.0.0.1:3000`.

```bash
corepack enable
corepack pnpm install --frozen-lockfile
pnpm check:env
pnpm supabase:start
pnpm dev
```

## Validation workflow

Regenerate the offline-media manifest before a release candidate. It remains unavailable unless release status, rights approval, local recorded file, checksum, and stable HTTPS delivery URL all pass:

```bash
pnpm generate:ja-n5-content
pnpm generate:offline-media-manifest
pnpm content:lint
```

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm audit --prod
pnpm exec supabase test db supabase/tests/learning_rls_test.sql
pnpm exec supabase test db supabase/tests/review_idempotency_test.sql
pnpm exec supabase test db supabase/tests/placement_lifecycle_test.sql
pnpm exec supabase test db supabase/tests/ai_tutor_turn_ledger_test.sql
pnpm test:db:review-lock-order
```

The lock-order command needs the local development DB URL in its process environment. Obtain it only through the CI-safe local setup used by the database job; do not paste or print it in a shared terminal transcript.

The script accepts only the local Supabase admin database on `127.0.0.1` or `localhost`, port `54322`, database `postgres`, user `postgres`, and no URL query overrides. It removes its exact test fixture before exit. Never point it at staging or production.

The configured GitHub Actions `database` job starts local Supabase, obtains this ephemeral URL without printing it, then runs pgTAP and the lock-order regression. That is CI configuration, not hosted-green evidence; confirm the first remote run before treating it as release proof.

## Supabase local commands

```bash
pnpm supabase:start
pnpm supabase:status
pnpm supabase:stop
```

Do not copy `pnpm supabase:status` output into a ticket or runbook because it can include local development credentials. Optional imgproxy, edge-runtime, analytics, vector, and pooler services are not required for the learning test suites.

## Learning login provisioning

Run `supabase/production-learning-api-login.sql` from an administrative PostgreSQL connection after the Supabase migrations are in place. The script intentionally does not set a password. Use your platform or secret manager to set the credential separately, then store only the resulting connection URL in `LEARNING_DATABASE_URL`.

The provisioned login is expected to be able to `SET ROLE app_learning_api_executor`. That role is the dedicated server boundary for learner mutation routes; the review, activity, and placement routes use it today. The production connection string should use the dedicated `ideogram_learning_web_login` login, or the platform-specific pooler-style suffix for that login if required, together with `sslmode=verify-full` as the only connection-string query parameter. Install the project CA from the Supabase SSL Configuration page in the runtime trust store before deployment.

`LEARNING_DATABASE_POOL_MAX` defaults to `2`, must stay between `1` and `5`, and should keep `replicas * pool max` at or below `16` under the login's `20`-connection limit. The provisioning SQL exists in-repo, but the hosted credential and platform wiring remain external release work.

For an existing login, the provisioning script fails closed if it finds elevated attributes, unapproved role memberships, executor membership with `ADMIN OPTION`, object/database/extension/default-ACL ownership, or direct ACL grants. An administrator must remove the drift and rerun the script; it deliberately does not silently revoke unknown production privileges.

## Intended deployment shape

| Surface    | Planned target        | Current evidence                                             |
| ---------- | --------------------- | ------------------------------------------------------------ |
| Web        | Next.js host          | No production host configuration                             |
| Mobile     | Expo release pipeline | No `eas.json` or released binary                             |
| Worker     | Node runtime          | Conditional local placement scorer; no deployed-worker proof |
| Data plane | Supabase              | Local config/migrations; no production project               |

## GitHub Container Registry

The workflow publishes `main`, semver tags (`v*.*.*`), an immutable commit SHA tag, and `latest` on the default branch. It uses the ephemeral workflow token; no registry credential is stored in the repository. The current package is public, so anonymous pulls work; authenticating to GHCR is still recommended for higher rate limits and private forks.

Pull the published image:

```bash
docker pull ghcr.io/jasontm17/ideogram-learning-app/web:latest
docker run --rm --env-file .env -p 3000:3000 ghcr.io/jasontm17/ideogram-learning-app/web:latest
```

If the package visibility changes, authenticate first with a token that has `read:packages`:

```bash
docker login ghcr.io
```

The runtime must provide server-only values such as `DEEPSEEK_API_KEY` and `LEARNING_DATABASE_URL` through the host secret manager. The Docker build never copies dotenv files and the image contains only the Next.js standalone runtime. For a local build:

```bash
docker build -t ideogram-learning-web:local .
docker run --rm --env-file .env -p 3000:3000 ideogram-learning-web:local
```

## Secrets handling

- Keep `DEEPSEEK_API_KEY` server-only.
- Set `APP_ORIGIN` exactly and configure the Supabase Site URL plus `/auth/callback*` redirect entry for every deployed origin.
- Keep `TRUST_PROXY_IP_HEADERS=false` unless the selected host guarantees forwarded-header overwrite; horizontally scaled OTP throttling requires a distributed limiter.
- Use protected deployment secrets for shared environments.
- Do not publish real secrets in docs, screenshots, or repo files.
- The web runtime reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or the accepted server aliases) for the protected catalog route. The URL validator only accepts a Supabase origin, requires HTTPS outside localhost and 127.0.0.1, and rejects embedded credentials or path/query fragments.

## Open items

- Production environment provisioning
- Learning login credential setup
- Store release ownership
- Monitoring and alerting thresholds for live traffic
- Hosted success of [the CI workflow](../.github/workflows/ci.yml)
- Production mail provider, callback allowlist, and secret ownership
