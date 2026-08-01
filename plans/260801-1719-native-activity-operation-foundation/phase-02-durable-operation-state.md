---
phase: 2
title: "Durable Operation State"
status: completed
effort: "1–2 engineer-days"
---

# Phase 2: Durable Operation State

## Overview

Create a small, testable native identity store backed by the existing secure
storage port. It allocates one installation UUID and strictly positive,
monotonic device sequences. Reservation is serialized in-process and commits
the next sequence before returning, so a crash may leave a gap but can never
cause a reuse. The returned operation identity is intentionally volatile;
Phase 7 will persist pending submissions and reconciliation state.

## File ownership

- `apps/mobile/src/lib/activity-operation/activity-operation-identity.ts`
- `apps/mobile/src/lib/activity-operation/activity-operation-identity.test.ts`
- `apps/mobile/src/lib/activity-operation/expo-activity-operation-identity.ts`
- `apps/mobile/src/lib/activity-operation/index.ts`
- `apps/mobile/src/lib/secure-session/secure-session-storage-types.ts` (only if
  a shared storage error type is required; avoid unrelated auth changes)

## Implementation Steps

1. Define versioned persisted state (`deviceId`, `nextDeviceSequence`) with
   strict UUID/positive-safe-integer validation and opaque storage errors.
2. Implement an injectable identity generator and secure key-value port so
   tests do not import Expo; serialize concurrent reservations and recover
   cleanly after failed writes.
3. Add the Expo adapter using `expo-crypto` and `expo-secure-store` with a
   dedicated keychain service, document-directory installation sentinel, and
   platform availability guard.
4. Export the factory for the future activity runner without coupling it to
   Supabase session credentials or web storage.

## Success Criteria

- [x] First reservation creates one UUID and sequence `1`.
- [x] Restart reads the same UUID and continues at the next sequence.
- [x] Concurrent reservations return unique ordered sequences.
- [x] Failed/corrupt storage never silently resets identity or reuses a value.
- [x] Logout/account switch does not clear the installation identity.
- [x] No durable pending queue is introduced before Phase 7.
