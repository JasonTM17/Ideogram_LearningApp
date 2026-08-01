# Production Readiness Review: Review Submission Boundary

## Findings

### High — resolved during review

1. **RESOLVED: production DB URL validation allowed query-parameter overrides**

   **Original location:** `apps/web/src/server/learning/learning-database-environment.ts:50-63` at `da31848`

   The original validator checked the WHATWG URL authority (`username`, `password`, `hostname`) and allowlisted several `sslmode` values. Installed `pg-connection-string@2.14.0` gives query parameters precedence for effective `user`, `password`, `host`, and `port`, and honors `uselibpqcompat=true`. Therefore this previously accepted URL shape could resolve to a privileged login and unauthenticated TLS:

   ```text
   postgresql://ideogram_learning_web_login:placeholder@safe.example/learning
     ?sslmode=require
     &user=postgres
     &password=<admin-password>
     &host=admin.example
     &uselibpqcompat=true
   ```

   Empirical parser probe resolved `user=postgres`, `host=admin.example`, and `ssl.rejectUnauthorized=false`. This defeats both advertised invariants: dedicated least-privilege login and verified database identity. A compromised web runtime would then hold an administrator credential even though the normal repository path later executes `SET LOCAL ROLE`.

   **Resolution:** `70ba319` first made unknown `NODE_ENV` modes fail closed. `ea02210` now permits exactly one production query parameter, exactly `sslmode=verify-full`; duplicate modes, weaker modes, and every override key—including the reproduced malicious URL—are rejected. Fresh focused test: 24/24 pass. Re-review found no bypass in the replacement logic.

### High — resolved after final hardening

2. **RESOLVED: existing login provisioning now rejects privilege drift**

   **Location:** `supabase/production-learning-api-login.sql:17-36`

   The existing-role branch checks direct role attributes but not `pg_auth_members`. `NOINHERIT` removes automatic privilege inheritance; it does not prevent the login from using `SET ROLE` for memberships granted with the default SET option. A stale `ideogram_learning_web_login` that is already a member of `service_role`, `postgres`, or another privileged role passes this script unchanged. Direct object grants/ownership are also not audited. The fresh local role probe is clean, so this is not a current local exploit; it is unsafe production drift handling.

   **Resolution:** the provisioning SQL now rejects any login membership other
   than a non-admin `app_learning_api_executor` membership, any membership held
   by the executor, direct ACL grants, and object/database/extension/default-ACL
   ownership. It was proven locally with injected membership, executor
   `ADMIN OPTION`, and direct database `CONNECT` probes; each failed with
   `42501`, was reverted, and a clean rerun passed. Failure is intentional: the
   script never silently revokes unknown production privileges.

### Medium — informational for this internal slice, required before production

3. **Authenticated request floods can monopolize the two-connection mutation pool**

   **Location:** `apps/web/src/app/api/v1/learning/reviews/submit/route.ts:37-67`; `apps/web/src/server/learning/learning-executor-pool.ts:30-39`

   Any active learner can send unlimited unique idempotency keys. The per-learner advisory lock correctly serializes writes, but queued calls still occupy the bounded pool until the two-second lock timeout. One buggy or hostile invited account can therefore make unrelated learners receive 503 responses. Idempotency prevents duplicate credit, not resource exhaustion.

   **Fix:** before public beta, enforce an identity-aware distributed/ingress rate limit before pool acquisition, plus global concurrency/load shedding. Do not use process-local counters as the only serverless control. Track with Phase 8/9 capacity and observability gates.

4. **RESOLVED: database regressions are configured for CI and cleanup is exception-safe**

   **Location:** `package.json:24-25`; `.github/workflows/ci.yml:70-82`; `apps/web/scripts/review-role-lock-order.integration.mjs:122-125,176-192`

   Neither the two-client harness nor `review_idempotency_test.sql` runs in CI, so a future lock-order regression leaves normal `pnpm test` green. In addition, four clients are acquired before the outer `try`; a later `connect()` failure leaks earlier clients. If `cleanupFixture()` throws inside `finally`, remaining releases and `pool.end()` are skipped, which can hang CI and leave the fixture transaction open.

   **Resolution:** `.github/workflows/ci.yml` now starts local Supabase in a
   separate database job, loads the ephemeral URL without printing it, runs
   pgTAP and the lock harness, then stops Supabase with `always()`. The harness
   now acquires nullable clients inside the outer `try`, rolls back failed
   cleanup, aggregates test/cleanup errors, releases every acquired client, and
   always attempts `pool.end()`. The configured workflow still needs its first
   hosted-green run before it becomes release evidence.

