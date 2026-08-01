# Docs Update Report

## Status
- Completed

## Changes Made
- Added `POST /api/v1/learning/reviews/submit` to the API route inventory.
- Documented the review submission request body, receipt shape, canonical
  SHA-256 idempotency hash, `LEARNING_DATABASE_URL`, `SET LOCAL ROLE
  app_learning_api_executor`, timeout policy, replay/conflict semantics, and
  safe no-store/request-id errors.
- Added the transaction flow and role-lock write path to the architecture and
  review/sync docs so the learner-role recheck is explicit.
- Updated README, deployment, project overview, roadmap, codebase summary, and
  plan/phase evidence to reflect the live review write route, the full local
  validation pass, and the external-only production login credential work.
- Recorded Session 10, review findings, fail-closed production URL policy,
  existing-login drift checks, and database-CI configuration. Hosted CI is not
  claimed as complete.

## Current State Assessment
- Review submission is the first implemented learner write route.
- Final validation is rerun after the hardening commits; pgTAP has 42 review
  assertions and the dedicated local lock-order regression is wired into CI.
- Other learning mutations, interactive review UI, offline sync, and hosted
  production login credential wiring remain pending.

## Gaps Identified
- Activity submission route still planned.
- Full interactive learner mutation flows still not documented as implemented.
- Production deployment and cloud provisioning remain unverified.

## Recommendations
1. Land the remaining learning mutation routes only after their contracts are
   frozen.
2. Re-run docs validation after any follow-up API or provisioning change.
3. Keep the review write path and the mobile review UX docs synchronized.

## Metrics
- Docs touched: 11
- Validation status: docs validator passed
- Deployment status: not claimed

## Unresolved Questions
- Final owner for production learning-login credential provisioning.
