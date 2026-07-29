---
phase: 4
title: "Web Learning Experience"
status: pending
effort: "10–14 engineer-days"
---

# Phase 4: Web Learning Experience

## Context and outcome

Deliver the responsive learner web experience from authenticated onboarding
through daily study, review and progress. Rebuild the approved Stitch hierarchy
with production components; exported HTML is evidence, not source code.

**Depends on:** Phases 1–3.
**Can parallel with:** Phase 5 after shared contracts are frozen.
**Unblocks:** web-side AI integration and end-to-end quality tests.

## File ownership

Create/modify only the web runtime:

- `apps/web/app/(public)/*`, `apps/web/app/(auth)/*`,
  `apps/web/app/(learner)/*`
- `apps/web/app/api/v1/{learning,profile,privacy}/*`, excluding
  `api/v1/ai/*` owned by Phase 6 and sync/media routes owned by Phase 7
- `apps/web/src/components/*`, `apps/web/src/features/{auth,onboarding,lesson,review,progress,profile}/*`
- `apps/web/src/lib/{supabase,i18n,analytics}/*`
- `apps/web/src/styles/*`, `apps/web/public/fonts/*`
- `apps/web/test/*`, `apps/web/e2e/*`
- `packages/design-tokens/src/web/*`

Do not edit native screens or AI provider code.

## Requirements and architecture

- Use Next.js App Router, Server Components for data-first views and Client
  Components only for interactive islands. No browser receives service-role or
  AI provider credentials.
- This Next.js deployment is the canonical versioned API host for web/mobile/
  admin. Each handler implements the frozen endpoint matrix and validates bearer
  or cookie identity, role, input, idempotency and output at the boundary.
- Web session cookies are `HttpOnly`, `Secure` in non-local environments and
  appropriately `SameSite`; every state-changing cookie request enforces the
  chosen CSRF token/origin policy, method/content type and trusted-origin CORS.
- Implement routes for welcome/auth, goal selection, placement, Hôm nay,
  learning path, lesson/activity, review queue/card/summary, progress and Bạn.
  Auth remains required before placement.
- Use Tailwind plus accessible Radix/shadcn primitives, customized to the
  Editorial Scholar tokens. Avoid copying default shadcn visual identity.
- Desktop uses one sidebar; tablet uses a navigation rail; mobile web uses the
  responsive web contract, not the Expo runtime. Lesson/review are focused flows.
- Vietnamese UI is default. Target content uses `lang`, Noto CJK per active pack,
  ruby/furigana support and locale-aware segmentation.
- Every data surface implements loading, empty, validation, server error,
  unauthorized and retry states. Never ship design sample names/progress as
  authenticated data.

## Implementation steps

1. Apply `ck:frontend-design`, `ck:frontend-development`, `ck:ui-styling`,
   `ck:react-best-practices` and the Stitch handoff to create tokens,
   typography, app shell and accessible primitives.
2. Implement SSR-compatible Supabase session/callback/logout and protected route
   boundaries. Preserve the requested return route without open redirects.
3. Build onboarding and placement as resumable server-backed forms with Zod
   validation, keyboard flow, progress semantics and failure recovery.
4. Build Hôm nay/path/lesson activity rendering from typed content; submit
   answers through idempotent server APIs and focus the feedback region.
5. Build review queue/card/summary with one recall decision at a time, explicit
   undo only where the domain contract permits it and no swipe-only action.
6. Build progress/profile/settings with text alternatives for charts and
   consent/privacy/download entry points.
7. Add route error boundaries, not-found/unauthorized views, metadata, font
   loading, analytics consent and performance budgets.
8. Add negative boundary tests for forged cross-origin mutation, open redirect,
   stale role/session, idempotency payload mismatch and malformed content type.
9. Commit app shell/auth → API/learning flows → review/progress → a11y/tests.

## Verification and acceptance

- Vitest/Testing Library cover forms, activity renderer and error states.
- Playwright covers sign-in callback, placement, first lesson, review and logout
  against deterministic local fixtures.
- Browser security tests cover forged POST/logout/delete/export, wrong Origin/
  CSRF token, hostile return URL and CORS preflight; all fail closed.
- Automated axe scan plus manual keyboard, 200% zoom and screen-reader smoke
  tests on critical routes; verify 320/375/768/1024/1440 widths.
- `pnpm --filter @ideogram/web lint`, `typecheck`, `test`, `build` all pass.
- Core route Web Vitals and JS budget are recorded; regressions block release.

## Risks, rollback and security

- **Risk:** excessive Client Components inflate JS and duplicate data state.
  Review boundaries and prefer server reads/mutations.
- **Risk:** HTML export introduces inaccessible or fake behavior. Rebuild with
  semantic components and real state fixtures only in tests.
- **Rollback:** web release is independently redeployable; retain previous
  compatible API contracts during rollback.
- **Security:** validate every route action server-side, use CSRF-safe auth
  contract, safe redirect allowlist, CSP/security headers and escaped rich text.

## Completion checklist

- [ ] All core web routes use real typed APIs and recovery states.
- [ ] API matrix and cookie/CSRF/CORS invariants pass positive and negative tests.
- [ ] Stitch direction is reproduced without copying generated runtime code.
- [ ] Responsive, keyboard, screen-reader and CJK checks pass.
- [ ] Focused commits and browser tests are green.
