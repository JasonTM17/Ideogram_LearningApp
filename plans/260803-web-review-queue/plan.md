---
title: Web Review Queue Vertical Slice
description: >-
  Finish the first honest web SRS loop: vocabulary completion creates real
  review items, a protected queue renders only owned due work, and one
  self-assessed recall decision is submitted through the existing idempotent
  API.
status: in-progress
priority: P1
branch: main
tags:
  - web
  - learning
  - review
  - srs
  - database
blockedBy: []
blocks: []
created: '2026-08-03T00:49:07.815Z'
createdBy: ck-cli
source: cli
---

# Web Review Queue Vertical Slice

## Overview

The existing review submission boundary is sound but cannot be reached through
the product: completed vocabulary activities do not create review items, and
the web review route is a planned-state screen. This increment makes the first
review loop usable without inventing learner data or answer keys.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [review-data-contract web-review-flow verification](./phase-01-review-data-contract-web-review-flow-verification.md) | In Progress |

## Dependencies

Extends Phase 4 of
[the platform plan](../260729-1500-jck-ai-learning-platform/phase-04-web-learning-experience.md).
The original slice stayed web-only. Its native follow-up is now tracked in
[`../260803-native-review-queue/`](../260803-native-review-queue/).

## Acceptance criteria

- A completed vocabulary activity creates one durable SRS item for each stable
  vocabulary-entry position, and an identical activity retry creates none.
- A protected web learner sees only their active, non-suspended review items.
- The queue shows one vocabulary recall prompt at a time, labels its
  self-assessment honestly, and sends the existing idempotent review contract.
- The server receipt removes or advances the current item without trusting a
  client-computed schedule; failure/cancellation keeps a safe retry path.
- Database, repository, component, and route-level tests cover the new facts;
  docs distinguish the delivered web slice from pending native/offline work.
