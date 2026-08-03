---
phase: 3
title: Verification
status: completed
priority: P1
effort: 3h
dependencies:
  - 1
  - 2
---

# Phase 3: Verification

## Overview

Verify database, API, native component, workspace, and rendered-device paths.

## Related Code Files

- Create: `plans/260803-native-review-queue/reports/2026-08-03-native-review-queue-verification.md`.
- Modify: relevant docs only if the delivered mobile scope changes their
  implementation claims.

## Implementation Steps

1. Run focused tests, pgTAP, full lint/typecheck/test/build, docs checks, and
   production dependency audit.
2. Use Expo/browser tooling available locally to inspect loading, empty, and
   rendered review card states at phone dimensions.
3. Record only verified behavior, remaining constraints, and exact commands.

## Implementation Steps

<!-- Detailed steps -->

## Success Criteria

- [ ] All new focused tests pass with full workspace gates.
- [ ] Database SRS guards remain green after the API/native additions.
- [ ] Report links to evidence and lists unresolved questions.

## Risk Assessment

The native simulator/browser may need an authenticated local account. If it
cannot be provisioned safely, retain component evidence and report the exact
runtime gap rather than claiming an end-to-end test.