### Low — informational

5. **Unexpected route failures have a request ID but no server-side diagnostic event**

   **Location:** `apps/web/src/app/api/v1/learning/reviews/submit/route.ts:66-67`

   Unknown DB/config/receipt errors are safely converted to a generic 503, but the endpoint emits no structured error log or metric tied to `requestId`. Missing credentials, pool exhaustion, schema drift, and receipt-contract failures are indistinguishable operationally.

   **Fix:** in the shared error boundary, record a secret-safe event containing request ID, route, error class, stable PostgreSQL code, latency, and outcome. Never log connection strings, SQL messages, tokens, or request payloads. Complete under Phase 8 observability.

## Code Review Summary

### Scope

- Original base/head: `c1bca88..da31848`; fix re-review through `ea02210`
- Reviewed: 21 code/config/test files, 1,610 additions, 1 deletion
- Excluded: unrelated prior feature work and current uncommitted docs
- Context read: committed `README.md`, code standards, plan, Phases 3–4; tester report used only as historical evidence
- Focus: review route, API client, pg executor, error mapping, privileges, migrations, concurrency harness, tests
- Scout/dependent paths verified: shared review contracts, canonical fingerprint serializer, private RPC, review tables/indexes, identity role-epoch trigger, RLS/grants, mutation policy, auth helper, API response boundary, CI workflow

### Overall Assessment

**No remaining blocking defect after `ea02210`; the internal-beta write boundary is ready to land.** The original least-privilege/TLS validation bypass was reproduced, fixed, regression-tested, and re-reviewed. The review submission data path is coherent: verified identity is server-bound, permission is rechecked transactionally, inputs/outputs are strict, SQL is parameterized, one pg client owns the complete transaction, rollback failure destroys the client, idempotency is database-backed, and the corrected role-first lock order removes the reproduced deadlock cycle.

Findings 3 and 5 do not invalidate the internal-beta functional slice, but they
remain release gates before production traffic.

## Stage 1 — Spec Compliance

| Requirement | Status | Evidence |
|---|---|---|
| Phase 4 owns Next learning mutation route | PASS | `POST /api/v1/learning/reviews/submit` implemented under web app |
| Verified user bound server-side | PASS | Route uses `authenticateSupabaseRequest`; client cannot submit `userId` |
| Cookie CSRF and native bearer policy | PASS | Shared bounded JSON policy requires same-origin cookie requests; bearer remains usable by native |
| Strict public input/output contracts | PASS | Zod strict input; DB row and public receipt parsed independently |
| Server-computed idempotency hash | PASS | SHA-256 of canonical serializer; all public review fields included |
| Private transactional mutation | PASS | One checked-out pg client; `BEGIN` → local executor role/timeouts → RPC → `COMMIT` |
| Active account and learner permission rechecked in transaction | PASS | `account_roles` then `profiles`, both locked; item/release/enrollment checked in private RPC |
| Retry/concurrent safety | PASS | Advisory per-user serialization, uniqueness constraints, replay receipt, 42 pgTAP assertions, two-client lock harness |
| No-store learner receipt | PASS | Receipt excludes internal payload/provenance; success and error responses use no-store/request ID |
| Production DB config enforces dedicated verified connection | PASS | `ea02210` allows only authority-bound dedicated login plus exactly `sslmode=verify-full`; override regression passes |
| Existing DB login drift fails closed | PASS | Provisioning probe rejects injected membership, executor ADMIN OPTION, and direct database ACL grant |
| Database regression is CI-configured | PASS WITH HOSTED-EVIDENCE GAP | Local Supabase pgTAP and lock harness are declared in a dedicated CI job |

Full review UI, browser E2E/a11y, real corpus rights approval, and public deployment remain explicitly incomplete in Phases 3–4. They are plan work, not missing requirements of this API slice.

## Stage 2 — Two-Pass Checklist Review

### Pass 1: security/correctness

- Injection/data safety: SQL parameters only; no HTML/command/file sink.
- Auth/authz: identity checked at route; learner role, profile state, item ownership, release, enrollment checked inside DB transaction.
- Concurrency: per-user advisory lock; idempotency/device/receipt unique constraints; authorization/revocation use consistent row-lock order.
- Error boundaries: known domain errors are exact code+message allowlisted; unknown same-SQLSTATE failures remain generic 503.
- Data exposure: no internal DB message, stack, credential, answer key, or payload hash returned.
- Input limits: shared reader caps JSON at 65,536 bytes; strict schema rejects extra/malformed fields.
- Effective pg identity/TLS override defect: resolved by strict query allowlist in `ea02210`.

