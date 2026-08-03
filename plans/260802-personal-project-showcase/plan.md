---
title: Professional Personal Project Showcase
description: >-
  Make the beta foundation evaluable as a polished, honest personal-project
  showcase without inventing unavailable product flows.
status: completed
priority: P2
branch: main
tags:
  - showcase
  - frontend
  - documentation
  - accessibility
blockedBy: []
blocks: []
created: '2026-08-02T10:35:50.791Z'
createdBy: 'ck:plan'
source: skill
---

# Professional Personal Project Showcase

## Overview

Ideogram Learning already has real authenticated web/mobile vertical slices, but a
reviewer needs credentials and local services to discover them. This plan adds a
public, self-contained product tour, upgrades the visual evidence, and documents
the boundary between implemented beta behavior and the target architecture.

It deliberately does not expand the learning product, add fake learner data, or
make deployment/production claims.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Showcase Foundation](./phase-01-showcase-foundation.md) | Completed |
| 2 | [Visual Storytelling](./phase-02-visual-storytelling.md) | Completed |
| 3 | [Documentation and Verification](./phase-03-documentation-and-verification.md) | Completed |

## Dependencies

Extends the completed interactive-lesson vertical slice. It does not block the
larger `260729-1500-jck-ai-learning-platform` implementation plan because it
does not change learner contracts, persistence, or roadmap ownership.

## Acceptance criteria

- A public `/showcase` route lets a reviewer understand the project without a
  Supabase session or any external provider configuration.
- The public site clearly links to that route and distinguishes working beta
  capabilities from planned product scope.
- The route is semantic, keyboard accessible, responsive, and uses only local
  checked-in visual assets with fixed dimensions.
- Architecture visuals distinguish implementation from the target shape.
- README and contributor-facing docs explain how to run, validate, and review
  the project honestly; all existing quality gates still pass.
