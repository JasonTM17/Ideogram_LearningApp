---
phase: 2
title: Web activity completion
status: completed
priority: P1
effort: 5h
dependencies:
  - 1
---

# Phase 2: Web activity completion

## Overview

Turn the existing web lesson overview's vocabulary cards into a protected,
accessible activity experience. Server components resolve safe catalog data;
the client submits through the existing same-origin mutation route and presents
only server-confirmed progress.

## Requirements

- Functional: route from a lesson activity card to a vocabulary activity page,
  render term/reading/Vietnamese meaning/example, and enable confirmation only
  after the learner reaches the activity surface.
- Functional: submit `{ acknowledged: true }` with an immutable activity input,
  render receipt completion data, and offer retry only for safe transient
  failures.
- Functional: unsupported activities display an honest unavailable state.
- Non-functional: maintain web keyboard semantics, loading state, focus order,
  responsive editorial design, and no raw server error disclosure.

## Architecture

The nested server route obtains `CatalogLessonContext` through the existing
catalog reader and resolves `activityId` from that safe data. A small client
feature owns local attempt state, browser operation identity, and a narrow
same-origin `fetch` transport to `/api/v1/learning/activities/submit`. The
overview remains a read-side list; it only links to supported activity types.

## Related Code Files

- Create: `apps/web/src/app/(learner)/lessons/[lessonId]/activities/[activityId]/page.tsx`
- Create: `apps/web/src/features/learning/vocabulary-activity-view.tsx`
- Create: `apps/web/src/features/learning/vocabulary-activity-view.test.tsx`
- Create: `apps/web/src/features/learning/activity-attempt-client.ts`
- Create: `apps/web/src/features/learning/activity-attempt-client.test.ts`
- Modify: `apps/web/src/features/learning/lesson-overview-view.tsx`
- Modify: `apps/web/src/features/learning/lesson-overview-view.test.tsx`
- Modify: `apps/web/src/features/learning/catalog-presentation.ts`
- Modify: `apps/web/src/features/learning/catalog-presentation.test.ts`

## Implementation Steps

1. Add safe activity lookup/presentation helpers without changing catalog
   contracts or route serialization.
2. Build the protected nested page; retain the existing not-found/unauthorized
   behavior used by lesson routes.
3. Build the client interaction with a deterministic request factory, generic
   error mapping, disabled pending state, receipt state, and retry of the exact
   pending object.
4. Make only vocabulary activities navigable from the overview and mark all
   other types as unavailable rather than making decorative buttons interactive.
5. Verify visual implementation against the committed Stitch handoff using
   existing web tokens and components.

## Success Criteria

- [ ] Web user can complete a rendered vocabulary activity and see the returned
      completed/total count.
- [ ] Retry cannot generate a new operation identity before the old request is
      resolved or deliberately cleared.
- [ ] Keyboard, screen reader, mobile-width, loading, error, and receipt states
      are represented in tests or deterministic component state coverage.
- [ ] Web lint, typecheck, tests, and build pass.

## Risk Assessment

Server and client component boundaries can accidentally leak a client-only
storage dependency into SSR. Keep storage instantiation inside the client
component and test route data resolution independently.

## Implementation Steps

<!-- Detailed steps -->

## Success Criteria

- [ ] ...
