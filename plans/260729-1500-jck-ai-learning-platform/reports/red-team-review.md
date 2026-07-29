# Hard-mode Red Team Review

Date: 2026-07-29
Plan: `plans/260729-1500-jck-ai-learning-platform/`
Tier: Full, 9 phases, four adversarial lenses.

## Scope and method

- Reviewers: Security Adversary, Failure Mode Analyst, Assumption Destroyer,
  Scope & Complexity Critic.
- Raw findings: 28. Evidence filter: all retained findings contained at least
  one repository `path:line`; overlapping findings were merged.
- Adjudication: 14 accepted, 1 rejected. No explicit user decision was reversed.
  Accepted changes make existing adult-first, Japanese-first and production-ready
  intent executable.

## Adjudication

| # | Consolidated finding | Severity | Disposition | Evidence and applied plan |
|---|---|---|---|---|
| 1 | Service-role/admin privilege and revocation contract conflicted | Critical | Accept | Worker-only service role and privileged caller matrix: `phase-02-identity-data-and-security.md:50`, `phase-02-identity-data-and-security.md:52`, `phase-08-admin-quality-and-observability.md:41`. |
| 2 | Canonical API host, endpoint ownership and native/admin consumers undefined | High | Accept | Endpoint matrix/host frozen in `phase-01-foundation-and-delivery.md:56`; handlers consume it in `phase-04-web-learning-experience.md:42`. |
| 3 | Web cookie mutation surface lacked concrete CSRF/CORS invariants | High | Accept | Cookie/origin/content-type contract and negative tests: `phase-04-web-learning-experience.md:44`, `phase-04-web-learning-experience.md:87`. |
| 4 | Native auth callback lacked PKCE/replay/interception contract | High | Accept | Claimed HTTPS links, PKCE, state/nonce and one-use exchange: `phase-02-identity-data-and-security.md:42`, `phase-05-mobile-learning-experience.md:39`. |
| 5 | Age/consent and external account prerequisites were not fail-closed gates | Critical | Accept | Adult-only eligibility gate: `phase-02-identity-data-and-security.md:37`; external dependency/support ownership: `phase-01-foundation-and-delivery.md:60`. |
| 6 | Japanese content supply/licensing and future pack compatibility were not executable | High | Accept | Quantified content BOM/rights: `phase-03-learning-domain-and-content.md:44`; thin hidden ZH/KO fixtures: `phase-03-learning-domain-and-content.md:64`, `phase-03-learning-domain-and-content.md:88`. |
| 7 | Effort, team capacity and beta workload were inconsistent/undefined | High | Accept | Estimate normalized in `plan.md:6`; FTE/workload/cost ownership moved to `phase-01-foundation-and-delivery.md:60`. |
| 8 | AI vendor/eval/context/tool/SSE turn boundaries were incomplete | Critical | Accept | AI launch contract and durable turn state: `phase-06-ai-tutor-and-personalization.md:42`, `phase-06-ai-tutor-and-personalization.md:48`; tool effects require independent authorization. |
| 9 | Review conflict, clock skew and account-switch state ownership contradicted | Critical | Accept | Server causal order and payload-bound idempotency: `phase-03-learning-domain-and-content.md:55`, `phase-03-learning-domain-and-content.md:57`; session epoch: `phase-07-media-offline-and-sync.md:48`. |
| 10 | Worker enqueue/lease/recovery, migration order and speech grading ownership were incomplete | High | Accept | Transactional outbox/job envelope: `phase-06-ai-tutor-and-personalization.md:71`; Phase 7 now depends on Phase 6 and consumes its grading contract. |
| 11 | Publish/index race could expose or resurrect stale content | High | Accept | Immutable release, off-path generation and atomic pointer swap: `phase-08-admin-quality-and-observability.md:48`. |
| 12 | Deletion/export/backup lifecycle did not span local, provider, job and Storage copies | Critical | Accept | Tombstone saga/store matrix: `phase-02-identity-data-and-security.md:62`; offline purge guard: `phase-07-media-offline-and-sync.md:59`; system backup matrix moved to Phase 9. |
| 13 | CI/deploy supply chain lacked lock/action/fork-secret/provenance gates | High | Accept | Integrity lockfile, SHA pins and fork isolation: `phase-01-foundation-and-delivery.md:77`; Phase 9 verifies SBOM/attestations. |
| 14 | “Japanese-first” still needed explicit dormant ZH/KO fail-closed scope | Medium | Accept | Hidden packs and thin contract-only fixtures: `phase-03-learning-domain-and-content.md:64`, `phase-03-learning-domain-and-content.md:88`. |
| 15 | Missing current README blocks plan creation | Medium | Reject | Scout correctly records greenfield absence at `plans/reports/260729-initial-codebase-scout.md:24`; Phase 1 explicitly creates it at `phase-01-foundation-and-delivery.md:23`. No pre-existing code can be documented yet. |

## Decision deltas applied

- Canonical API: versioned Next.js Route Handlers consumed by web/mobile/admin.
- Privilege: service-role is worker-only; admin uses actor JWT, current DB role,
  narrow API/RPC and explicit revocation checks.
- Live AI: authenticated direct SSE with durable turn state; outbox worker only
  handles embeddings, audio/transcription and heavy grading.
- Learning state: append-only server-sequenced review events; device time is
  advisory, not last-write-wins.
- Local state: encrypted per-account namespace bound to session epoch; logout,
  deletion and user switch cannot replay old mutations.
- Content/AI state: immutable release/retrieval/prompt versions and atomic active
  generation cutover.
- Launch scope: adult-only Japanese beta; ZH/KO runtime fixtures remain hidden
  until independent content/evaluation gates.

## Whole-Plan Consistency Sweep

- Files reread: `plan.md`, all nine `phase-*.md`, design guideline, architecture
  research, DeepSeek provider decision and plan reports.
- Decision deltas checked: 14 accepted findings.
- Reconciled stale references: service-role scope, direct-SSE ADR numbering,
  migration/phase dependency, review timestamp conflict, grading ownership,
  staging timing, effort units and DeepSeek server-only environment contract.
- Static evidence: local links, required phase sections, whitespace, placeholder,
  stale-term and generic secret scans passed.
- CK parse/status: valid, `pending`, 0/9 phases started.
- Unresolved contradictions: 0.
