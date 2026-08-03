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
