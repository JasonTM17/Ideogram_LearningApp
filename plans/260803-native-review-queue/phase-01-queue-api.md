---
phase: 1
title: Queue API
status: completed
priority: P1
effort: 4h
dependencies: []
---

# Phase 1: Queue API

## Overview

Expose the existing authenticated queue reader through a mobile-safe GET
endpoint and shared native API client method.

## Requirements

- Reuse `ReviewQueueResponse`; do not expose answer payloads or schedule write
  logic.
- Authenticate bearer requests with the existing `authenticateSupabaseRequest`
  policy, then pass its RLS-bound client to the queue repository.
- Preserve no-store response headers and existing API error envelopes.

## Related Code Files

- Create: `apps/web/src/app/api/v1/learning/reviews/route.ts` and tests.
- Modify: `packages/api-client/src/learning/learning-api-requests.ts`, native
  API client/tests, and package exports if required.

## Implementation Steps

1. Add the GET route dependency factory matching the catalog route pattern.
2. Add request/response helpers and one `getLearnerReviewQueue` method to the
   typed native API client.
3. Test authorization forwarding, response validation, API errors, and native
   bearer request behavior.

## Implementation Steps

<!-- Detailed steps -->

## Success Criteria

- [ ] The queue endpoint sends only the strict `ReviewQueueResponse`.
- [ ] Native requests validate the response and retain the existing timeout,
  cancellation, and session-refresh mechanics.
- [ ] Route and client tests cover success, malformed responses, and auth/API
  failures.

## Risk Assessment

The route must not replace the existing RLS boundary with service-role access;
pass the authenticated request client directly.
