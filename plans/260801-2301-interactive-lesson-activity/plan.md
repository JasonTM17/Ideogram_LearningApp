---
title: Interactive Lesson Activity Completion
description: >-
  Ship one honest, idempotent vocabulary-completion activity on the existing web
  and Expo lesson flows.
status: in-progress
priority: P2
effort: 2d
branch: main
tags:
  - feature
  - frontend
  - mobile
  - api
blockedBy: []
blocks: []
created: '2026-08-01T16:01:30.678Z'
createdBy: 'ck:plan'
source: skill
---

# Interactive Lesson Activity Completion

## Overview

Deliver the first interactive learning loop: a learner opens a published lesson,
studies a vocabulary activity, confirms completion, and sees server-evaluated
progress. The exact submission request is retained for safe retry on web and
mobile; no client claims progress before the server receipt succeeds.

This is a deliberate vertical slice within the existing platform roadmap's web
and mobile learning phases. It reuses the established `submitActivityAttempt`
contract and native operation identity store instead of adding another progress
API, schema, or offline queue.

## Scope

- In: Japanese vocabulary acknowledgement activities (`responsePayload:
  { acknowledged: true }`), protected nested activity routes, retry-safe
  operation identity, receipt feedback, accessible web/mobile UI, and tests.
- Out: review-session submission, listening/audio evaluation, Chinese/Korean
  release activation, an offline mutation queue, database/schema changes,
  arbitrary AI grading, and bypassing current content-release gates.

## Acceptance Criteria

- A signed-in learner can open a vocabulary activity from an eligible lesson on
  both platforms, confirm it, and receive the server receipt.
- A retry after a network-uncertain result reuses the same device sequence,
  idempotency key, timestamp, and response body rather than double-recording
  progress.
- Unsupported activity types remain visibly unavailable, never masquerade as
  completed, and do not submit a fabricated payload.
- Authentication and session changes safely stop or invalidate an in-flight
  client attempt. Browser errors stay generic and do not expose server details.
- Existing catalog routes, learner contracts, and database behavior remain
  backward compatible; quality gates pass.

## Design References

- [Desktop Stitch handoff](./design/stitch-desktop-lesson-activity/DESIGN.md)
  — screen `48eb6576cbc945ae8512dcc2154a0b20`.
- [Mobile Stitch handoff](./design/stitch-mobile-lesson-activity/DESIGN.md)
  — screen `ccddaf3bfea2438382e4295e91e85396`.

Use these only as visual direction. Rebuild with existing tokens and platform
components; do not import the generated HTML into production code.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Lesson activity foundation](./phase-01-lesson-activity-foundation.md) | Completed |
| 2 | [Web activity completion](./phase-02-web-activity-completion.md) | In Progress |
| 3 | [Mobile activity completion](./phase-03-mobile-activity-completion.md) | Pending |
| 4 | [Validation and docs](./phase-04-validation-and-docs.md) | Pending |

## Dependencies

- Existing safe catalog read flow and activity-attempt mutation route.
- Existing native SecureStore-backed operation identity adapter.
- Existing published content gates. Japanese N5 data remains review-only until
  content/pedagogy/audio approval; this slice must preserve that truth.
