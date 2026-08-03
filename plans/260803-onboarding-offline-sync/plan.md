---
title: Onboarding Placement and Offline Sync
description: >-
  Add an answer-safe onboarding/placement flow on web and Expo, then make
  learner mutations durable across offline restarts with idempotent sync.
status: completed
priority: P1
branch: main
tags:
  - onboarding
  - placement
  - offline
  - sync
  - mobile
  - web
  - api
blockedBy: []
blocks: []
created: '2026-08-03T02:24:18.935Z'
createdBy: 'ck:plan'
source: skill
---

# Onboarding Placement and Offline Sync

## Overview

This plan closes two gaps called out by the current README and roadmap: there
is a complete placement persistence boundary but no learner-facing route, and
native mutation retries disappear when the app restarts. It intentionally does
not add media downloads, push notifications, background execution, or local
SRS scheduling.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Audit and contracts](./phase-01-audit-and-contracts.md) | Completed |
| 2 | [Placement vertical slice](./phase-02-placement-vertical-slice.md) | Completed |
| 3 | [Durable offline sync](./phase-03-durable-offline-sync.md) | Completed |
| 4 | [Verification and docs](./phase-04-verification-and-docs.md) | Completed |

## Dependencies

Builds on the existing placement tables/RLS/private helpers in
`20260729190001_learning_progress_and_review.sql`, the activity/review API
contracts, and the native SecureStore/session-epoch foundations. The existing
web/native review plan remains historical context; this plan owns only the new
placement and durable mutation surfaces.

## Acceptance criteria

- An authenticated learner can choose a language/objective, read only the
  published answer-safe placement prompt projection, start a placement session,
  record answers, resume after reconnect, and submit exactly once.
- Placement routes never expose `scoring_rubric`, answer keys, internal user
  IDs, or worker-only scoring controls. A submitted-but-not-scored session is
  shown honestly as awaiting evaluation.
- Activity, review, and placement mutations can be enqueued offline in a
  per-user/session namespace, survive app restart, replay sequentially with
  the original idempotency/device identity, and remove only after a receipt.
- Account switch/logout quarantines or purges the old namespace; stale queue
  items cannot be sent under a new session.
- Contracts, API client, web/Expo UI, queue tests, placement pgTAP, full quality
  gates, and docs agree on the delivered scope.
