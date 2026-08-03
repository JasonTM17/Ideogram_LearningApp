---
title: Native Review Queue
description: >-
  Deliver the same honest, server-authoritative vocabulary SRS loop in Expo: an
  authenticated queue read, one-card recall experience, and receipt-driven
  native state transitions.
status: completed
priority: P1
branch: main
tags:
  - mobile
  - expo
  - learning
  - review
  - srs
  - api
blockedBy: []
blocks: []
created: '2026-08-03T01:43:46.495Z'
createdBy: 'ck:plan'
source: skill
---

# Native Review Queue

## Overview

The web review loop is available, while Expo `/review` is still a planned
screen. This plan adds the minimum real native vertical slice without fake
cards, duplicate scheduling logic, or an offline queue claim.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Queue API](./phase-01-queue-api.md) | Completed |
| 2 | [Native review flow](./phase-02-native-review-flow.md) | Completed |
| 3 | [Verification](./phase-03-verification.md) | Completed |

## Dependencies

Builds on the existing activity/review contracts and the web review migration
in `plans/260803-web-review-queue/`. The native client must use the same API
receipts and never calculate a schedule locally.

## Acceptance criteria

- An authenticated Expo learner reads only owned, due vocabulary review items
  through an HTTP contract.
- The native screen reveals an answer on demand, captures an explicit
  self-assessment, and advances only after the server receipt.
- Identity, cancellation, session expiry, and retry behavior reuse the native
  activity-operation guarantees already established for vocabulary completion.
- Navigation no longer labels Review as planned; unsupported, empty, loading,
  error, and completed queue states remain explicit.
- Contract, route, native-client, rendered-screen, and database coverage pass.
