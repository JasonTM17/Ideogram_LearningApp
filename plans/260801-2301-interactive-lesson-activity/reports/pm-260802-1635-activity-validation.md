## Interactive Lesson Activity — Status 2026-08-02

### Plan state

| Phase | Status | Evidence |
| --- | --- | --- |
| 1. Lesson activity foundation | Completed | Shared identity store, browser adapter, native compatibility exports, persistence tests |
| 2. Web activity completion | Completed | Protected nested route, exact acknowledgement client, receipt/error UI, web tests/build |
| 3. Mobile activity completion | Completed | Protected Expo route, session-bound client, phone UI, native tests/export |
| 4. Validation and docs | In progress | All local gates pass; final CI/package check waits for push |

### Completed this session

- Added shared `ActivityAttemptLifecycle` for duplicate locking, exact retry
  retention, stop/unmount suppression, and terminal cleanup.
- Normalized browser/native UUID capability and format failures before sequence
  reservation; map them to terminal `IDENTITY_ERROR`.
- Added cross-tab web session invalidation, route-keyed lifecycle reset, and
  settled-abort feedback so a retry cannot be displayed while it remains busy.
- Synced all phase acceptance checkboxes against implementation evidence.
- Added docs sync, follow-up code review, and adversarial audit reports.
- Validated docs links/config keys, content, env contract, formatting, import
  boundaries, secret patterns, and production dependency audit.

### Quality evidence

- `pnpm test`: 11 packages green; root 20 passed / 1 skipped; mobile 111 tests;
  web 212 tests; api-client 84 tests.
- `pnpm typecheck`: 11/11 packages green.
- `pnpm lint`: 11/11 packages green; 42 import-boundary probes green.
- `pnpm build`: web Next build and Expo web export green.
- `pnpm audit --prod --json`: 0 critical/high/moderate/low vulnerabilities.
- `node .claude/scripts/validate-docs.cjs docs/`: 20 files, 33 links, 25 env
  keys verified.

### Remaining work

1. Mark phase 4 complete after push verification.
2. Commit the lifecycle hardening and the documentation/plan evidence in small
   conventional commits.
3. Push `main`, wait for GitHub Actions, and verify the GHCR tag points to the
   pushed commit SHA.

### Unresolved questions

- Coverage thresholds and real device/browser E2E are not configured; reports
  state these as unmeasured/environment-dependent rather than claiming them.
- Workspace-wide `format:check` also sees the ignored Expo-generated
  `apps/mobile/expo-env.d.ts`; the source itself says not to edit it. Every
  tracked file in this release was checked directly with Prettier.
