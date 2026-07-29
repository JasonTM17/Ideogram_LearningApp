# Code Review Summary

## Scope

- Review: final production-readiness review of the uncommitted learner catalog security and HTTP API slice
- Files: 38 route, server, Supabase migration/test, contract, API-client, and web-test files
- LOC: 4,458
- Method: scout-first review, then two-pass critical and informational checklists
- Follow-up scope: H1/H2 changes in the catalog hardening migration and catalog pgTAP file
- Verdict: **PASS FOR REVIEWED SLICE — 0 remaining Critical or High blockers; H1 and H2 resolved**

## Overall Assessment

The initial review blocked landing on two High defects. Focused follow-up verified both fixes in source, the live local database catalog, exact boundary probes, and a 36-test transactional pgTAP run. Authentication, authorization, raw-table isolation, nested-field projection, release-tree integrity, payload validation, aggregate budgeting, error normalization, and assembler complexity are now sound in the reviewed slice.

## Follow-up Resolution

### H1 resolved — complete published branches are enforced and legacy data fails closed

- `private.require_learner_catalog_release_structure` rejects every published unit without a published lesson and every published lesson without a published activity: `supabase/migrations/20260729203000_harden_learner_catalog_structure.sql:522-575`.
- The publication trigger invokes that validator before a release becomes published: migration lines `578-597`.
- The migration audits every existing published activity and release before completing: migration lines `599-627`.
- Existing lifecycle enforcement already rejects zero-item releases, serializes publication against child writes, and prevents mutation beneath a published release: `supabase/migrations/20260729190000_language_content_schema.sql:269-297,415-447,471-503,646-656`.
- Existing pgTAP proves published-child updates and late child insertion are rejected: `supabase/tests/learning_rls_test.sql:477-520`.
- Mixed complete/empty branch regressions prove both rejection paths: `supabase/tests/learner_catalog_security_test.sql:383-545`.

### H2 resolved — payload expansion and final response size are bounded in PostgreSQL

- Activity-type validators enforce required public fields, object/array types, UTF-16 string limits, and cardinality caps before publication; published legacy payloads are audited: migration lines `196-520,599-615`.
- The final fully projected aggregate is measured with `octet_length` and rejected above exactly 524,288 bytes inside `public.get_learner_catalog_data()`: migration lines `724-740,790-960`.
- Regression cases reject the original 20,000-element amplification shape, a missing required field, and a non-BMP UTF-16 overflow: test lines `546-658`.
- A separate aggregate fixture keeps the raw preflight under budget but proves the authenticated public RPC rejects the projected response: test lines `874-985`.
- Reviewer boundary probes confirmed 524,288 bytes passes and 524,289 bytes raises `Learner catalog response exceeds the 512 KiB endpoint budget.`
- Live `pg_proc` inspection confirmed owner-only ACLs for H1/H2 helpers, authenticated-only execution for the public RPC, `app_security_definer` ownership, and pinned `search_path` values. Source revocations are at migration lines `973-1040`.

Scout identified that pgTAP does not replay a corrupt pre-migration database, exhaustively mutate every payload field, or assert every `pg_proc.proconfig` value. These are regression-depth opportunities, not unresolved runtime defects: the migration audit is explicit, older immutable-content/root-lock triggers close post-publication races, validator branches were source-checked, and live ACL, `search_path`, UTF-16, and exact-byte behavior were independently probed.

## Critical Issues

None found. No remaining auth bypass, raw-table read path, or nested answer/provenance leak was identified.

## High Priority

### H1 — Initial blocker: publication permitted an incomplete branch (resolved)

The release publication trigger validates only that a release has at least one unit, lesson, and activity globally and that existing rows are published. It does not require every published unit to contain a lesson or every published lesson to contain an activity:

- `supabase/migrations/20260729190000_language_content_schema.sql:415-447`
- The catalog RPC returns every published unit and lesson: `supabase/migrations/20260729203000_harden_learner_catalog_structure.sql:892-934`
- The public contract requires at least one activity per lesson and one lesson per unit: `packages/contracts/src/learning/learner-catalog-contract.ts:56-75`

Empirical check in a rolled-back local transaction: a release with two published units and content only beneath the first unit published successfully; the RPC returned `unit_count=2`, `lesson_count=1`, and `exposes_empty_unit=t`.

Impact: one incomplete published branch makes strict catalog assembly fail and the route returns a generic 503 to every active learner.

Required fix was completed. See **Follow-up Resolution** for the new per-branch validator, migration audit, and both regression cases.

### H2 — Initial blocker: raw-payload budgeting allowed projection amplification (resolved)

The database budget measures stored payload bytes, but the projection helpers expand unbounded nested arrays into larger JSON objects:

