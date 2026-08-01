---
title: Native auth foundation progress
date: 2026-08-01
phase: 05-mobile-learning-experience
status: in_progress
---

# Native Auth Foundation Progress

## Delivered

- Expo SecureStore with chunk integrity, shared locks, and session cleanup.
- Installation-bound storage that removes iOS Keychain survivors after reinstall.
- A bounded shadow registry for Supabase PKCE slots, including orphan cleanup.
- Strict public Supabase configuration validation and a native-only client factory.
- AppState-controlled token refresh and a session epoch store for account changes.

## Evidence

| Check | Result |
| --- | --- |
| Mobile unit tests | 10 files, 60 tests passed |
| Mobile typecheck | Passed |
| Mobile lint | Passed |
| Expo Doctor | 20/20 passed |

## Remaining Phase Work

1. Build the native sign-in and one-time callback UI.
2. Require an exact claimed HTTPS callback URL in production and verify state/nonce before PKCE exchange.
3. Bind the session store into the app root and abort user-scoped requests on session-epoch changes.
4. Connect real learning APIs, offline learning state, device smoke tests, and release builds.

## Risks and Decisions

- No private DeepSeek, Supabase, or other secret is committed. Production secrets must be supplied only by the deployment environment.
- A universal/app-link domain is a release dependency; the app will fail closed if production callback configuration is missing or malformed.

## Unresolved Questions

- Which production HTTPS domain should be claimed for iOS Universal Links and Android App Links?
