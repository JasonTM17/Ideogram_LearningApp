# Docs Accuracy Report

## Current State Assessment

- The learner catalog implementation is real and matches the route/auth/migration/test story in the main docs.
- `docs/api-contract.md`, `docs/authentication-guide.md`,
  `docs/codebase-summary.md`, `docs/code-standards.md`,
  `docs/content-governance.md`, `docs/deployment-guide.md`,
  `docs/project-roadmap.md`, `docs/security-and-privacy-baseline.md`,
  `docs/system-architecture.md`, `docs/design-guidelines.md`, and
  `docs/project-overview-pdr.md` match the current source.

## Changes Made

- Created this report only.
- No code, tests, or existing docs were modified.

## Validation

Source checked:

- `README.md`
- `AGENTS.md`
- `docs/api-contract.md`
- `docs/authentication-guide.md`
- `docs/codebase-summary.md`
- `docs/code-standards.md`
- `docs/content-governance.md`
- `docs/deployment-guide.md`
- `docs/project-roadmap.md`
- `docs/security-and-privacy-baseline.md`
- `docs/system-architecture.md`
- `docs/design-guidelines.md`
- `apps/web/src/app/api/v1/learning/catalog/route.ts`
- `apps/web/src/lib/supabase/request-auth.ts`
- `apps/web/src/server/http/api-response.ts`
- `apps/web/src/server/learning/learner-catalog-repository.ts`
- `apps/web/src/server/learning/learner-catalog-assembler.ts`
- `apps/web/src/server/learning/learner-catalog-integrity.ts`
- `apps/web/src/server/learning/learner-catalog-budget.ts`
- `supabase/migrations/20260729203000_harden_learner_catalog_structure.sql`
- `apps/web/src/app/api/v1/learning/catalog/route.test.ts`
- `apps/web/src/lib/supabase/request-auth.test.ts`
- `apps/web/src/server/http/api-response.test.ts`
- `apps/web/src/server/learning/learner-catalog-repository.test.ts`
- `apps/web/src/server/learning/learner-catalog-assembler.test.ts`
- `supabase/tests/learner_catalog_security_test.sql`
- `supabase/tests/learning_rls_test.sql`

Confirmed behavior:

- `GET /api/v1/learning/catalog` is implemented in Next.js.
- The route authenticates through `authenticateSupabaseRequest()`, which calls Supabase Auth `getUser()`.
- The repository reads only `get_learner_catalog_data()`.
- The migration defines the safe aggregate RPC, the projected catalog payload,
  the 36/360/600/600/384 KiB preflight checks, and the exact 512 KiB projected
  response cap.
- Publication validates complete unit/lesson branches plus projected payload
  shapes and UTF-16 string bounds.
- The route returns `401` for rejected credentials, `503` for unexpected auth or repository failure, and private no-store headers with an opaque `X-Request-Id`.
- Tests cover auth rejection, repository failure masking, catalog assembly integrity, payload projection, and RLS / RPC hardening.

## Gaps

- No source-backed mismatch remains after the publication-invariant and
  exact-response-budget sync.

## Recommendations

1. Keep `docs/project-overview-pdr.md` and `docs/api-contract.md` in sync if the route set changes again.
2. Recheck downstream summaries only when new endpoints land.

## Metrics

- Requested docs checked: 8
- Adjacent architecture/governance docs checked: 3
- Adjacent PDR checked: 1
- Accurate against source: 12/12
- Stale statements found: 0

## Unresolved Questions

- None.
