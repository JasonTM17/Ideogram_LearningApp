---
phase: 2
title: Database Turn Ledger
status: completed
effort: medium
---

# Phase 2: Database Turn Ledger

## Overview

Add private conversation/turn/rate-window storage and security-definer state
transitions. The provider call must happen outside the transaction while reservation,
replay, ownership, active-account, consent, and hourly quota checks remain atomic.

## Implementation Steps

- Add a timestamped migration with private AI tables, strict size/state/hash checks,
  unique ownership keys, indexes, RLS, and no direct learner grants.
- Implement `begin_ai_tutor_turn`, `complete_ai_tutor_turn`, and
  `fail_ai_tutor_turn` with advisory locking, exact replay detection, stale pending
  recovery, hourly turn/cost reservation, active learner + consent checks, and safe
  SQLSTATE messages.
- Add an `AFTER INSERT` purge-operation trigger owned by `app_security_definer` that
  deletes AI turns/rate windows/conversations for the frozen user before the existing
  learning purge completes.
- Add pgTAP coverage for ownership isolation, replay/mismatch, quota, stale state,
  consent, and purge behavior. Keep provider keys and prompt text out of fixtures.

## Success Criteria

- [ ] Only `app_learning_api_executor` can execute the three state transitions.
- [ ] No provider network call can occur while a database transaction is open.
- [ ] Purge removes all AI user data in the same deletion transaction.
- [ ] SQL tests cover success and each fail-closed path.
