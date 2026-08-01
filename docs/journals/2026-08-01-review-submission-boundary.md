# Review Submission Boundary

**Date**: 2026-08-01 23:45  
**Severity**: High  
**Component**: learning review submission path, DB executor boundary, authz recheck  
**Status**: Resolved

## What Happened

We landed the review-submission boundary in stages: dedicated `LEARNING_DATABASE_URL` login provisioning, a pooled executor that runs `SET LOCAL ROLE app_learning_api_executor` inside the same client transaction, a server-side canonical SHA-256 payload hash, and a DB function that rechecks active profile plus learner role before mutating progress. The first pass had a real authorization gap: the route was validating identity, but the DB mutation path still needed the role-state fix that landed in `c5262c7`.

## The Brutal Truth

This is the sort of boundary work that feels clean only if you ignore the trapdoors. Route-only authz would have been cosmetic. Direct client writes would have thrown away the executor boundary entirely. Reusing `service_role` would have been a blunt privilege escalation. The frustrating part is that the first version looked complete until the revocation case was tested and exposed the missing learner-role recheck.

## Technical Details

Evidence from `c1bca88..c5262c7`:

- `apps/web/src/server/learning/learning-database-environment.ts` now requires `LEARNING_DATABASE_URL` and rejects malformed non-Postgres URLs.
- `apps/web/src/server/learning/learning-executor-pool.ts` acquires one `pg` client, opens `BEGIN`, sets local role/statement and lock timeouts, then commits or rolls back on the same client.
- `apps/web/src/server/learning/review-submission-repository.ts` hashes the serialized review payload with SHA-256 before calling `private.submit_review_event(...)`.
- `supabase/migrations/20260801070000_require_active_learner_role.sql` rechecks both `public.profiles` and `public.account_roles` in the same transaction and locks the rows with `FOR UPDATE`.

Validation was not hand-wavy: `pnpm test` passed with `404 passed, 1 skipped, 0 failed`, `pnpm build` passed, `pnpm audit --prod` found no vulnerabilities, and `supabase test db supabase/tests/review_idempotency_test.sql` passed `41 tests`.

## What We Tried

We rejected `service_role`, direct client writes, and route-only authorization because they all move trust to the wrong layer. We kept the executor boundary, kept the hash canonical on the server, and fixed the DB recheck instead of pretending the route could enforce revocation safely.

## Root Cause Analysis

The root mistake was trusting the application edge more than the database truth. The bug was not lack of validation; it was validation in the wrong place. Once role revocation became part of the model, the mutation had to reauthorize inside the transaction that actually writes state.

## Lessons Learned

If the database is the thing that mutates learning state, the database must also be the thing that rechecks permission state. Anything else is theater. Also: a passing happy-path test is not evidence of authz correctness until the revoked-role path exists and fails the right way.

## Next Steps

Production still needs a real DB credential story, Docker image publishing, and the remaining AI/mobile work. The current boundary is solid enough to build on, but it is not the full product yet.

## Unresolved Questions

- Which production secret manager will own the final `LEARNING_DATABASE_URL` login?
- Do we provision Docker Hub publication in the same release train as the next mobile shell milestone?
- Should the next review gate add an explicit revoked-role integration test at the HTTP layer, not only in pgTAP?
