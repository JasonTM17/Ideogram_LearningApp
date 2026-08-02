# Adversarial Review — Vocabulary Activity Slice

## Scope and method

Manual final-pass review of the web and Expo vocabulary acknowledgement paths,
their shared retry lifecycle, the activity mutation route, and the existing
database evaluator. The review treated client state, storage, cancellation,
session changes, duplicate delivery, and malformed input as hostile boundaries.

## Checks performed

| Attack or failure path | Evidence | Result |
| --- | --- | --- |
| Submit an unsupported activity or forged completion payload | Safe catalog lookup exposes only `vocabulary`; both clients send exactly `{ acknowledged: true }`; database evaluator rejects a different payload/type. | Blocked |
| Bypass authenticated learner identity | Protected page/Expo route gates are defense in depth; POST authenticates every request and passes the verified server user to the repository. | Blocked |
| Cross-site cookie mutation | Web route applies trusted-origin mutation policy before repository access. Native bearer flow does not rely on browser Origin headers. | Blocked |
| Duplicate press or concurrent same-surface request | `ActivityAttemptLifecycle` keeps one active scope and returns `busy` before allocating another operation. | Blocked |
| Ambiguous network result causes duplicate progress | Lifecycle retains the immutable request only for retryable outcomes; database enforces idempotency and device-sequence constraints. | Blocked |
| Stop, unmount, or native session change renders a stale receipt | Activity lifecycle suppresses a receipt when its signal is aborted. Native binds the request to session epoch and rejects a late result after account/session change. | Blocked |
| UUID capability failure consumes a sequence then claims a retryable network error | UUID is generated and format-checked before operation identity reservation; failures map to terminal `IDENTITY_ERROR`. | Blocked |
| Evaluator/database details leak to a learner | API response mapping is opaque; route tests verify raw evaluator failures are not returned. | Blocked |

## Findings

No open security, authorization, data-integrity, or stale-state finding.

The review confirmed two intentional limits rather than defects:

- Browser identity serialization is limited to one JavaScript runtime; it does
  not promise a cross-tab distributed lock.
- Retry retention is memory-only. The app does not claim an offline queue or
  durable replay after an app/browser restart.

## Verification evidence

- Shared lifecycle tests cover duplicate locking, exact retry input reuse,
  terminal cleanup, stop suppression, and input-creation failure.
- Web tests cover cookie-authenticated no-store request construction, opaque
  status mapping, UUID capability/format failure, and exact payload creation.
- Native tests cover UUID capability/format failure, retry classification, and
  the existing native client session/abort boundaries.
- Database migration `20260801130000_evaluate_activity_attempts_at_database_boundary.sql`
  retains active-account, visible-release, enrollment, idempotency, and exact
  vocabulary payload checks.

## Residual delivery risk

No real browser session or physical device E2E run is possible without a
configured non-production Supabase environment and test learners. This is a
delivery-environment gap, not a mocked production claim; unit, integration,
type, lint, build, content, env, boundary, secret, and documentation checks are
run before push.

## Unresolved questions

- Workspace coverage thresholds are not configured, so coverage is reported as
  unmeasured rather than inferred.
