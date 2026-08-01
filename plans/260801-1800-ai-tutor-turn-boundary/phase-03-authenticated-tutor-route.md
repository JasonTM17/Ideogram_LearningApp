---
phase: 3
title: Authenticated Tutor Route
status: completed
effort: medium
---

# Phase 3: Authenticated Tutor Route

## Overview

Compose the existing Supabase request-auth and mutation policy with the private AI
ledger and DeepSeek gateway. The first route is bounded JSON; the accepted direct SSE
transport remains a separate follow-up once partial persistence/reconnect semantics
are designed.

## Implementation Steps

- Add `apps/web/src/server/ai/tutor-turn-repository.ts` for begin/complete/fail SQL
  calls, row parsing, and safe SQLSTATE-to-HTTP mapping.
- Add `POST /api/v1/ai/tutor/turn` with Node runtime, verified bearer/cookie auth,
  body/origin limits, fail-closed policy/config, request IDs/no-store headers, and
  dependency injection for route tests.
- Call DeepSeek only after a successful durable reservation; pass request abort and
  authenticated user identity; finalize usage/cost or mark failed in a second short
  transaction. Exact completed retries must not call DeepSeek again.
- Add route/repository tests for auth, invalid body, consent/disabled/quota errors,
  replay, provider failure, and opaque error responses.

## Success Criteria

- [ ] Unauthenticated and invalid requests reach neither repository nor provider.
- [ ] Provider failure leaves a failed durable turn and a generic 503 response.
- [ ] Successful and replayed receipts conform to the shared schema.
- [ ] No raw API key, prompt, provider response, or stack trace is returned/logged.
