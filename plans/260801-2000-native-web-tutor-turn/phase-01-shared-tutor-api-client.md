---
phase: 1
title: "Shared Tutor API Client"
status: completed
effort: "0.5–1 engineer-day"
---

# Phase 1: Shared Tutor API Client

## Implementation

- Add public tutor request/response builders and parsers beside the existing
  learning API request module.
- Extend the native client with `submitTutorTurn` using the existing abort,
  timeout, bearer/session-epoch and JSON content-type boundary.
- Export the client surface from `@ideogram/api-client/native` without importing
  `@ideogram/ai`.
- Add request-builder and native transport tests for happy path, invalid input,
  `401/403/409/429/503`, malformed JSON, abort and session change.

## Verification

- API-client unit tests and package typecheck/lint pass.
- Boundary probes prove mobile/shared/client code cannot import `@ideogram/ai`.
