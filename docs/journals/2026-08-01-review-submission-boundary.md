# Review Submission Boundary

**Date**: 2026-08-01 23:45  
**Severity**: High  
**Component**: learning review submission path, DB executor boundary, authz recheck  
**Status**: Resolved

## What Happened

We landed the review-submission boundary in stages: dedicated `LEARNING_DATABASE_URL` login provisioning, a pooled executor that runs `SET LOCAL ROLE app_learning_api_executor` inside the same client transaction, a server-side canonical SHA-256 payload hash, and a DB function that rechecks active profile plus learner role before mutating progress. The first pass had a real authorization gap: the route validated identity, but the DB mutation still needed the role-state fix in `c5262c7`. The next scout found a second defect: that fix locked `profiles` before `account_roles`, while role revocation locked the same rows in the opposite order through its epoch trigger. A two-connection regression reproduced `40P01 deadlock detected`; `c91bb61` aligned both paths to `account_roles` then `profiles`. A production audit then reproduced a connection-string parser override that could replace the checked login/TLS settings; `ea02210` made the URL query allowlist exact and fail closed.

## The Brutal Truth

This is the sort of boundary work that feels clean only if you ignore the trapdoors. Route-only authz would have been cosmetic. Direct client writes would have thrown away the executor boundary entirely. Reusing `service_role` would have been a blunt privilege escalation. The frustrating part is that two polished versions looked complete: the first missed the learner-role recheck; the second added it with a deadlock-prone lock order. Only real concurrency exposed the second failure.

## Technical Details

Evidence from `c1bca88..ea02210`:

- `apps/web/src/server/learning/learning-database-environment.ts` now requires `LEARNING_DATABASE_URL` and rejects malformed non-Postgres URLs.
- `apps/web/src/server/learning/learning-executor-pool.ts` acquires one `pg` client, opens `BEGIN`, sets local role/statement and lock timeouts, then commits or rolls back on the same client.
- `apps/web/src/server/learning/review-submission-repository.ts` hashes the serialized review payload with SHA-256 before calling `private.submit_review_event(...)`.
- `supabase/migrations/20260801070000_require_active_learner_role.sql` rechecks both authorization rows in the same transaction; `supabase/migrations/20260801075547_align_learning_authorization_lock_order.sql` locks `public.account_roles` before `public.profiles` to match revocation.
- `supabase/production-learning-api-login.sql` now rejects unsafe existing-login memberships, direct ACL grants, and ownership drift; the local membership and direct-grant probes both failed as intended before clean remediation.
- The database CI job runs pgTAP and the lock-order regression against local Supabase; its first hosted result remains a release-evidence gate.

Validation was not hand-wavy: the focused environment contract passed `24/24`, pgTAP passed `42/42`, both provisioning drift probes were rejected and reverted, and `pnpm test:db:review-lock-order` passed after reproducing `40P01` before the lock-order fix. The final workspace gate result is recorded with the delivery commit.

## What We Tried

We rejected `service_role`, direct client writes, and route-only authorization because they all move trust to the wrong layer. We kept the executor boundary, kept the hash canonical on the server, and fixed the DB recheck instead of pretending the route could enforce revocation safely.

## Root Cause Analysis

The first root mistake was trusting the application edge more than the database truth. The second was adding correct row locks without tracing the existing trigger's lock order. Authorization belongs in the write transaction, and every path touching the same rows must acquire them consistently.

## Lessons Learned

If the database mutates learning state, it must recheck permission state. Anything else is theater. A passing revoked-role test is still not concurrency evidence; lock-order changes need at least two live connections and a deterministic wait condition.

## Next Steps

Production still needs a real DB credential/CA story, distributed rate limiting, secret-safe error telemetry, a hosted database-CI run, Docker image publishing, and the remaining AI/mobile work. The current boundary is solid enough to build on, but it is not the full product yet.

## Unresolved Questions

- Which production secret manager will own the final `LEARNING_DATABASE_URL` login?
- Do we provision Docker Hub publication in the same release train as the next mobile shell milestone?
- Should the next review gate add an explicit revoked-role integration test at the HTTP layer, not only in pgTAP?
