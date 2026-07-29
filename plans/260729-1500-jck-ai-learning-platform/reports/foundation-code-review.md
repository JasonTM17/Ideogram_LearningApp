# Phase 1 Foundation Code Review

Date: 2026-07-29

## Code Review Summary

### Scope

- Focus: current Phase 1 foundation worktree and follow-up verification of the prior import-boundary blocker.
- Reviewed: 56 text files / 11,544 lines, including 10,396-line lockfile.
- Main areas: `eslint.config.mjs`, `scripts/`, `.github/`, `supabase/config.toml`,
  root package/workspace config, all current app/shared-package source and manifests.
- Plan evidence: `plan.md`, `phase-01-foundation-and-delivery.md`,
  `foundation-test-report.md`, and `dependency-audit-investigation.md`.
- Excluded as requested: `.claude/`, `.codex/`, `AGENTS.md`, `CLAUDE.md`,
  `plans/templates/`, and unrelated plan phases.
- Worktree limitation: most Phase 1 files are untracked, so the phase plan—not
  `HEAD~1`—was the review baseline.

### Overall Assessment

**Not commit-ready.** Current runtime source contains no forbidden cross-runtime
import, but the safety rail still has three blocker-level gaps. The 12 canonical
boundary probes pass while adversarial imports that resolve to the same forbidden
targets pass lint.

No Critical finding. Three High findings block the Phase 1 claim that CI enforces
platform and secret boundaries.

## Critical Issues

None found.

## High Priority

### H1 — JS and dynamic imports bypass the platform boundary

- Evidence: `eslint.config.mjs:85` and `eslint.config.mjs:96` apply
  `no-restricted-imports` only to TS-family files. The rule also does not inspect
  `ImportExpression`.
- Reproduced:
  - mobile `probe.js` with static `import 'node:fs'` → 0 lint errors;
  - mobile `probe.ts` with `import('node:fs')` → 0 lint errors.
- `scripts/check-import-boundaries.mjs:3` covers static TS imports only, so its 12
  probes do not detect either bypass.
- Impact: server-only code can enter a mobile/shared bundle while `pnpm lint`
  remains green.
- Fix: cover JS/JSX/MJS/CJS and TS-family files; enforce literal dynamic imports
  through an AST-aware rule; add negative probes for both forms.

### H2 — Raw relative-path regexes are bypassed by path normalization

- Evidence: `eslint.config.mjs:39` and `eslint.config.mjs:113` match raw import
  strings instead of resolved targets.
- Reproduced: from `apps/mobile/src/probe.ts`,
  `import '../.././worker/src/worker-health'` produced 0 lint errors although the
  path resolves into `apps/worker`.
- Equivalent traversal forms such as `mobile/../worker` have the same weakness.
- Impact: the stated cross-app boundary is advisory, not enforcing.
- Fix: resolve and normalize static module targets before comparing canonical app
  roots, or use a maintained boundary rule that does so. Add normalization and
  traversal regression probes.

### H3 — `check:env` misses the framework dotenv path that can expose a real key

- Evidence: `scripts/check-env.mjs:10` inspects `process.env` only;
  `package.json:13` does not load target dotenv files. Next and Expo build commands
  at `apps/web/package.json:6` and `apps/mobile/package.json:23` load their dotenv
  files separately.
- Result: an ignored `.env.local` containing
  `NEXT_PUBLIC_DEEPSEEK_API_KEY` or `EXPO_PUBLIC_DEEPSEEK_API_KEY` can pass
  `pnpm check:env`, then be loaded and exposed by the framework build.
- Existing report probes inject shell variables; they do not cover this common
  file-backed path.
- `.env.example:4-8` values also receive no URL/enum/required-field validation.
- Fix: load the same target-specific dotenv files and precedence as the relevant
  framework without printing values, schema-validate the complete target
  contract, and add file-backed leak tests.

## Medium Priority

### M1 — Shared-package enforcement is closed-world

- `pnpm-workspace.yaml:1-3` admits any future `packages/*`, but
  `eslint.config.mjs:96-100` enumerates only four current packages.
- Reproduced: `packages/future-shared/src/probe.ts` importing `node:crypto`
  produced 0 lint errors.
- Use a generic `packages/*/src/**` boundary and explicit opt-outs when a package
  intentionally has a platform runtime.

### M2 — Checkout credentials remain available to executed PR code

- `.github/workflows/ci.yml:21-24` does not set `persist-credentials: false`.
- Dependency lifecycle scripts and PR-controlled lint/test/build scripts run
  afterward. The token has read-only contents permission, limiting impact, but
  persisting it is unnecessary.
- Fix: disable credential persistence.

### M3 — Commit-message enforcement is PR-only

- The PR range at `.github/workflows/ci.yml:41-46` is correct, safely quoted, and
  covers the PR commit range.
- Pushes to `main` run CI, but skip commitlint. This relies on external branch
  protection that was not verifiable from the repository.
- Fix: verify/enforce branch protection, or lint `github.event.before..sha` on
  direct pushes too.

### M4 — Local Supabase defaults are unsafe as a future linked-project baseline

