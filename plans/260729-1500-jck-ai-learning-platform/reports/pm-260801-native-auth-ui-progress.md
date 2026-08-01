---
title: Native auth UI progress
date: 2026-08-01
phase: 05-mobile-learning-experience
status: in_progress
---

# Native Auth UI Progress

## Delivered

- Stitch-generated and exported a dedicated Vietnamese mobile sign-in handoff.
- Added warm native palette, email-link form states, callback processing/error,
  and session-restoration screen.
- Added state/nonce callback validation, one-use transaction consumption, exact
  PKCE flow exchange, and non-enumerating ambiguous OTP handling.
- Guarded native learner routes until the session is hydrated.

## Evidence

| Check | Result |
| --- | --- |
| Mobile unit tests | 14 files, 84 tests passed |
| Mobile typecheck and lint | Passed |
| Expo web export | Passed |
| Browser QA | Sign-in default and invalid-email states captured |

## Release Gaps

1. Supply and claim the production HTTPS Universal Link / App Link domain.
2. Run cold/warm email callback tests on real iOS and Android devices.
3. Bind API requests to the session epoch and abort stale work after logout or account switching.
4. Connect the learner shell to live learning APIs and offline sync.

## Unresolved Questions

- Which approved production HTTPS domain will own the native callback association?
