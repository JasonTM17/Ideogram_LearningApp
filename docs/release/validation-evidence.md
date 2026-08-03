# Release Validation Evidence

## What counts as evidence

| Evidence type                                 | Accepted?                      | Notes                                              |
| --------------------------------------------- | ------------------------------ | -------------------------------------------------- |
| Source files and migrations in this workspace | Yes                            | Confirms the behavior exists in source             |
| Local unit/integration tests                  | Yes                            | Confirms local behavior under the current checkout |
| Docs validator output                         | Yes                            | Confirms the docs tree is internally consistent    |
| Local build and typecheck results             | Yes                            | Confirms the code compiles locally                 |
| Hosted CI status without a fresh local rerun  | No                             | Not enough for a release claim here                |
| Real-device mobile validation                 | No, unless explicitly captured | Must be proven separately                          |
| Deployed worker or browser runtime proof      | No, unless explicitly captured | Source presence is not deployment proof            |

## Current local proof boundary

- Placement routes exist in `apps/web/src/app/api/v1/learning/placement/*`.
- The web sync queue exists through IndexedDB plus service-worker registration code.
- The native sync queue exists through SecureStore plus Expo BackgroundTask registration code.
- The placement scorer exists in `apps/worker/src/placement-scorer.ts` and `apps/worker/src/placement-scoring-worker.ts`.
- The published Japanese N5 placement bank exists in `supabase/migrations/20260803002000_publish_japanese_n5_placement_and_scoring_jobs.sql`.

## 2026-08-03 service-role worker proof

`pnpm --filter @ideogram/worker test:integration:placement` passed against the
local Supabase runtime. The integration creates a submitted placement, invokes
the real worker through the public PostgREST surface with the local service-role
credential, and verifies `submitted -> claimed -> scored`, an `N4` result with
`0.950` confidence, and one proficiency snapshot. It then removes its fixture.

This run exposed and fixed a real deployment gap: PostgREST exposes `public`,
not the worker's `private` schema. Migration
`20260803003000_expose_placement_scoring_service_rpc.sql` now provides three
narrow public RPC wrappers executable only by `service_role`. pgTAP proves an
authenticated learner cannot call them.

## 2026-08-03 authenticated browser proof

A real Chromium session on `http://127.0.0.1:3001` confirmed:

- secure context, Service Worker, SyncManager, Web Locks, and IndexedDB support;
- a session-bound `placement-submit` queue record survived a full reload;
- the service worker did not replay a record while session identity was unavailable;
- with the verified cookie session, Background Sync submitted the placement,
  the server reported `sessionStatus: submitted`, and IndexedDB reached zero
  queued mutations only after the HTTP receipt;
- the nested placement catalog returned one published question set through RLS.

The authenticated runtime screenshot is
[`docs/media/browser-offline-runtime.png`](../media/browser-offline-runtime.png).
This is local Chromium proof, not production-host or cross-browser certification.

## 2026-08-03 local verification

The following commands passed from this checkout after the placement, durable
sync, session-isolation, worker single-flight, media-cache namespace, docs, and
visual changes:

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter @ideogram/web build
pnpm --filter @ideogram/mobile build
pnpm --filter @ideogram/worker build
pnpm content:lint
pnpm check:env
pnpm audit --prod
pnpm peers check
pnpm --filter @ideogram/mobile exec expo install --check
pnpm --filter @ideogram/worker test:integration:placement
node .claude/scripts/validate-docs.cjs docs/
pnpm exec supabase test db supabase/tests/placement_lifecycle_test.sql
pnpm exec supabase test db supabase/tests/review_idempotency_test.sql
pnpm test:db:review-lock-order
git diff --check
```

`pnpm format:check` also passed after the documentation refresh.

## Do not overstate

- Do not say the worker is live unless a deployed worker was actually run.
- Browser sync is proven only for the captured local Chromium run; do not widen
  that claim to production hosting or every browser.
- Do not say native background sync was proven unless a real device run was captured.
- Do not claim hosted CI as the only proof when local reruns are missing.

## Safe release commands

```bash
pnpm check:env
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
node .claude/scripts/validate-docs.cjs docs/
```
