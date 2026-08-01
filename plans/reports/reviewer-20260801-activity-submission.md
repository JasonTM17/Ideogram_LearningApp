## Code Review Summary

### Scope

- Files: activity submit route/repository, API client contract, evaluator migration, two pgTAP suites, and their new unit tests.
- LOC: 2,712 inspected in owned scope, including existing pgTAP fixtures.
- Focus: uncommitted activity-submission slice.
- Scout findings: route reaches shared mutation/auth policy, canonical idempotency serializer, executor transaction role, raw persistence helper, and catalog answer-key projection.

### Overall Assessment

Do not land unchanged. The evaluator is capability-narrow and no answer key is returned, but an idempotent retry does not return the documented original receipt.

### Critical Issues

None.

### High Priority

1. **Replay receipt is mutable, contrary to the public idempotency contract.**
   - Evidence: the existing-key branch returns `idempotent_replay = true` but reads `progress_state`, `completed_activity_count`, and `total_activity_count` from the current `learner_lesson_progress` row ([evaluator migration](../../supabase/migrations/20260801130000_evaluate_activity_attempts_at_database_boundary.sql), lines 108-131). The attempt table persists no snapshot of those three receipt fields ([base migration](../../supabase/migrations/20260729190001_learning_progress_and_review.sql), lines 164-190). A retry of activity A after activity B completes in the same lesson returns A's attempt ID with B's newer lesson progress, not A's original receipt. This conflicts with the API contract claim that an identical replay returns its original receipt ([api contract](../../docs/api-contract.md), lines 135-144).
   - Impact: offline clients cannot safely treat `idempotentReplay: true` as a duplicate response; replay results vary with later writes and contradict the documented HTTP contract.
   - Fix: persist the original receipt/progress snapshot with the attempt (or in a receipt table) and return it on replay. If live progress is intended, change the contract and receipt semantics explicitly, then test that behavior.
   - Missing test: submit a second activity in the same lesson, then retry the first idempotency key and assert the chosen immutable or live-progress semantics. Current pgTAP coverage retries before any later write.

### Medium Priority

1. **Replay bypasses the documented release/enrollment authorization check.**
   - Evidence: after `require_active_learning_account`, the existing-key branch returns before `require_visible_learning_release` and `require_active_release_enrollment` ([evaluator migration](../../supabase/migrations/20260801130000_evaluate_activity_attempts_at_database_boundary.sql), lines 73-140). Thus an active user whose enrollment is later deactivated, or whose release is archived, can replay a known idempotency key and receive `200`, while the published status contract says rejected enrollment or release access is `403` ([api contract](../../docs/api-contract.md), lines 151-157).
   - Impact: authorization behavior differs by whether a caller knows a prior key; a definer function also returns the caller's current lesson state after access is withdrawn.
   - Fix: re-check visible release and active enrollment before returning a replay, or explicitly define and document replay-after-revocation as an allowed exception and ensure the returned fields reveal no state that policy would otherwise deny. Add a pgTAP case for each choice.

### Low Priority

None.

### Edge Cases Found by Scout

- Per-learner advisory lock precedes idempotency lookup; local pgTAP confirms this ordering.
- Request body is bounded and exact at the HTTP boundary; evaluator re-validates type-specific response shapes.
- Unsupported activity types fail with opaque `409`; unknown database errors reach the generic no-store `503` envelope.

### Positive Observations

- The web repository invokes only `private.evaluate_and_submit_activity_attempt`, never the raw score/completion helper.
- The raw helper is not executable by `app_learning_api_executor`; the privilege pgTAP passed.
- Evaluator output is receipt-only. Private answer-key material is read only inside the definer function, catalog projections strip correctness markers, and failure responses are opaque.

### Recommended Actions

1. Define and implement immutable replay-receipt semantics; add the second-activity replay test.
2. Resolve replay-after-revocation policy, align SQL and API contract, and add pgTAP coverage.

### Metrics

- Focused type checks: pass for web, API client, contracts, and learning engine.
- Focused unit tests: 27 passed (web 16, API client 7, contracts 2, engine 2).
- Database tests: `learning_rls_test.sql` 26/26 pass; `review_idempotency_test.sql` 46/46 pass.
- Full workspace lint/build/coverage: not run in this review.

### Unresolved Questions

- Is a replay after enrollment/release revocation intentionally permitted to settle an uncertain earlier submission? If yes, the current API status contract and receipt wording must say so.

## Follow-up disposition

The controller chose fail-closed replay authorization. The evaluator now stores
an immutable private receipt snapshot, returns that snapshot only after current
release and enrollment reauthorization, and has regression coverage for later
lesson progress, paused enrollment, and archived release. The reviewer verified
both findings as resolved on 2026-08-01; no blocker remains for this slice.