- `supabase/config.toml:31` enables open signup while adult eligibility remains
  unsigned.
- `supabase/config.toml:6` exposes the `storage` schema through PostgREST, which
  can enable metadata writes outside Storage API coordination after policies are
  added.
- This is not a present live authorization flaw: docs state local-only config,
  no linked/production project exists, and no auth/data route is implemented.
- Before any config push/shared beta: make signup invite-only or enforce the
  approved server-side eligibility gate; remove direct `storage` schema exposure
  unless explicitly required and integrity-tested.

## Low Priority

None.

## Resolved Original Boundary Finding

The original straightforward static-import blocker is resolved:

- `corepack pnpm check:boundaries` → exit 0, **12/12 probes passed**.
- Covered failures include bare/prefixed Node built-ins, `server-only`, app
  package aliases, direct relative cross-app imports, React in shared code.
- Covered allowed cases include React Native in mobile and local shared imports.
- `corepack pnpm lint` → exit 0; root scripts/config plus 7 workspace package
  lint tasks passed.

Adversarial evidence prevents closing the broader safety-rail requirement:

| Probe | Expected | Actual |
| --- | --- | --- |
| Dynamic Node import in mobile TS | Reject | Allowed |
| Static Node import in mobile JS | Reject | Allowed |
| Normalized relative import into worker | Reject | Allowed |
| Node import from a future shared package | Reject | Allowed |

## CI, Dependency, and Contract Checks

- Action pins verified against official tag refs:
  - `actions/checkout@11d5960...` = `v4.4.0`;
  - `actions/setup-node@49933ea...` = `v4.4.0`;
  - `pnpm/action-setup@fc06bc...` = peeled commit of annotated `v4.4.0`.
- Commitlint probe: current commit range passed; valid conventional input passed;
  invalid untyped input failed.
- Environment CLI probes: forbidden public variable, missing worker key, and
  invalid target failed closed; dummy protected worker key passed. File-backed
  dotenv gap remains H3.
- `corepack pnpm audit --prod --audit-level=high` → exit 0, one Moderate advisory.
  Lockfile path matches the accepted report:
  `expo -> @expo/config-plugins -> xcode -> uuid@7.0.3`; no safe compatible
  upstream fix documented.
- Health endpoint matches the shared `v1` response contract. It accepts no input
  and exposes no sensitive data.
- Test report/root handoff records typecheck, 19 tests, and build passing. This
  reviewer did not rerun those three gates in this follow-up.

## Behavioral Checklist

| Check | Result | Rationale |
| --- | --- | --- |
| Concurrency | N/A | No shared mutable state, DB transaction, queue, or concurrent write path exists. |
| Error boundaries | Pass | Unexpected CLI/ESLint errors propagate nonzero; no caught-and-swallowed path found. |
| API contracts | Pass | Health route and shared contract agree on shape/nullability/timing. |
| Backwards compatibility | N/A | Greenfield private foundation; no prior public API/schema changed. |
| Input validation | Fail | File-backed environment boundary is not inspected (H3). |
| Auth/authz | N/A now | Only public health route exists; no sensitive operation. Supabase remote gate remains M4. |
| N+1/query efficiency | N/A | No application database query exists. |
| Data leaks | Fail | H3 permits build-time client secret exposure from ignored dotenv files. |
| Plan fact-check | Pass | Paths/symbols checked against source; completion checklist remains legitimately unchecked. |

Base + web + API pre-landing checklists applied in two passes. DB/auth/CSRF/N+1
items are N/A because Phase 1 has no state-changing endpoint, identity path, or
database query. The public health route needs neither auth nor rate limiting at
this foundation scope.

## Recommended Actions

1. Close H1-H3 and add adversarial regression probes.
2. Rerun uncached boundary/lint, typecheck, tests, build, and file-backed env
   checks.
3. Disable checkout credential persistence and resolve/verify direct-push
   commit policy.
4. Keep Phase 1 pending until clean GitHub runner execution, adult/legal gate,
   and required focused commits are verified.

## Metrics

- Type coverage: not measured; strict typecheck reported passing.
- Test coverage: not measured; 19 tests reported passing.
- Linting issues: 0 in requested fresh command.
- Boundary probes: 12 canonical passed; 4 adversarial bypasses reproduced.
- Production audit: 0 High/Critical; 1 accepted Moderate.

## Commit Readiness

**BLOCKED.** Current feature source is clean, but Phase 1 explicitly promises
enforced import and secret boundaries. H1-H3 show those gates can remain green
while prohibited code or a public AI secret crosses the boundary.

## Unresolved Questions

- Is `main` protected against all direct pushes and force pushes?
- Will `supabase/config.toml` remain local-only, or can it be pushed to a linked
  shared environment?
- GitHub-hosted clean-runner execution remains unverified locally.

Status: DONE_WITH_CONCERNS
Summary: Original static import blocker fixed and 12 probes/lint pass; three
adversarial boundary gaps still block commit readiness.
Concerns/Blockers: JS/dynamic import bypass, normalized relative-path bypass, and
dotenv-file secret validation gap.