### Pass 2: quality/operations

- API compatibility: additive route and response parser; private RPC signature unchanged; migrations preserve function ownership/grants.
- Query efficiency: bounded constant-count queries, indexed ownership/idempotency lookups, no loop/N+1 path.
- Type safety: no `any` escape in changed production code; DB values treated as unknown and parsed.
- Supply chain: `pg@8.22.0` pinned; production audit reports no known vulnerabilities.
- Operations/test gaps: Findings 3 and 5; the new database CI job requires a
  hosted-green run before release evidence exists.

## Stage 3 — Adversarial Review

| Finding | Verdict | Reason |
|---|---|---|
| Query parameters override validated DB identity/TLS | **ACCEPT → RESOLVED** | Reproduced against installed parser; `ea02210` rejects the attack and focused regression passes |
| Existing login may retain privileged memberships | **ACCEPT → RESOLVED** | Provisioning SQL rejects membership, executor ADMIN OPTION, ACL, and ownership drift; local negative probes pass |
| Authenticated flood exhausts mutation pool | **DEFER — Phase 8/9 release gate** | Real resource-exhaustion path; invite-only internal slice limits present exposure |
| DB concurrency tests absent from CI; cleanup can leak | **ACCEPT → RESOLVED** | Dedicated Supabase CI job and exception-safe cleanup are present; hosted run remains unobserved |
| Generic 503 has no diagnostic event | **DEFER — Phase 8** | No data leak, but production incident diagnosis is blind |
| Bearer mutation without Origin is CSRF bypass | **REJECT** | Bearer token is explicit non-ambient native auth; cookie path requires Origin and same-site checks |
| Unknown PostgreSQL errors are disguised as learner errors | **REJECT** | `da31848` requires exact SQLSTATE + primary message; tests prove unexpected messages propagate to generic 503 |
| Revocation/mutation still has account-role/profile deadlock | **REJECT** | Role-first order matches trigger order; fresh two-client harness and pgTAP pass |
| Rollback failure returns poisoned client to pool | **REJECT** | Failed rollback sets `destroyClient=true`; `release(true)` discards it |

## Verification Evidence

- Focused web tests: 42/42 pass
- Post-fix database environment tests: 24/24 pass
- API client tests: 6/6 pass
- Root environment tests: 9 pass, 1 intentional Windows skip
- pgTAP review suite: 42/42 pass
- Genuine lock-order harness: pass
- Existing-login membership, executor ADMIN OPTION, and direct-ACL provisioning probes: rejected then cleanly reverted
- Database CI job: configured; hosted execution not yet observed
- Web ESLint: 0 issues
- Web TypeScript: pass
- `pnpm audit --prod`: no known vulnerabilities
- Final workspace gates: format, lint, typecheck, 423 passed with 1 intentional skip, and build pass
- Secret pattern scan at `da31848`: no committed `sk-*` token match
- `git diff --check c1bca88..da31848`: code clean; related committed journal has three Markdown trailing-space/hard-break warnings, excluded from code findings
- Coverage percentage: not generated
- Full build: not rerun by this reviewer; controller/tester owns final full-gate evidence

## Recommended Actions

1. Gate public beta on distributed rate limiting, metrics, and secret-safe error telemetry.
2. Confirm the database CI job on its first remote run before counting it as release evidence.
3. Continue Phase 4 with review queue/card/summary UI after this write boundary lands.

## Checklist Completion

- [x] Concurrency and async ordering checked
- [x] Error propagation/rollback paths checked
- [x] API request/response contracts checked
- [x] Backward compatibility checked
- [x] External input validation checked
- [x] Authentication and authorization checked independently
- [x] Query count/index/N+1 risks checked
- [x] Data/secret/internal-error exposure checked
- [x] Plan claims grep-verified against code

## Unresolved Questions

- Which production database endpoint/CA contract will be used, so `verify-full` can be made mandatory without an undocumented exception?
- Which administrator owns remediation if the production role-drift probe fails?
- Which ingress/distributed rate-limit service is the Phase 8 owner?

Status: DONE_WITH_CONCERNS

Summary: Review submission path and post-review config fix are sound; original dedicated-login/TLS bypass is resolved.

Concerns/Blockers: No remaining slice blocker. Distributed rate limiting,
secret-safe telemetry, and hosted database-CI evidence remain production-release
gates.
