---
phase: 1
title: "Native Transport and Catalog Context"
status: in_progress
effort: "1–2 engineer-days"
---

# Phase 1: Native Transport and Catalog Context

## Overview

Extend the strict native JSON executor with an authenticated POST variant that
uses the existing public activity request builder and receipt parser. Carry
the published `contentReleaseId` through both web and native lesson context
projections so a future runner cannot accidentally submit against a different
release.

## File ownership

- `packages/api-client/src/native/native-api-json-request.ts`
- `packages/api-client/src/native/native-api-errors.ts`
- `packages/api-client/src/native/native-learning-api-client.ts`
- `packages/api-client/src/native/index.ts`
- `packages/api-client/src/learning/learning-api-requests.ts`
- `packages/api-client/src/learning/learning-api-requests.test.ts`
- `packages/api-client/src/native/native-learning-api-client-*.test.ts`
- `apps/mobile/src/features/today/catalog-lesson-context.ts`
- `apps/mobile/src/features/today/native-learner-catalog.test.ts`
- `apps/web/src/features/learning/catalog-presentation.ts`
- `apps/web/src/features/learning/catalog-presentation.test.ts`

## Implementation Steps

1. Generalize the injected native fetch init type without weakening the
   bearer-only GET contract; add JSON POST headers/body while retaining opaque
   non-2xx and invalid-response errors.
2. Add `NativeApiClient.submitActivityAttempt`, validating input through
   `createActivityAttemptApiRequest` and parsing only the learner-safe receipt.
3. Preserve session identity checks before and after POST, including caller
   abort and timeout behavior.
4. Add `contentReleaseId` to web/mobile `CatalogLessonContext` projections and
   update the pure projection tests.

## Success Criteria

- [ ] Activity POST has exact path/body/auth/header assertions.
- [ ] HTTP, invalid JSON, session-change, timeout and abort tests remain green.
- [ ] Both presentation contexts preserve the catalog release identifier.
- [ ] No server-owned evaluation field is introduced in the client payload.
