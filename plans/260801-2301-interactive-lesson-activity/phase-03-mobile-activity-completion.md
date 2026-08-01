---
phase: 3
title: Mobile activity completion
status: in-progress
priority: P1
effort: 5h
dependencies:
  - 1
---

# Phase 3: Mobile activity completion

## Overview

Add the matching protected Expo activity route and a phone-first vocabulary
completion surface. It uses the existing native API client, SecureStore-backed
operation identity, and session-bound abort signal; it does not claim offline
completion.

## Requirements

- Functional: a supported vocabulary activity in a lesson is pressable and
  opens `lessons/[lessonId]/activities/[activityId]` under the learner guard.
- Functional: activity lookup uses the current safe catalog context and renders
  only public vocabulary payload fields.
- Functional: confirmation uses native `submitActivityAttempt`, preserves the
  exact request for retry, cancels on session change, and shows server receipt.
- Functional: non-vocabulary activity types remain clearly unavailable.
- Non-functional: meet existing task-screen layout, touch target, accessibility
  label, error/retry, and content-size conventions.

## Architecture

The route composes current session, catalog context, native API client, and
`createExpoActivityOperationIdentityStore()`. A feature-level pure request/state
helper keeps retry logic testable. `LessonActivityList` gets a constrained
navigation callback only for supported activities; no passive card is made to
look tappable without behavior.

## Related Code Files

- Create: `apps/mobile/app/lessons/[lessonId]/activities/[activityId].tsx`
- Create: `apps/mobile/src/features/lesson/vocabulary-activity-screen.tsx`
- Create: `apps/mobile/src/features/lesson/vocabulary-activity-state.ts`
- Create: `apps/mobile/src/features/lesson/vocabulary-activity-state.test.ts`
- Modify: `apps/mobile/app/_layout.tsx`
- Modify: `apps/mobile/src/features/lesson/lesson-screen.tsx`
- Modify: `apps/mobile/src/features/lesson/lesson-activity-list.tsx`
- Modify: `apps/mobile/src/features/today/catalog-lesson-context.ts`
- Modify: `apps/mobile/src/lib/api/native-learning-api-client.ts`

## Implementation Steps

1. Add safe context lookup helpers and a learner-protected activity route.
2. Build a pure activity attempt state/request helper using the shared identity
   contract and immutable retry semantics.
3. Build the screen with the existing task scaffold, source vocabulary content,
   loading/receipt/generic error states, and session-bound request signal.
4. Update lesson activity navigation with supported/unavailable affordances and
   verify against the mobile Stitch handoff without copying its export markup.
5. Add native unit/component coverage for state transitions and route-safe
   activity resolution.

## Success Criteria

- [ ] Native learner can open and complete a vocabulary activity with a server
      receipt after a valid authenticated submission.
- [ ] A network-uncertain retry reuses the same reserved identity and immutable
      request body.
- [ ] Session loss/change prevents stale completion UI or mutation continuation.
- [ ] Mobile lint, typecheck, tests, and Expo export/build gate pass.

## Risk Assessment

Native auth and route lifetimes can change while an async request runs. Bind the
request signal to the current session and reject stale state updates by epoch or
abort semantics already used in the app.

## Implementation Steps

<!-- Detailed steps -->

## Success Criteria

- [ ] ...
