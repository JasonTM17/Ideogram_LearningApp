# Code Review Summary

## Scope

- Commits: `d276eda`, `20b23e9`, `61bc8e4`.
- Focus: shared activity identity, protected web/Expo routes, acknowledgement mutation, retry and session lifecycle.
- Scout coverage: import consumers, API/database contract, route/auth guards, storage errors, duplicate mutations, unsupported activities, and accessibility affordances.
- Diff hygiene: `git diff --check d276eda^..61bc8e4` clean; no dependency, schema, migration, environment, or API-contract additions. Secret-pattern scan found none.

## Stage-1 Assertions Rechecked

| Requirement | Evidence | Result |
| --- | --- | --- |
| Safe catalog-only activity lookup | Web route resolves from `readLearnerCatalog()` then `findCatalogVocabularyActivity`; native surface resolves from its learner catalog. | Pass |
| Protected routes | Web invokes `requireLearnerPageSession`; Expo screen is inside learner `Stack.Protected`. | Pass |
| Exact acknowledgement shape | Both input factories send `{ acknowledged: true }`; evaluator accepts only that exact JSONB value. | Pass |
| Safe retry while surface remains mounted | Both surfaces retain `pendingInput`, block a second active request, and clear it only after receipt or a terminal error. | Pass |
| Honest unsupported behavior | Web only links vocabulary; native only makes vocabulary pressable. Other activity types are explicitly unavailable. | Pass |
| Session/error safety | Native binds requests to the session signal and changes surface key by session epoch. Web sends opaque errors only; server reauthenticates every mutation. | Pass |

## Findings

### Medium Priority

#### [M1] No interaction-level regression coverage for the mutation lifecycle

- Locations: `apps/web/src/features/learning/vocabulary-activity-view.tsx:57-104`, `apps/mobile/src/features/lesson/vocabulary-activity-screen.tsx:75-129`.
- Evidence: web coverage renders static markup only at `apps/web/src/features/learning/vocabulary-activity-view.test.tsx:46-65`; mobile coverage tests only pure request/error helpers at `apps/mobile/src/features/lesson/vocabulary-activity-state.test.ts:22-50`. Neither mounts the surface nor drives its callbacks.
- Impact: the highest-risk behavior is in the unexercised code: duplicate press locking, retrying the exact retained request, cancellation, and preventing stale completion after lifecycle/session changes. The shared store test proves sequence serialization, but not either UI's request wiring.
- Remedy: add focused interaction tests with mocked transport/store/session boundaries. Prove one POST after double activation; a transient failure retries byte-for-byte the same `ActivityAttemptInput`; a stop/unmount/session change never displays a receipt; and a terminal error drops the retained input.

### Low Priority

#### [L1] UUID capability failure is presented as a retryable network failure after a stored device ID exists

- Locations: `apps/web/src/lib/learning/browser-activity-operation-identity.ts:40-45`, `apps/web/src/features/learning/vocabulary-activity-view.tsx:69-77`, `apps/web/src/features/learning/activity-attempt-client.ts:183-190`; analogous native call at `apps/mobile/src/features/lesson/vocabulary-activity-screen.tsx:91-100` and mapping at `apps/mobile/src/features/lesson/vocabulary-activity-state.ts:88-103`.
- Attack/trigger: use a runtime where the stored device ID can be read but `crypto.randomUUID` / `Crypto.randomUUID` is unavailable or throws while creating the idempotency key.
- Impact: the raw error falls through to `NETWORK_ERROR`, so the UI offers an ineffective retry. Each retry can reserve another unused device sequence before failing. No request reaches the server and no learner progress is corrupted.
- Remedy: normalize UUID capability errors into a non-retryable capability/identity error before `pendingInput` remains null, or generate/validate the idempotency key before reserving a device sequence. Add a regression test for this path.

## Adversarial Checks

- Auth/authz: route authentication is not trusted as authorization; the existing server route binds the user from the authenticated request and database evaluator verifies active account, visible release, and enrollment.
- Input boundary: public schema validation, bounded JSON body policy, CSRF/origin checks for cookie auth, and database exact-payload evaluation all remain in effect.
- Concurrency: surface-level active-request locks plus the shared runtime lock prevent same-runtime double allocation; the database adds a per-user advisory transaction lock and idempotency/device uniqueness.
- Data exposure: browser/native copy is generic; no server error text, auth material, response payload, or new secret appears in the reviewed diff.
- Scope: no offline queue, review/audio grading, schema/API change, or unsupported activity submission was added.

