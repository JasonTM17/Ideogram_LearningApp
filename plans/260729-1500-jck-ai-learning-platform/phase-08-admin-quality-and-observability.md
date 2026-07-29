---
phase: 8
title: "Admin Quality and Observability"
status: pending
effort: "10–15 engineer-days plus content/security review"
---

# Phase 8: Admin Quality and Observability

## Context and outcome

Add a narrow content-operations surface and prove the integrated system is
observable, secure, accessible and regression-safe. Testing already exists in
each phase; this phase adds cross-system and release evidence.

**Depends on:** Phases 2–7.
**Unblocks:** release candidate and production readiness review.

## File ownership

Create/modify:

- `apps/admin/*`
- `apps/web/app/api/v1/admin/*`
- `packages/observability/src/*`, `packages/content-tools/src/*`
- `supabase/migrations/0007_admin-publishing-and-audit.sql`
- `supabase/tests/admin-authorization-and-publishing.sql`
- `tests/e2e/*`, `tests/load/*`, `tests/accessibility/*`,
  `tests/security/*`, `tests/fixtures/*`
- `.github/workflows/security-and-quality.yml`
- `docs/admin-content-operations.md`, `docs/observability-runbook.md`,
  `docs/security-threat-model.md`, `docs/test-strategy.md`

Feature code changes are limited to defects proven by these integrated checks
and committed separately from test/admin work.

## Requirements and architecture

- Admin is a separate Next.js app/runtime boundary with server-verified role
  plus current database role/RLS. It calls the canonical API with actor JWT;
  the admin runtime never receives a service-role key. Hiding navigation is
  never authorization.
- Scope is CMS-lite: draft/review/publish/retire content versions, provenance,
  preview, validation output and audit history. No arbitrary page builder or
  generic LMS authoring.
- Require two-state review separation for high-risk grammar/rubric/AI grounding
  content; author cannot silently publish a failed item.
- Publishing creates an immutable content release and transactional outbox,
  builds a new retrieval generation off-path, validates it, then atomically
  swaps the active pointer. Late/stale jobs cannot activate retired generations.
- Use structured OpenTelemetry-compatible events and an approved error/trace
  backend. Define event schema before vendor SDKs so replacement stays possible.
- Redact by default: no access tokens, raw learner answers/audio, prompt text,
  chat bodies or direct identifiers in logs/analytics.
- Establish SLO candidates for availability, common-read p95, AI first-token/
  completion latency, job backlog, sync failure and crash-free sessions.
- Load profiles and cost ceilings come from the Phase 1 capacity document:
  beta/DAU/concurrency, reviews/day, AI tokens/day, audio minutes, sync ops,
  storage/egress and content/embedding volume each have an owner and threshold.

## Implementation steps

1. Build admin guard and deny-by-default RLS tests, then content listing,
   edit/validate/preview/review/publish/retire flows through narrowly authorized
   API operations with actor reauthorization and immutable audit events.
2. Connect content lint/license/provenance checks; publish/retire/rollback use
   versioned outbox + off-path retrieval generation + atomic active-pointer swap.
3. Add structured request/job/sync/AI telemetry with correlation IDs and
   redaction tests. Separate operational metrics from consented product analytics.
4. Build dashboards/alerts for auth anomalies, API errors, AI cost/rate limits,
   job backlog/dead letters, sync failures and content publish failures.
5. Run full test pyramid: unit/property, contracts, DB/RLS, API integration,
   Playwright, mobile component/device smoke, accessibility, AI eval and load.
6. Apply `ck:security`, `ck:security-scan`, `ck:web-testing`,
   `ck:web-design-guidelines` and `ck:code-review`; record findings and fixes
   with evidence rather than suppressing gates.
7. Run privacy deletion/export saga with offline client/in-flight jobs/provider,
   system-wide backup/restore exercise and incident tabletop. Commit admin →
   telemetry → integrated tests → evidenced fixes.

## Verification and acceptance

- Learner accounts cannot reach admin APIs or mutate published content; admin
  role revocation takes effect according to the documented freshness strategy.
- Publish rollback restores previous content version without rewriting learner
- Publish→retire/rollback→late rebuild tests prove stale generations cannot
  become active or appear in AI/offline manifests.
- CI passes secret/dependency/SAST scans, all test tiers and accessibility gates;
  acknowledged exceptions have owner, expiry and rationale.
- Load test uses the signed beta workload/cost model and identifies saturation/
  stop thresholds; no unbounded queue/database fan-out.
- Observability test incidents trigger the intended alert without exposing PII.

## Risks, rollback and security

- **Risk:** admin service-role path becomes a broad bypass. Wrap each operation
  in actor JWT + current-role authorization; prohibit admin service-role secrets.
- **Risk:** telemetry becomes a shadow learner-data store. Schema allowlist,
  redaction unit tests, sampling and short retention mitigate it.
- **Rollback:** disable admin writes/analytics provider via flags; content
  versions and audits remain append-only.
- **Security:** complete STRIDE/OWASP review across web/mobile/API/storage/worker,
  dependency provenance and supply-chain permissions.

## Completion checklist

- [ ] CMS-lite publish/rollback and role policies are proven.
- [ ] Retrieval generation cutover and stale-job tests pass.
- [ ] Cross-system quality/security/accessibility gates pass.
- [ ] Dashboards, alerts and incident/privacy drills produce evidence.
- [ ] No unresolved Critical/High review finding remains.
