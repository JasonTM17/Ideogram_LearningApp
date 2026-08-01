---
phase: 2
title: "Web and Expo Assistant"
status: completed
effort: "1.5–2.5 engineer-days"
---

# Phase 2: Web and Expo Assistant

## Implementation

- Replace the web preference draft with a client component that submits bounded
  JSON through the same route, renders all response fields and exposes retry/
  error states without leaking provider details.
- Replace the Expo planned panel with a native form and response cards using
  native tokens, safe-area/keyboard behavior, accessible labels and truthful
  session/offline status.
- Generate conversation/turn UUIDs with the platform crypto already used by
  the app; do not use a user-controlled identity or provider identifier.
- Keep account-switch and unmount abort signals wired through the existing
  native auth session scope.

## Verification

- Web component tests cover validation, duplicate-submit guard, success,
  `503`, and session/error reset.
- Mobile feature tests cover validation, success, session change cancellation,
  retry and accessibility labels.
- Expo web export and Next production build compile the real assistant surface.
