---
phase: 2
title: Placement vertical slice
status: completed
priority: P1
effort: 2d
dependencies:
  - 1
---

# Phase 2: Placement vertical slice

## Overview

Expose the existing placement persistence boundary through authenticated API
routes and friendly onboarding/placement screens on web and Expo.

## Requirements

- Use RLS-bound reads for published question sets/questions and private
  transaction helpers for start, answer, and submit writes.
- Accept only answer-safe prompt payloads; never send scoring rubrics to web or
  native clients.
- Allow an interrupted draft to resume and show submitted/waiting-for-scoring
  honestly when the worker has not scored it.

## Architecture

`GET /api/v1/learning/placement` returns the selected published bank and safe
questions. `POST /api/v1/learning/placement/sessions` starts/replays a session.
`POST /api/v1/learning/placement/sessions/:id/answers` records one answer and
`POST /api/v1/learning/placement/sessions/:id/submit` closes the draft. Web and
Expo share request contracts but keep platform-native shells. The existing
`service_role` scorer remains outside the learner route.

## Related Code Files

- Create: `apps/web/src/app/api/v1/learning/placement/**` route handlers/tests.
- Create: `apps/web/src/server/learning/placement-repository.ts` and tests.
- Create/modify: `apps/web/src/features/onboarding/**`, `/onboarding` route,
  and learner navigation as needed.
- Create/modify: `apps/mobile/src/features/onboarding/**` and Expo routes.
- Modify: `packages/api-client/src/native/**` and request tests.
- Create: `supabase/tests/placement-api-boundary_test.sql` only if existing
  pgTAP coverage cannot exercise the public route contract.

## Implementation Steps

1. Implement route auth/error/no-store behavior using catalog/review patterns.
2. Map Supabase rows to the shared answer-safe contract and test rubric/PII
   exclusion.
3. Build the web onboarding sequence: language/objective, placement prompt,
   answer, resume, submit, and waiting result states.
4. Build the Expo equivalent with session-bound requests and accessible touch
   targets; do not share DOM components.
5. Add route, repository, presentation, and native client tests.

## Success Criteria

- [ ] Authenticated web and Expo learners can complete and resume a draft.
- [ ] Submitted sessions render a truthful awaiting-score state.
- [ ] Existing placement pgTAP remains green after fresh migration reset.
