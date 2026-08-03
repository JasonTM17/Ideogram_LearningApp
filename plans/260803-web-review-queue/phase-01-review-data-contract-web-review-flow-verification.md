---
phase: 1
title: review-data-contract web-review-flow verification
status: in-progress
effort: 2-3 engineer-days
---

# Phase 1: review-data-contract web-review-flow verification

## Overview

Implement a small, real SRS loop for the supported vocabulary activity type.

## File ownership

- `supabase/migrations/*review*`, `supabase/tests/review_idempotency_test.sql`
- `apps/web/src/app/(learner)/review/*`
- `apps/web/src/features/review/*`, `apps/web/src/server/learning/*review*`
- `apps/web/src/styles/*`, affected shared learning operation helpers/tests
- `docs/*review*`, `README.md`, this plan's report

Do not alter native screens or replace the existing review mutation contract.

## Implementation Steps

1. Add an additive migration that initializes one immutable review item for
   each published vocabulary entry after the evaluator records a completed
   first attempt. Preserve the early idempotent-replay return.
2. Add a strict server-side review-queue reader backed by the authenticated
   Supabase client and map each queue item to the public vocabulary prompt in
   the already learner-safe catalog.
3. Replace the web planned-state route with a focused, keyboard-accessible
   client island. It reveals the answer on demand, accepts an explicit
   self-assessed grade, and renders the server-confirmed next schedule.
4. Reuse the existing operation-identity and mutation lifecycle guarantees;
   add specific request/error mapping only where the review flow needs it.
5. Add database, repository, client, and rendered component coverage. Run
   focused checks, Supabase pgTAP, full workspace gates, and visual QA.

## Success Criteria

- [x] Vocabulary completion creates deterministic entry review items exactly once.
- [x] Queue reads enforce the active learner/RLS boundary and validate DB data.
- [x] A reviewer can follow the protected web experience from queue to receipt.
- [x] Empty, unavailable, error, retry, and completed states are explicit.
- [ ] pgTAP migration execution and authenticated rendered-browser inspection are pending a local Docker/Supabase runtime.

## Risks and rollback

- `source_item_key` uses the published entry's one-based index. Content release
  immutability makes it stable; later granular identifiers require a versioned
  content contract rather than rewriting existing items.
- The grade remains a learner self-assessment. Do not imply automatic recall
  scoring or provide artificial confidence data.
- The migration is additive. Rollback hides the web flow and preserves review
  history; it must never delete recorded learner events.
