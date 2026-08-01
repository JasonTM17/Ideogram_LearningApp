---
phase: 1
title: Lesson activity foundation
status: completed
priority: P1
effort: 4h
dependencies: []
---

# Phase 1: Lesson activity foundation

## Overview

Extract the durable, platform-agnostic activity operation identity logic into a
shared learning client module. Keep the Expo adapter as the source of native
storage semantics, then add a browser adapter that fails closed if durable
operation state cannot be retained.

## Requirements

- Functional: reserve a stable `{ deviceId, deviceSequence }`, create one UUID
  idempotency key per activity attempt, and preserve a pending immutable request
  across an uncertain retry.
- Functional: do not allocate a second sequence while a pending attempt exists.
- Non-functional: no server or contract shape change; test concurrent calls,
  corrupt persistence, storage failure, retry, and completed-attempt cleanup.
- Security: never persist authentication material or response bodies containing
  user data; store only operation metadata required by idempotency.

## Architecture

`@ideogram/api-client` owns generic operation state and its storage interface.
Expo SecureStore/document-sentinel remains a native adapter. The web adapter
uses browser-local durable storage and receives injected storage/UUID/time
dependencies in tests. The web and mobile feature UIs create one immutable
submission object from the reservation and retry that same object.

## Related Code Files

- Create: `packages/api-client/src/learning/activity-operation-identity.ts`
- Create: `packages/api-client/src/learning/activity-operation-identity.test.ts`
- Create: `apps/web/src/lib/learning/browser-activity-operation-identity.ts`
- Create: `apps/web/src/lib/learning/browser-activity-operation-identity.test.ts`
- Modify: `packages/api-client/src/learning/index.ts`
- Modify: `apps/mobile/src/lib/activity-operation/activity-operation-identity.ts`
- Modify: `apps/mobile/src/lib/activity-operation/activity-operation-identity.test.ts`
- Modify: `apps/mobile/src/lib/activity-operation/expo-activity-operation-identity.ts`

## Implementation Steps

1. Move only the generic state machine and storage contracts into the shared
   API-client package; retain mobile-only SecureStore wiring in the app.
2. Preserve native exports through a small compatibility re-export or update
   every known import so the mobile app has a single implementation.
3. Implement browser storage with explicit read/write errors. A storage failure
   blocks a submission and yields a generic recoverable UI error.
4. Add unit coverage for invariant-preserving reservations and native adapter
   regression coverage.

## Success Criteria

- [ ] Shared operation identity has a single implementation and explicit public
      exports.
- [ ] Native operation identity behavior and its existing persistence guarantees
      remain covered.
- [ ] Browser adapter never replaces a pending operation silently after a
      storage failure.
- [ ] Package lint, typecheck, and focused tests pass.

## Risk Assessment

Moving a generic class can break native imports or alter persistence keys.
Mitigate by preserving the current serialized shape and testing every existing
call path before adding web use.

## Implementation Steps

<!-- Detailed steps -->

## Success Criteria

- [ ] ...
