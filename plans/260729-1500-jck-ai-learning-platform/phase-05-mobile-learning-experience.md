---
phase: 5
title: "Mobile Learning Experience"
status: pending
effort: "12–16 engineer-days"
---

# Phase 5: Mobile Learning Experience

## Context and outcome

Deliver a genuine iOS/Android Expo app with native navigation, safe areas,
permissions and accessibility. Share domain/tokens with web but implement every
screen and media boundary for React Native.

**Depends on:** Phases 1–3.
**Can parallel with:** Phase 4 after contracts freeze.
**Unblocks:** offline/media sync and mobile AI integration.

## File ownership

Create/modify:

- `apps/mobile/app/*`
- `apps/mobile/src/components/*`
- `apps/mobile/src/features/{auth,onboarding,today,lesson,review,progress,profile}/*`
- `apps/mobile/src/lib/{supabase,secure-session,deep-links,i18n,analytics}/*`
- `apps/mobile/assets/fonts/*`, `apps/mobile/test/*`
- `packages/design-tokens/src/native/*`
- `packages/api-client/src/native/*`

Phase 7 owns SQLite sync/media queues; Phase 6 owns AI feature implementation.

## Requirements and architecture

- Use Expo Router with labelled bottom tabs: Hôm nay, Ôn tập, Trợ lý, Tiến độ,
  Bạn. Lesson/review use full-screen stacks and predictable system back.
- Store session material only through Expo SecureStore; never use AsyncStorage
  for tokens. Use claimed HTTPS universal/app links, PKCE, state/nonce and
  one-use code exchange; custom schemes are fallback-only and no bearer appears
  in a callback URL.
- Follow the Phase 1 minimum OS/device and Expo `runtimeVersion` policy. Keep
  canonical API base URL/version explicit per environment and compatible with
  the previous supported binary.
- Implement the same product flow and content state as web without sharing DOM
  components. Native sheets, alerts, keyboard avoidance, haptics and permission
  prompts follow platform conventions.
- Support iOS Dynamic Type and Android font scaling to 200%, VoiceOver/TalkBack,
  44pt/48dp targets, safe areas, landscape and reduced motion.
- Vietnamese is default; active target pack selects proper CJK font/script and
  ruby strategy without loading all font families at startup.
- Before Phase 7, network-dependent actions expose truthful retry/offline
  messages and never claim offline completion. Phase 7 alone owns durable
  mutation queues/reconciliation.

## Implementation steps

1. Use `ck:mobile-development`, `ck:frontend-design` and shared design tokens to
   build native primitives and tab/stack shell from the five mobile references.
2. Implement secure Supabase session lifecycle, deep-link callback, expired
   token recovery/rotation and local logout cleanup; bind every cache/request to
   `user_id + session_epoch` and test cold-start callback routing.
3. Build onboarding/placement with keyboard-safe fields, resumable server state
   and explicit progress/error recovery.
4. Build Hôm nay/path/lesson activity renderers and answer submission using the
   shared contracts; keep audio/recording controls behind Phase 7 capability.
5. Build review queue/card/summary and progress/profile drill-downs optimized
   for a single-column native layout.
6. Add app-state/background transitions. Logout or account switch increments
   session epoch, aborts/awaits in-flight work and rejects late responses before
   accepting the next account; durable queue work remains Phase 7.
7. Add unit/component tests, device smoke scripts and accessibility labels;
   commit shell/auth → learning → review/progress → tests.

## Verification and acceptance

- Jest + React Native Testing Library cover navigation guards, forms, content
  rendering, font scaling and offline/error messages.
- Run Expo doctor, TypeScript, lint and native export/prebuild checks.
- Manual device matrix: one current and one older supported iOS/Android version,
  cold/warm auth callback, background/restore, landscape and low-connectivity.
- Hostile-app/custom-scheme interception, code replay, state/nonce mismatch,
  refresh reuse and delayed old-session response tests fail closed.
- VoiceOver/TalkBack traversal, large text and reduced-motion checks pass for
  auth, lesson and review.
- No imported web-only package appears in the native bundle.

## Risks, rollback and security

- **Risk:** web assumptions leak into native or deep links strand users. Enforce
  package boundaries and test cold-start callbacks on real devices.
- **Risk:** app-state race duplicates submissions. Use server operation IDs and
  session-epoch guards; Phase 7 reconciles durable pending actions.
- **Rollback:** keep store build/API compatibility for at least the previous
  supported binary; use EAS channel rollback only for JS-compatible changes.
- **Security:** redact auth callback URLs, clear secure/local learner state on
  logout and prevent screenshots only on future truly sensitive screens.

## Completion checklist

- [ ] Core native flows work on iOS and Android with real APIs.
- [ ] Navigation, deep links and secure session lifecycle are tested.
- [ ] PKCE/replay/hostile-link and account-switch race tests pass.
- [ ] Accessibility and font-scale device checks pass.
- [ ] Native bundle has no DOM/runtime coupling.
