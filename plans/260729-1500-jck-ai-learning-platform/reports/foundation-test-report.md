# Phase 1 Foundation Test Report

Original tester scope: current worktree only, no staging or commits. Controller
verification below records the final post-review state.

## Commands and outcomes

- `pnpm install --frozen-lockfile`  
  Pass. Already up to date.
- `pnpm check:env`  
  Pass. `Environment contract valid for workspace (no secret requirement).`
- `$env:NEXT_PUBLIC_DEEPSEEK_API_KEY='dummy-public-key'; pnpm check:env; ...`  
  Fail as expected. `Forbidden public AI secret variable(s): NEXT_PUBLIC_DEEPSEEK_API_KEY.`
- `$env:EXPO_PUBLIC_DEEPSEEK_API_KEY='dummy-public-key'; pnpm check:env; ...`  
  Fail as expected. `Forbidden public AI secret variable(s): EXPO_PUBLIC_DEEPSEEK_API_KEY.`
- `$env:DEEPSEEK_API_KEY='dummy-server-key'; node scripts/check-env.mjs --target worker --require-secrets; ...`  
  Pass. `Environment contract valid for worker (a protected secret check).`
- `pnpm --filter @ideogram/web test -- src/app/api/v1/health/route.test.ts`  
  Pass. 1 file, 1 test, 1 passed.
- `corepack pnpm format:check`  
  Pass. All matched files use Prettier code style.
- `pnpm lint`  
  Pass. 7/7 workspace packages successful.
- `pnpm typecheck`  
  Pass. 7/7 workspace packages successful.
- `pnpm test`  
  Pass. 7/7 workspace packages successful, 19 tests passed total.
- `pnpm build`  
  Pass. 3/3 build tasks successful. Web, mobile export, and worker build all completed.
- `docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'`  
  Pass for local Supabase inspection. Required containers were healthy. Analytics/vector were absent after restart, matching `supabase/config.toml` where analytics is disabled.
- `Invoke-WebRequest -Uri 'http://127.0.0.1:54321/auth/v1/health' -UseBasicParsing`  
  Pass. HTTP 200 from the unauthenticated local auth health endpoint.
- `docker exec supabase_db_ideogram-learning psql -U postgres -d postgres -tAc "select current_setting('server_version_num')::int >= 170000;"`  
  Pass. Returned `t`, confirming the local database is PostgreSQL 17 or newer.

## Media verification

Verified present:

- `docs/media/system-architecture.png`
- `docs/media/system-architecture.svg`
- `docs/media/mobile-learning-flow.gif`
- `assets/designs/stitch/README.md`

## Evidence notes

- The health route contract test exercises `GET /api/v1/health` and returned the shared versioned shape.
- The environment contract blocks both public secret exposure paths and accepts the worker protected-secret path with a dummy value only.
- Local Supabase container health was checked without exposing credentials, and the auth health endpoint returned 200.
- The documented Supabase config disables analytics and seed loading until a seed exists.
- The worktree already contains unrelated existing changes/untracked files; I did not modify them.

## Verified

- Frozen install works.
- Check-env positive path works.
- Both public-key leak paths fail closed.
- Protected worker secret path passes with a non-real dummy secret.
- Health contract test passes.
- Required media files exist.
- Lint, typecheck, full test suite, build, format check, and local Supabase auth health all pass.
- Local Supabase config and runtime now align with the documented disabled-analytics state.

## Unverified

- GitHub Actions execution in a clean runner.
- Production dependency audit gate from CI was unverified by the original
  tester. The controller subsequently ran it successfully.

## Final post-review verification

Run uncached where supported after all review fixes:

- Frozen install, formatting and environment validation: pass.
- Import-boundary gate: 40/40 adversarial and allowed probes pass.
- Root environment suite: 4 pass, 1 symlink test skipped on Windows and retained
  for Linux CI.
- Lint: 7/7 workspace tasks pass.
- Strict typecheck with Turbo `--force`: 7/7 pass, zero cache hits.
- Unit/contract tests with Turbo `--force`: 7/7 suites, 19/19 pass, zero cache
  hits.
- Production builds with Turbo `--force`: Next.js web, Expo web export and Node
  worker pass, zero cache hits.
- Production audit: zero High/Critical; one monitored Moderate transitive Expo
  build-tool advisory.
- Secret scan: no tracked runtime dotenv or high-confidence credential pattern.
- Supabase after hardened config restart: Auth HTTP 200, nine local containers
  running.
- Documentation validation: links/config keys pass; four pre-existing planned
  learning-domain names remain warnings until Phase 3.
- Media validation: SVG 1200×720, PNG 1800×1080 and five-frame GIF 256×512.
- Detached clean checkout at committed `b0e3f29`: frozen install, environment,
  format, lint, typecheck, tests and builds pass; temporary worktree removed.

## Concerns / blockers

- GitHub Actions clean-runner execution remains unverified locally.

Status: DONE_WITH_CONCERNS
Summary: Phase 1 foundation validates successfully on install, env contract, health test, lint, typecheck, full tests, build, format check, required media presence, and local Supabase auth health.
Concerns/Blockers: GitHub Actions clean-runner execution remains unverified locally.
