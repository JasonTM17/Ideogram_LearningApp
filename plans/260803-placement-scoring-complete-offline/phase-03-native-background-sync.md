---
phase: 3
title: "Native background sync"
status: in-progress
priority: P1
effort: "1d"
dependencies: [1]
---

# Phase 3: Native background sync

## Overview

Turn the existing Expo foreground queue into opt-in, bounded background sync
when the platform task API is available, while retaining the safe foreground
fallback and stopping on logout/session change.

Pure executor unit tests in
`apps/mobile/src/lib/offline-sync/native-offline-sync-background-executor.test.ts`
now prove the queue contract without claiming a real-device BackgroundTask run:
an empty queue returns OS success without transport, cross-account or
cross-session namespace mismatch clears queued work before transport, a raced
account switch after session lookup clears queued work before transport,
missing session preserves the queue, retryable drain returns `failed`, a clean
drain returns `success`, stable blocked mutations surface scheduler success
without implying receipt completion, and dependency errors return `failed`.

The owned-storage cleanup tests in
`apps/mobile/src/lib/offline-sync/owned-sync-queue-cleanup.test.ts` add the
compare-and-clear ownership proof: stale background A cannot clear newer
background B queue, a queue clears only when the stored namespace still matches
the expected owner, and invalid storage values stay untouched when ownership
cannot be proven.

The queue storage is now `shared: true`, keyed by `(userId, sessionEpoch)`,
and migrated from v1 to v2 while preserving a valid owned legacy queue and
replacing corrupt v2 bytes. The queue reader clears malformed snapshots and
owner mismatches atomically under the exclusive lock. The drain path binds the
AbortSignal to the queued namespace, treats the native abort path as
retryable, and maps auth/storage read failures to OS-visible failed results.
The live provider re-reads Supabase each invocation and rejects account switch
drift while the storage namespace lags behind, so stale mutations cannot leak
across users.

## Implementation Steps

1. Add Expo background task/fetch configuration and a platform-neutral drain
   executor that validates the active session namespace before transport.
2. Register only after a valid session, unregister/clear on logout or account
   switch, and cap background work/timeouts.
3. Expose a last-sync state and manual retry; verify tasks never claim local
   completion before a receipt.

## Success Criteria

- [ ] Native pending mutations are eligible for background drain where the OS
  permits it and safely fall back otherwise.
- [ ] A previous account's task cannot send queued mutations.
