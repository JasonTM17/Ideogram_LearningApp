---
phase: 9
title: "Release and Launch"
status: pending
effort: "7–12 engineer-days plus store/external review time"
---

# Phase 9: Release and Launch

## Context and outcome

Prepare reproducible staging/production delivery, operations and a controlled
Japanese-first beta. No deployment, service purchase or store publication occurs
without the account owner supplying credentials and explicit approval.

**Depends on:** all prior phases and zero unresolved blocking review findings.

## File ownership

Create/modify:

- `.github/workflows/{preview,staging,production,mobile-release,rollback}.yml`
- `.dockerignore`, `apps/web/{vercel.json,Dockerfile}`, `apps/admin/vercel.json`
- `apps/mobile/eas.json`, `apps/mobile/app.config.ts`
- `apps/worker/Dockerfile`, `apps/worker/deploy/*`
- `supabase/production/*`, `scripts/release/*`, `scripts/rollback/*`
- `docs/deployment-guide.md`, `docs/operations-runbook.md`,
  `docs/release-checklist.md`, `docs/data-recovery-runbook.md`,
  `docs/support-and-incident-guide.md`, `docs/project-roadmap.md`,
  `README.md`, `CHANGELOG.md`
- Store/brand assets only after final product name approval.

## Requirements and architecture

- Separate local/dev, preview, staging and production Supabase projects,
  domains, buckets, provider keys, analytics and notification credentials.
- GitHub environments protect staging/production secrets and approvals. Builds
  receive only target-required values; fork PRs receive none. Deploys use
  least-privilege short-lived OIDC credentials where supported; actions are SHA
  pinned and logs/artifacts never echo secrets.
- Default deployment: Vercel web/admin, EAS iOS/Android, Supabase managed data,
  one container worker on the approved managed runtime. No Redis until measured
  backlog/throughput justifies it.
- Publish reproducible `web` and `worker` OCI images to Docker Hub from the
  protected release workflow. Mobile remains a signed EAS/store artifact, never
  a container image. Build both images from the repository root with Turbo
  pruning, run as non-root, tag immutable `sha-<commit>` and approved `v<semver>`
  releases, and deploy only by verified digest. `latest` is an optional alias,
  never a deployment reference.
- Database release uses expand/migrate/contract changes and checks previous
  ordered migration DAG, expand/migrate/contract changes and an old/new
  client×API×schema compatibility matrix before any destructive migration.
- Define feature flags/kill switches for AI task, recording, notifications,
  language pack and content version.
- Launch Japanese only; Chinese/Korean remain hidden until their content,
  language-specific evaluation and support gates are independently passed.

## Implementation steps

1. Confirm final product name, domains, legal/privacy copy owner, provider/data
   agreements, budgets, store accounts and incident contacts.
2. Recreate the already approved isolated staging from code; load licensed
   pilot content; run migrations, RLS, AI eval, web E2E and device smoke suite.
3. Build signed reproducible web/worker/mobile artifacts with provenance/SBOM,
   verify signatures/attestations before deploy and fail the approved
   vulnerability thresholds. Verify store permission/privacy declarations.
   Docker Hub publication uses a dedicated scoped token stored only in the
   protected release environment; PR CI builds/scans images without registry
   credentials. Attach SBOM and maximum BuildKit provenance to each pushed
   digest, verify the attestation, and retain the digest/scan evidence in the
   release record.
4. Rehearse database backup/restore, migration rollback, previous web deploy,
   EAS update rollback, worker drain/replay and AI/recording kill switches.
   Backup matrix includes DB, Storage, outbox/job state, config/content/prompt
   releases and artifact provenance with RPO/RTO, restore order/integrity checks.
5. Create production workflow with manual approval, preflight checks, phased
   database/API/worker/mobile order, N-1 compatibility, health verification and
   automatic stop criteria.
6. Run internal alpha then invitation beta. Monitor activation, lesson completion,
   D7 retention, item defects, AI hallucination/rubric agreement, cost, latency,
   crash-free sessions and support incidents.
7. Gate public launch on quality evidence and staffed support/incident path;
   document rollback thresholds and owner for each signal.
8. Sync README, architecture, deployment, roadmap and changelog to actual
   shipped commands/contracts; run final CK test/review/ship/journal workflow.
9. Commit deployment config → runbooks/docs → release candidate fixes. Tag and
   push only after the user approves the exact release.

## Verification and acceptance

- A clean staging environment is recreated from code, migrations and approved
  secrets without dashboard-only configuration drift.
- Web/admin/worker health checks, iOS/Android signed builds and previous mobile
  binary compatibility pass.
- Restore and rollback exercises meet approved recovery objectives; evidence
  links are stored in the release record.
- Previous supported mobile binary passes the compatibility matrix before and
  after migration; contract cleanup waits until its support window closes.
- Web and worker Docker Hub images start successfully from their immutable
  digests, run as non-root, pass health checks, and have a verified SBOM,
  provenance, vulnerability scan and release-record link.
- Store privacy/data declarations, consent UI, deletion/export and retention
  behavior agree with the running product.
- Beta gates have numeric thresholds, owners and stop/rollback actions; no
  Critical/High security, data-loss or AI-quality issue remains.

## Risks, rollback and security

- **Risk:** mobile/store release cannot be instantly reverted. Use phased rollout,
  server compatibility and feature kill switches.
- **Risk:** migration/app order causes data loss. Use expand-contract, backup,
  preview diff and rehearsed restore.
- **Rollback:** previous web/worker artifact, compatible DB state, content/prompt
  version and EAS channel are identified before each production action.
- **Security:** least-privilege deployment identities, protected environments,
  OIDC where possible, verified signed artifacts, branch protection, scoped
  Docker Hub token rotation and key rotation.

## Completion checklist

- [ ] Staging and production delivery are reproducible and protected.
- [ ] Rollback/restore/mobile compatibility drills pass.
- [ ] SBOM/provenance, action pins, vulnerability and fork-secret gates pass.
- [ ] Docker Hub web/worker images are immutable-digest verified and recorded.
- [ ] Japanese-first beta meets agreed product, AI and reliability gates.
- [ ] Docs match shipped behavior; release/tag/push have explicit approval.
