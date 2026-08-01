---
phase: 4
title: "Web Learning Experience"
status: in_progress
effort: "10–14 engineer-days"
---

# Phase 4: Web Learning Experience

## Context and outcome

The current worktree implements the read-side web/auth slice plus the first
learner write route: public landing, invite-only sign-in, safe callback
handling, protected learner shell pages, catalog-backed learner reads, and
`POST /api/v1/learning/reviews/submit`. The remaining phase work is the
interactive learning and mutation layer beyond review submission.

**Depends on:** Phases 1–3.
**Can parallel with:** Phase 5 after shared contracts are frozen.
**Unblocks:** web-side AI integration and end-to-end quality tests.

## File ownership

Create/modify the web runtime and the learner-facing contracts required to keep
the browser and mobile clients free of internal answer keys:

- `apps/web/src/app/(public)/*`, `apps/web/src/app/(auth)/*`,
  `apps/web/src/app/(learner)/*`
- `apps/web/src/app/api/v1/{auth,learning,profile,privacy}/*`, excluding
  `api/v1/ai/*` owned by Phase 6 and sync/media routes owned by Phase 7
- `apps/web/src/components/*`, `apps/web/src/features/{auth,onboarding,lesson,review,progress,profile}/*`
- `apps/web/src/lib/{supabase,i18n,analytics}/*`
- `apps/web/src/server/*`, `apps/web/src/proxy.ts`
- `apps/web/src/styles/*`, `apps/web/public/fonts/*`
- `apps/web/package.json`, `apps/web/next.config.ts`, `pnpm-lock.yaml`
- `apps/web/test/*`, `apps/web/e2e/*`
- `packages/design-tokens/src/*`
- learner-facing additions under `packages/contracts/src/{auth,learning,profile}/*`
  and `packages/api-client/src/{auth,learning,profile}/*`

Do not edit native screens or AI provider code.

## Locked route and boundary decisions

- Public entry: `/`; authentication: `/sign-in` and `/auth/callback`.
- Learner destinations implemented today: `/today`, `/learn`, `/lessons/[lessonId]`,
  `/review`, `/assistant`, `/progress`, `/you`, `/you/settings`, and `/help`.
- Resumable setup and placement routes remain planned for later work.
- Deep learning routes and focused child routes under those segments remain the
  interactive learning target.
- `/assistant` is a labelled Phase 6 seam only until the AI provider runtime is
  implemented; Phase 4 does not fake chat behavior.
- Production reads use verified Supabase cookie or bearer identity and RLS. Test
  fixtures remain test-only while the Japanese corpus is review-only.
- Internal content manifests are never returned over HTTP. Public prompt DTOs
  structurally remove answer keys, explanations that reveal answers, internal
  rubrics, provenance, and unpublished editorial state.
- Cookie mutations use hardened `HttpOnly`, `SameSite=Lax` session cookies.
  Authenticated responses are private/no-store; state-changing cookie requests
  must pass same-origin and content-type checks.

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

- [x] Public landing, invite-only sign-in, responsive learner shell, and route
      recovery states are implemented from the Stitch direction.
- [x] OTP, PKCE callback, local sign-out, safe return path, CSRF/origin,
      active-profile/learner-role, and cookie-budget negative tests pass.
- [x] `/today`, `/learn`, and lesson overview use the real learner-safe catalog;
      future review/AI/progress routes are labelled planned states.
- [x] `POST /api/v1/learning/reviews/submit` uses the canonical payload hash,
      the dedicated learning login, `app_learning_api_executor`, and the
      learner-role recheck inside the mutation transaction.
- [x] Current slice passed keyboard/focus, 200% text reflow, 320px layout,
      full workspace lint/type/test/build, and production review. Evidence:
      [test report](./reports/tester-20260730-web-auth-learner-entry.md) and
      [review report](./reports/reviewer-20260730-web-auth-learner.md).
      The later review-submission slice also passed the full local workspace
      gates on 2026-08-01; see Session 10 in the plan log and the new tester
      report.
- [ ] All core web routes use real typed APIs and recovery states.
- [x] API matrix and cookie/CSRF/CORS invariants pass positive and negative tests.
- [ ] Stitch direction is reproduced without copying generated runtime code.
- [ ] Responsive, keyboard, screen-reader and CJK checks pass.
- [x] Focused commits and browser tests are green.
