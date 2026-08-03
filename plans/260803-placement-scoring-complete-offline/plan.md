---
title: Placement Scoring and Complete Offline Delivery
description: >-
  Publish a governed Japanese N5 placement bank, score submitted sessions in the
  worker, and complete browser/native offline mutation and media delivery
  without weakening learner-data boundaries.
status: in-progress
priority: P1
branch: main
tags:
  - placement
  - worker
  - sync
  - offline
  - media
  - web
  - mobile
blockedBy: []
blocks: []
created: '2026-08-03T06:30:58.727Z'
createdBy: 'ck:plan'
source: skill
---

# Placement Scoring and Complete Offline Delivery

## Overview

Close the explicitly accepted beta gaps from the prior onboarding/offline slice:
published placement content, service-role scoring, browser and native background
sync, and versioned offline media. The server remains the authority for scoring,
SRS, access, and receipts.

Out of scope: voice recording/grading, notifications, production deployment,
and a new content-management UI. A small reviewed Japanese N5 placement bank is
seeded through migration, not invented at runtime.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Published placement and scoring](./phase-01-published-placement-and-scoring.md) | Complete locally |
| 2 | [Web durable sync](./phase-02-web-durable-sync.md) | Implemented locally; browser proof pending |
| 3 | [Native background sync](./phase-03-native-background-sync.md) | Implemented locally; real-device proof pending |
| 4 | [Offline media delivery](./phase-04-offline-media-delivery.md) | Implemented locally; approved asset and runtime proof pending |
| 5 | [Verification and documentation](./phase-05-verification-and-documentation.md) | In Progress |

## Dependencies

Builds on `plans/260803-onboarding-offline-sync` (completed) and supersedes its
documented limits. It narrows the older broad Phase 7 media plan: recording and
notifications remain separate, rather than being smuggled into this delivery.
