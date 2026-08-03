---
phase: 2
title: Native review flow
status: completed
priority: P1
effort: 1d
dependencies:
  - 1
---

# Phase 2: Native review flow

## Overview

Replace the Expo planned review screen with a one-card vocabulary recall flow
that uses catalog-safe prompt data plus the server queue.

## Requirements

- Keep the card answer hidden until the learner requests it, then offer four
  explicit self-assessment grades.
- Reuse `ActivityAttemptLifecycle`, Expo operation identity storage, session
  bound request signals, and server review receipts.
- Announce meaningful transitions for accessibility and provide a safe
  sign-in/retry/stop path.

## Related Code Files

- Modify: `apps/mobile/src/features/review/*`, app navigation destinations,
  screen routes, and native styles/components only as needed.
- Create: native queue provider, presentation/state/card helpers, and tests.

## Implementation Steps

1. Read the catalog and review queue in a native provider/surface with
   explicit waiting, error, empty, unavailable, and ready states.
2. Map source positions to already learner-safe vocabulary entries; skip no
   records silently and never fabricate a prompt.
3. Submit grades through the existing endpoint with retained retry input; use
   the receipt to remove only the completed card.
4. Remove the Review planned badge and add focused rendered-screen tests.

## Implementation Steps

<!-- Detailed steps -->

## Success Criteria

- [ ] Native review contains no hard-coded learning cards or local scheduling.
- [ ] Receipt/error/retry/session transitions are accessible and deterministic.
- [ ] Review navigation is enabled only once the real flow exists.

## Risk Assessment

Do not claim offline review: input remains retry-safe during a request but the
queue requires the authenticated API. Keep state local to the screen so a
session change cannot commit a stale receipt.
