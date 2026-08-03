---
phase: 2
title: "Web durable sync"
status: in-progress
priority: P1
effort: "1.5d"
dependencies: [1]
---

# Phase 2: Web durable sync

## Overview

Bring the durable mutation protocol to the authenticated web client using
namespaced browser storage, online/visibility triggers, clear pending status,
and receipt-only removal.

## Implementation Steps

1. Add a browser storage adapter and an authenticated web sync provider using
   the existing `@ideogram/sync` contract.
2. Integrate activity, review, and placement-answer mutations; retain original
   idempotent bodies only on network-uncertain outcomes.
3. Register connectivity, visibility, and optional Background Sync triggers;
   unsupported browsers fall back to foreground sync without claiming otherwise.
4. Add controlled tests for account/session isolation, retry/replay, and UI
   status.

## Success Criteria

- [ ] Browser retry survives reload and cannot replay into another account.
- [ ] Learners see pending versus server-confirmed state honestly.
