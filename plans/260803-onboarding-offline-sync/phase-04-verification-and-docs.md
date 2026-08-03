---
phase: 4
title: Verification and docs
status: completed
priority: P1
effort: 4h
dependencies:
  - 1
  - 2
  - 3
---

# Phase 4: Verification and docs

## Overview

Run the full workspace/DB/runtime gates and synchronize the repository docs and
package inventory with the delivered scope.

## Requirements

- Fresh local Supabase reset and placement pgTAP plus existing review suites.
- Full format/content/env/lint/typecheck/test/build/audit gates.
- Browser/native visual check for friendly onboarding, empty/loading, pending
  sync, submitted/waiting states where an authenticated fixture is safe.
- Document explicit non-goals: media downloads, background sync, worker score
  automation, and production deployment.

## Related Code Files

- Modify: `README.md`, `docs/project-overview-pdr.md`, `docs/api-contract.md`,
  `docs/review-and-sync-contract.md`, `docs/system-architecture.md`,
  `docs/mobile-support-policy.md`, `docs/project-roadmap.md`,
  `docs/codebase-summary.md`, and showcase content.
- Create: `docs/offline-sync-contract.md` and plan-scoped verification report.

## Implementation Steps

1. Run focused tests, then full quality gates and fresh DB reset/pgTAP.
2. Audit every README/package claim against actual files and exports; remove
   stale “planned” wording only when the behavior is verified.
3. Regenerate any diagrams/GIF references only when source semantics changed.
4. Record evidence and unresolved runtime fixture questions.

## Success Criteria

- [ ] All focused/full gates pass with exact evidence recorded.
- [ ] Docs and package inventory match source reality.
- [ ] Remaining constraints are explicit, not hidden behind “complete” claims.
