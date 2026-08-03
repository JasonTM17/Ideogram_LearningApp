---
phase: 3
title: Durable offline sync
status: completed
priority: P1
effort: 2d
dependencies:
  - 1
  - 2
---

# Phase 3: Durable offline sync

## Overview

Make learner mutations restart-safe without claiming a full media/background
sync system.

## Requirements

- Persist a bounded, per-user/session operation queue using the native secure
  storage boundary; keep web browser retry behavior unchanged unless a shared
  browser adapter is already safe.
- Preserve the original request input, idempotency key, device identity, and
  sequence. Drain sequentially, classify retryable network/timeout/uncertain
  outcomes, and stop on permanent auth/validation conflicts.
- Logout/account switch invalidates the old namespace before any new request;
  stale receipts never mutate the current learner UI.

## Architecture

Create a platform-neutral `@ideogram/sync` package for queue records, storage
ports, retry policy, and sequential drain. Expo supplies a SecureStore-backed
adapter and foreground/session-bound drain hook. The queue stores only already
validated public mutation envelopes; server idempotency remains the source of
truth. No client scheduler, offline SRS calculation, media cache, or background
task is introduced.

## Related Code Files

- Create: `packages/sync/package.json`, `src/*`, tests.
- Create: `packages/contracts/src/sync/*` if phase 1 leaves shared types there.
- Modify: `apps/mobile/src/lib/secure-session/*` for queue-specific storage.
- Create: `apps/mobile/src/features/offline/*` and tests.
- Modify: native vocabulary/review/placement submission hooks to enqueue only
  network-uncertain failures and show a friendly sync status.

## Implementation Steps

1. Implement queue record validation, namespace checks, bounded size/count,
   persistence, deduplication, and sequential drain.
2. Add the Expo secure adapter and session-epoch lifecycle/quarantine behavior.
3. Expose a manual/foreground `Đồng bộ ngay` action and pending count; retry
   network-uncertain activity/review/placement writes with their original body.
4. Test restart, duplicate enqueue, out-of-order operations, account switch,
   permanent conflict, timeout, and receipt removal.

## Success Criteria

- [ ] Offline queue survives process restart and never crosses accounts.
- [ ] Replay uses original idempotency/device identity and removes only after
  a validated receipt.
- [ ] UI clearly distinguishes pending sync from completed server progress.