- Raw payload measurement and 384 KiB threshold: `supabase/migrations/20260729203000_harden_learner_catalog_structure.sql:646-649,710-717`
- Unbounded example, option, question, and vocabulary expansion: `supabase/migrations/20260729203000_harden_learner_catalog_structure.sql:50-55,75-80,101-106,129-134`
- Direct authenticated RPC grant: `supabase/migrations/20260729203000_harden_learner_catalog_structure.sql:1040`
- The 512 KiB Node guard runs only after the RPC response is received and assembled: `apps/web/src/server/learning/learner-catalog-budget.ts:34-44`

Empirical check in a rolled-back local transaction: an `objective_quiz` with 20,000 numeric question elements had a 60,015-byte stored payload, published successfully, and projected into 20,000 question objects totaling 1,101,430 bytes.

Impact: an authenticated direct RPC caller and the canonical route both materialize the oversized result before the Node response guard can reject it. This defeats the intended aggregate response budget and creates avoidable memory/latency pressure.

Required fix was completed. See **Follow-up Resolution** for publication validation, the final database aggregate guard, and adversarial regression evidence.

## Medium Priority

None actionable.

## Low Priority

None actionable.

## Prior Finding Disposition

| Prior finding | Disposition | Evidence |
|---|---|---|
| Authenticated raw catalog-table `SELECT` exposure | Resolved | Raw `SELECT` revoked at `20260729203000_harden_learner_catalog_structure.sql:1044-1051`; pgTAP checks effective privileges and actual denied reads at `learner_catalog_security_test.sql:660-690,750-760`. |
| Shallow payload projection leaked nested internal fields | Resolved | Deep allowlist projectors at migration lines `19-194`; marker-based nested absence assertions at `learner_catalog_security_test.sql:783-800`; strict discriminated server schemas add a second boundary. |
| Visible path without a visible release caused assembler failure | Resolved | `visible_paths` derives from `visible_releases` at migration lines `823-831`; pgTAP invariant at `learner_catalog_security_test.sql:771-782`. |
| O(n²) grouping | Resolved | Map-based single-pass grouping in `learner-catalog-assembler.ts:28-37`; remaining sorting is bounded O(n log n). |
| No aggregate response budget | Resolved in follow-up | Final projected JSON is rejected above 524,288 bytes inside the public RPC at migration lines `724-740,834-960`; pgTAP wiring and exact reviewer boundary probes passed. |
| Missing private-helper and unit/lesson metadata pgTAP assertions | Resolved | Helper privilege assertions at current test lines `704-744`; internal unit, lesson, release, and activity field exclusions at lines `829-868`. |

## Edge Cases Found by Scout

- Initial: a globally non-empty release could contain an empty published unit or lesson. Resolved by per-branch publication validation plus legacy audit.
- Initial: a small malformed stored array could project into an aggregate larger than both intended response budgets. Resolved by type/cardinality validation plus the final projected-response guard.

## Risk Checklist

- Concurrency/state: endpoint is read-only; no shared mutable process state or async ordering defect found.
- Error boundaries: credential failures normalize to 401; repository/provider/schema failures normalize to generic 503 without stack or provider-detail exposure.
- API contracts/backwards compatibility: the HTTP route and learner contract are additive. No repository caller of the removed legacy public RPC was found. Publication invariants now match non-empty unit/lesson contract arrays.
- Input validation: GET has no body; authorization header format and length are bounded. Persisted learner-visible payload fields are now validated at the database boundary.
- Auth/authz: strict bearer-or-cookie authentication, `auth.getUser()`, active-account recheck in the RPC, anonymous denial, and raw-table revocation verified.
- Query efficiency: no N+1 route loop or quadratic grouping found; catalog result counts and nested payload arrays are bounded.
- Data exposure: deep projection and strict schemas prevent reviewed nested internal answer/provenance fields from reaching clients.

## Verification

- `pnpm --filter @ideogram/web test`: 47/47 passed
- `pnpm --filter @ideogram/contracts test`: 25/25 passed
- `pnpm --filter @ideogram/api-client test`: 10/10 passed
- Focused Supabase pgTAP: 53/53 passed
- Web typecheck: passed
- Targeted web/contracts/API-client lint: 0 issues
- Web production build with process-only local placeholders: passed
- Follow-up reviewer run, `learner_catalog_security_test.sql`: 36/36 passed
- Worker-provided clean reset and full Supabase suite: 7 files, 211/211 passed
- Live local ACL/owner/`search_path` catalog inspection: passed
- Exact database budget probes: 524,288-byte pass; 524,289-byte rejection

The new tests exercise both H1 rejection paths, the original H2 amplification input, required-key and UTF-16 failures, and final public-RPC budget wiring.

## Metrics

- Type coverage: not separately collected; strict web typecheck passed
- Test coverage: not separately collected; 82 package tests, 53 initial focused database tests, 36 follow-up catalog tests, and the 211-test full database suite passed
- Linting issues: 0 in reviewed packages

## Recommended Actions

1. No remaining blocker in the reviewed catalog API/security slice.
2. Optional hardening: add direct pgTAP assertions for exact 524,288/524,289-byte boundaries and live `pg_proc.proconfig` values to make future regression detection as strong as this review's direct probes.

## Unresolved Questions

None.
