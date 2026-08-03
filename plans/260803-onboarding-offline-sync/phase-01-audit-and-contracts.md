---
phase: 1
title: Audit and contracts
status: completed
priority: P1
effort: 4h
dependencies: []
---

# Phase 1: Audit and contracts

## Overview

Confirm the current placement schema/private helpers and define the public
answer-safe route/queue contracts before any UI or persistence changes.

## Requirements

- Add shared Zod contracts for placement bank/session/answer receipts and
  bounded durable mutation queue entries.
- Add route descriptors/builders/parsers in `@ideogram/api-client`.
- Keep the existing private worker scoring boundary intact.

## Related Code Files

- Create: `packages/contracts/src/learning/placement-contract.ts` and tests.
- Create: `packages/contracts/src/sync/sync-contract.ts` and tests.
- Modify: `packages/contracts/src/learning/index.ts` and root exports.
- Modify: `packages/api-client/src/learning/learning-api-requests.ts` and tests.
- Create: `plans/260803-onboarding-offline-sync/reports/` only for evidence.

## Implementation Steps

1. Verify table/function signatures, RLS projections, and current API error
   envelopes against source and fresh local Supabase.
2. Define bounded public placement shapes and mutation queue states; reject
   unknown fields and answer/rubric data at contract boundaries.
3. Define queue namespace `(userId, sessionEpoch)`, operation kinds, retry
   classification, and a sequential drain interface.
4. Record the audit findings and update plan dependencies before implementation.

## Success Criteria

- [ ] Placement and sync contracts parse valid payloads and reject leaks.
- [ ] API request builders match exact future route paths and methods.
- [ ] No contract implies worker scoring or background execution is client-owned.