Known design limits were verified, not reported as defects: browser locking is intentionally limited to one JS runtime, and native retry is in-memory rather than an offline mutation queue. Neither UI or plan promises cross-tab or durable offline replay.

## Verification Evidence

- `pnpm --filter @ideogram/api-client test -- src/learning/activity-operation-identity.test.ts` — 9/9 pass.
- `pnpm --filter @ideogram/web test -- ...activity tests...` — 19/19 pass across 5 files.
- `pnpm --filter @ideogram/mobile test -- ...activity tests...` — 8/8 pass across 3 files.
- `pnpm --filter @ideogram/api-client typecheck`, `pnpm --filter @ideogram/web typecheck`, and `pnpm --filter @ideogram/mobile typecheck` — pass.

## Verdict

No critical or high-severity implementation defect found. The server-side trust boundary, exact evaluator contract, route restrictions, and same-surface idempotent retry are coherent. Address M1 before treating the activity UX as regression-protected; L1 is safe to fix in the same pass if browser/Expo capability hardening is desired.

Status: DONE_WITH_CONCERNS

Summary: Review completed with one medium test-coverage gap and one low runtime-capability/error-classification issue. No data leak, authorization bypass, schema drift, or scope creep found.

Concerns/Blockers: M1 should be resolved before release/merge if the phase's interaction-state test acceptance criterion is enforced. No P0/P1 blocker.

## Follow-up review — lifecycle remediation

The two findings above were re-reviewed after the implementation changed.

| Prior finding | Remediation verified | Result |
| --- | --- | --- |
| M1: lifecycle behavior was not regression-protected | Both surfaces now delegate locking, exact pending-input retry, terminal cleanup, request cancellation, and receipt suppression to `ActivityAttemptLifecycle`; its five focused tests exercise those transitions. | Resolved |
| L1: UUID capability failure could consume a sequence and appear retryable | Web and native validate an idempotency UUID before `identityStore.reserve()` and normalize capability/format failures to non-retryable `IDENTITY_ERROR`. | Resolved |

### Follow-up adversarial checks

- An aborted scope cannot yield a receipt: the lifecycle checks the abort signal after both input creation and submission.
- A second activation while a request is active returns `busy` and cannot allocate another input.
- A retryable network/timeout result retains the original input; terminal identity, storage, authorization, and validation failures drop it.
- Native requests remain bound to the initial user and session epoch by the existing native API client, while the screen remounts on session epoch changes.
- The web mutation remains same-origin/cookie-authenticated, validates its request body, binds the verified server user, and delegates exact payload evaluation to the database function.

### Follow-up verification

- `@ideogram/api-client`: lifecycle tests — 5/5 pass.
- `@ideogram/web`: UUID and activity-client regression tests — 13/13 pass.
- `@ideogram/mobile`: UUID and activity-state regression tests — 4/4 pass.
- Full workspace tests, typecheck, lint, and build are rerun in the final validation pass.

## Final verdict

Pass. No critical, high, medium, or low-severity finding remains open for this
vertical slice. The intentionally limited in-memory retry and same-runtime
browser lock remain documented product constraints, not unadvertised offline or
cross-tab guarantees.

## Post-validation lifecycle hardening

Follow-up scouting found two interaction flaws after the lifecycle review. Both
are resolved in the final working tree:

- A stop keeps the surface submitting until the aborted request settles, so a
  retry action cannot appear while the active lifecycle lock would ignore it.
  Web and native map the settled abort to the existing retryable feedback.
- A successful web sign-out writes a same-origin storage invalidation. Other
  tabs stop an active activity request, suppress any late receipt, render the
  sign-in path, and refuse a new attempt from that stale surface.
- The web activity view is keyed by content release and activity ID, preventing
  a dynamic route transition from reusing an old lifecycle closure.

Browser identity locking remains scoped to one JavaScript runtime; cross-tab
distributed locking is a documented product limitation, not a hidden delivery
guarantee.

### Updated verification

- Web focused suite: 39 files / 212 tests passed, including cross-tab session
  invalidation coverage.
- Mobile focused suite: 23 files / 111 tests passed.
- Web and mobile typecheck and lint passed after the lifecycle changes.
- Prettier passed for every touched source, documentation, and plan file.
