---
phase: 4
title: Validation and docs
status: in-progress
priority: P1
effort: 2h
dependencies:
  - 2
  - 3
---

# Phase 4: Validation and docs

## Overview

Prove the vertical slice is truthful, compatible, and release-ready. Update
only documentation that changes user/developer workflow, preserve the visual
handoff, run focused and repo-wide gates, conduct a CK review, and push focused
commits.

## Requirements

- Functional: exercise successful, validation/error, uncertain-retry, and
  session-change cases on both clients where test infrastructure permits.
- Non-functional: run formatting, type, lint, package/unit, app build, content,
  environment, boundary, secret, and documentation checks appropriate to
  touched files.
- Documentation: explain supported activity scope, retry truthfulness, and
  content-release limitation without inventing live curriculum guarantees.
- Delivery: create small conventional commits, run secret scan before staging,
  push `main`, and verify CI plus public GHCR package publication.

## Related Code Files

- Modify: `docs/codebase-summary.md`
- Modify: `docs/system-architecture.md`
- Modify: `docs/project-roadmap.md`
- Modify: `README.md` only if the user-facing capability matrix changes
- Preserve: `plans/260801-2301-interactive-lesson-activity/design/**`
- Create: `plans/260801-2301-interactive-lesson-activity/reports/**` only for
  CK test/review/project-management reports

## Implementation Steps

1. Run focused package, web, and mobile checks after each phase; fix failures
   without weakening tests or contracts.
2. Run a test/review pass against the acceptance criteria and touchpoint blast
   radius, including security review of client storage/error handling.
3. Read actual implementation before updating docs; validate links and commands.
4. Stage only owned files, scan for secrets, make focused commits, push, then
   verify Actions and GHCR tags correspond to the pushed SHA.

## Success Criteria

- [ ] Every acceptance criterion has code or test evidence.
- [ ] No public API, schema, or environment contract breaks silently.
- [ ] Documentation matches the implemented supported activity scope.
- [ ] CI and package publication succeed for the final pushed commit.

## Risk Assessment

Full workspace gates can reveal pre-existing failures. Record baseline evidence,
isolate failures caused by this slice, and do not mask unrelated failures.

## Implementation Steps

<!-- Detailed steps -->

## Success Criteria

- [ ] ...
