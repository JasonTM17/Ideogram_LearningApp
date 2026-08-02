# Fix Report — Vocabulary Activity Lifecycle

## Root cause

- Review found that web/mobile UI tests only rendered static markup or pure input
  helpers; duplicate activation, retry retention, stop, and stale receipt
  suppression were not exercised.
- In the original UI code, each surface awaited `identityStore.reserve()` before
  its UUID factory was invoked inside the input builder. A missing UUID
  capability therefore became the generic network error path after consuming a
  sequence.

## Reproduction

The pre-fix assertion in
`apps/web/src/features/learning/activity-attempt-client.test.ts` expected a
`device_id_failure` to map to non-retryable `IDENTITY_ERROR`. It failed with:

```text
Expected: IDENTITY_ERROR
Received: STORAGE_ERROR
```

The source order in the two UI surfaces showed `await identityStore.reserve()`
before the `createIdempotencyKey` callback was invoked by the request builder.

## Fix

- Added `ActivityAttemptLifecycle` in `@ideogram/api-client` and use it from
  both UI surfaces. It owns duplicate locking, immutable retry input retention,
  terminal cleanup, request cancellation, and receipt suppression after abort.
- Generate and normalize the UUID before reserving an operation identity on
  web and native. Capability failures now map to non-retryable
  `IDENTITY_ERROR`.
- Added pure lifecycle and platform UUID tests. The native UUID normalizer is
  platform-independent so Vitest does not import React Native Flow sources.

## Verification

- Focused lifecycle/web/mobile tests pass.
- Package, web, and mobile typechecks pass.
- Package, web, and mobile lint pass.
- Full workspace `pnpm test` passes after the fix.

## Public contract impact

No API route, schema, environment variable, dependency, or server evaluator
contract changed. The acknowledged payload remains `{ acknowledged: true }`.

## Unresolved questions

- Workspace coverage thresholds are not configured; this pass adds targeted
  regression cases but does not claim measured line or branch coverage.
