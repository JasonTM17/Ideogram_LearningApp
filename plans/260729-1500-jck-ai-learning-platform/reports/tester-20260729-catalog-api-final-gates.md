---
title: Final catalog/API/docs gates
date: 2026-07-29
status: complete
scope: secure catalog/API/docs slice
---

# Final catalog/API/docs gates

## Summary

Result: code, build, Supabase tests, project-schema lint, audit, and docs checks
passed. The catalog RPC in source is `public.get_learner_catalog_data()`, and
the docs are aligned with that contract. All 9 docs-validator warnings were
false positives after grep verification. An additional all-schema lint sweep
reported errors only inside bundled pgTAP extension objects.

No source files were modified in this pass.

## Gate results

| Command | Result | Evidence |
| --- | --- | --- |
| `pnpm format:check` | Pass | `All matched files use Prettier code style!` |
| `pnpm lint` | Pass | `10 successful, 10 total` packages |
| `pnpm typecheck` | Pass | `10 successful, 10 total` packages |
| `pnpm test` | Pass | Root: `3` files, `17` passed, `1` skipped; workspace: `10/10` packages green, `128` tests passed (`145` passed total) |
| `pnpm --filter @ideogram/web build` | Pass | Next build completed; routes generated for `/`, `/api/v1/health`, `/api/v1/learning/catalog` |
| `supabase migration list --local` | Pass | `9` migrations listed, local and remote aligned |
| `supabase test db --local supabase/tests` | Pass | `7` files, `211` tests, `All tests successful` |
| `supabase db lint --local --schema public,private --level error --fail-on error` | Pass | Project schemas returned `No schema errors found` |
| All-schema `supabase db lint` diagnostic | Tooling warning | Bundled pgTAP extension functions raised missing-relation / missing-operator errors (`__tcache__`, `__tresults___numb_seq`, `is(text, integer, text)`, `proisagg`, `spclocation`, `row_eq`) |
| `pnpm audit --prod --json` | Pass | `0` vulnerabilities across `529` total dependencies |
| `node .claude/scripts/validate-docs.cjs docs/` | Pass | `19` files checked, `9` code-reference warnings; all 9 verified false positives with source grep |
| `git diff --check` | Pass | No whitespace / conflict-marker issues reported |

## Test/build notes

- Build used temporary process-only env values only:
  - `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable-key`
  - `APP_ORIGIN=http://127.0.0.1:3000`
- No secrets were printed or persisted.

## Docs validator review

False positives verified with `rg`:

- `LearnerCatalogResponse` exists in code:
  - `packages/contracts/src/learning/learner-catalog-contract.ts`
  - `packages/api-client/src/learning/learning-api-requests.ts`
  - `apps/web/src/server/learning/learner-catalog-assembler.ts`
  - `apps/web/src/app/api/v1/learning/catalog/route.ts`
- `getUser()` warnings are false positives for method-call syntax; code uses `client.auth.getUser(...)` in `apps/web/src/lib/supabase/request-auth.ts`.
- `Pragma` and `Expires` warnings are false positives; both header names exist in `apps/web/src/server/http/api-response.ts`.
- `LearnerCatalogResponse` warnings are false positives because the symbol exists in:
  - `packages/contracts/src/learning/learner-catalog-contract.ts`
  - `packages/api-client/src/learning/learning-api-requests.ts`
  - `apps/web/src/server/learning/learner-catalog-assembler.ts`
  - `apps/web/src/app/api/v1/learning/catalog/route.ts`

RPC verification:

- `supabase/migrations/20260729203000_harden_learner_catalog_structure.sql` creates `public.get_learner_catalog_data()`, grants it to `authenticated`, and drops `public.get_learner_catalog_activities()`.
- `apps/web/src/server/learning/learner-catalog-repository.ts` calls `client.rpc('get_learner_catalog_data')`.
- `supabase/tests/learner_catalog_security_test.sql` asserts the old `public.get_learner_catalog_activities()` path is absent.

## Recommendations

1. Keep the current docs as-is; they match the implemented catalog RPC.
2. Keep production lint scoped to `public,private`; treat the all-schema pgTAP
   diagnostics as a local extension/toolchain limitation.
3. Use this QA report as the proof point for the current green gate state.

## Unresolved questions

None.
