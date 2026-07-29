---
phase: 1
title: "Foundation and Delivery"
status: pending
effort: "3–5 engineer-days"
---

# Phase 1: Foundation and Delivery

## Context and outcome

Create the reproducible TypeScript workspace, development safety rails and
documentation baseline. This is a greenfield repository: no package manifest,
application, CI or environment contract exists yet.

**Depends on:** approved plan.
**Unblocks:** every later phase.

## File ownership

Create or verify/extend only in this phase:

- Root: `README.md`, `package.json`, `pnpm-workspace.yaml`, `turbo.json`,
  `tsconfig.base.json`, `eslint.config.mjs`, `prettier.config.mjs`, `.gitignore`,
  `.env.example`, `.nvmrc`, `pnpm-lock.yaml`, `commitlint.config.*`,
  `scripts/check-env.mjs`.
- Workspace skeleton: `apps/web/`, `apps/mobile/`, `apps/worker/`,
  `packages/config/`, `packages/contracts/`, `packages/design-tokens/`,
  `packages/testing/`, each with minimal manifest/source entry only.
- Delivery: `.github/workflows/ci.yml`, `.github/dependabot.yml`,
  `supabase/config.toml`, `supabase/migrations/.gitkeep`.
- Docs: `docs/project-overview-pdr.md`, `docs/code-standards.md`,
  `docs/codebase-summary.md`, `docs/system-architecture.md`,
  `docs/deployment-guide.md`, `docs/project-roadmap.md`,
  `docs/api-contract.md`, `docs/mobile-support-policy.md`,
  `docs/external-dependency-matrix.md`,
  `docs/execution-capacity-and-load-assumptions.md`,
  `docs/product-decisions/adult-eligibility.md`,
  `docs/architecture-decisions/adr-006-direct-ai-streaming.md`,
  `docs/architecture-decisions/adr-007-canonical-api-host.md`.

Existing `docs/design-guidelines.md` and `design-system/.../MASTER.md` are
read-only inputs in this phase.

## Requirements and architecture

- Use pnpm workspaces + Turborepo; pin a supported Node LTS with Corepack.
- Apps are intentionally separate runtimes: Next.js App Router web, Expo
  React Native mobile, Node TypeScript worker. Shared packages expose only
  platform-neutral types/tokens/helpers.
- Establish strict TypeScript, import boundaries, formatting, lint, unit test
  and commit-message rules before feature code. Hooks may be opt-in locally;
  CI is the enforcement point.
- Provide `.env.example` with names and comments only. `check-env` validates
  required variables by target without printing values.
- Freeze a versioned endpoint matrix and canonical Next.js API host before
  native/web work. Every endpoint records method, auth/role, input/output/error,
  idempotency, owner and known consumers.
- Define minimum iOS/Android versions, Expo `runtimeVersion`, N-1 binary support,
  team/FTE assumptions, beta workload and external account/lead-time owners.
- Adult-only launch is fail-closed until the product/legal owner signs the
  eligibility record; supporting minors requires a separately approved plan.
- `.env.example` fixes the non-secret DeepSeek contract; a rotated real key is
  injected only through local ignored env or protected deployment secrets.
- Document local bootstrap, Supabase local workflow, branch/commit policy,
  architecture decisions and the design handoff location.

## Implementation steps

1. Initialize pnpm/Turbo workspace and per-app manifests; lock package manager
   version and deterministic scripts: `lint`, `typecheck`, `test`, `build`,
   `format:check`, `check:env`.
2. Add shared TS/ESLint/Prettier config; define package export conventions and
   prohibit server-only imports from mobile/browser packages.
3. Generate minimal Next and Expo shells with a visible non-production
   placeholder, then a worker process that starts and exits cleanly. Do not
   add product screens or provider integrations yet.
4. Add GitHub CI matrix for install, format, lint, typecheck, unit tests and
   web build. Commit an integrity-checked lockfile; pin actions by commit SHA,
   set least-privilege workflow permissions, isolate fork PRs from secrets and
   fail approved high/critical dependency thresholds.
5. Add the documentation set, linking the existing research and Stitch
   artifacts; record ADR-01 through ADR-07, including direct SSE for live AI
   and Next.js as the canonical versioned API host.
6. Add environment template, local Supabase configuration and secret-ignore
   rules; test that accidental `.env` files are ignored.
7. Complete dependency matrix for Supabase staging, domains/email/OAuth,
   Apple/Google/EAS, monitoring and AI accounts. Provision only approved
   non-production dependencies required by Phase 2; production stays Phase 9.
8. Commit as small slices: workspace/config → app skeleton → CI/docs.

## Verification and acceptance

- `corepack pnpm install --frozen-lockfile`
- `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`
- `pnpm --filter @ideogram/web build` and an Expo static/type check.
- Fresh clone can follow `README.md` to install, copy `.env.example`, start
  local Supabase and launch both empty shells without a secret committed.
- CI runs the same commands from a clean runner.
- Endpoint matrix has one owner/consumer set per route; support/capacity docs
  contain numeric beta load and cost ceilings before dependent phases start.
- Fork-PR simulation receives no staging/production secret and deploy jobs use
  protected environments/short-lived identity only.

## Risks, rollback and security

- **Risk:** monorepo abstractions leak DOM/native APIs. Mitigate with package
  boundary lint and a small initial package graph.
- **Risk:** account/credential lead time blocks late phases. Track required-by
  phase, owner, cost approval and fallback in the dependency matrix.
- **Rollback:** revert the focused foundation commit; no migration/data change.
- **Security:** publishable Supabase values may appear in client config only
  when documented; service-role is worker-only, while AI keys remain
  server/worker-only and never enter Expo public env variables.

## Completion checklist

- [ ] Workspace and app skeletons run from a clean checkout.
- [ ] CI, formatting, type and test gates are green.
- [ ] Required docs and environment template are accurate.
- [ ] Adult eligibility, API host, mobile support and workload gates are signed.
- [ ] Lockfile/action pinning and fork secret isolation are enforced.
- [ ] Three or fewer focused conventional commits are created.
