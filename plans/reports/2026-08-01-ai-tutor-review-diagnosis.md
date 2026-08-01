# AI tutor boundary review diagnosis

## Scope

Review target: `e85e6fc..559290a` (AI contracts, DeepSeek gateway, private
turn ledger, authenticated route, and documentation). Local workspace gates and
the latest GitHub CI/container workflows were green before this review.

## Confirmed root causes

| Finding | Reproduction | Expected | Actual | Root cause |
|---|---|---|---|---|
| Stale provider attempt can win | Begin a turn, let the 60-second lease expire, begin the same turn again, then complete the first provider call | Only the current attempt may complete | The first call can update the reclaimed row because completion checks identity/hash/state only | Completion/failure RPCs have no attempt lease token (`supabase/migrations/20260801180000_ai_tutor_turn_ledger.sql`) |
| Deletion and AI reservation can interleave | Start tutor reservation while a deletion worker freezes/purges the same learner | One shared lifecycle lock serializes both paths | AI uses lock namespace 7210 while purge uses 7201-7204 | No common lifecycle lock at deletion freeze (`20260729102624_identity_baseline.sql`, `20260729190001_learning_progress_and_review.sql`) |
| Chunked provider body bypasses cap | Return a chunked response without `Content-Length` larger than 128 KiB | Read at most the configured cap and honor abort | `response.text()` buffers before the cap and has no reader abort guard | The gateway does not consume `Response.body` incrementally |
| Client can import provider package | Add `import '@ideogram/ai'` to a mobile/client module | Build fails at the runtime boundary | Existing import-boundary rule does not classify shared `@ideogram/ai` as server-only | No package-level server-only boundary/probe |
| Replay fails after policy/config change | Complete a turn, disable AI/revoke consent/archive language pack, retry exact payload | Stored completed receipt is returned | Route reads provider config first and DB policy checks precede completed replay | Replay is coupled to new-turn configuration/policy checks |

## Blast radius

- `apps/web/src/app/api/v1/ai/tutor/turn/route.ts` and its repository calls.
- `apps/web/src/server/ai/tutor-turn-repository.ts` and database row contracts.
- The private AI migration and deletion lifecycle trigger path.
- `packages/ai/src/deepseek-tutor-gateway.ts` provider response handling.
- Import-boundary probes and all workspace quality gates.

## Fix strategy

1. Add a database-generated lease token and guarded transition wrappers; reject
   expired or superseded attempts and add stale-attempt tests.
2. Acquire the AI lifecycle lock at deletion freeze, before the account becomes
   unavailable; retain the same lock namespace for AI transitions.
3. Add an exact completed-replay lookup before provider configuration and keep
   new-turn policy checks on the reservation path.
4. Read provider bodies through a bounded stream reader with abort handling.
5. Mark `@ideogram/ai` as server-only in the import-boundary rule/probes and
   remove the unnecessary stable learner identifier from provider payloads.

Medium hardening (database hash recomputation and failure-transition telemetry)
will be included in the same boundary fix where it can be done without widening
the public API.
