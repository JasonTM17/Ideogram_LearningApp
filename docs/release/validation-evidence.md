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
node .claude/scripts/validate-docs.cjs docs/
pnpm exec supabase test db supabase/tests/placement_lifecycle_test.sql
pnpm exec supabase test db supabase/tests/review_idempotency_test.sql
pnpm test:db:review-lock-order
git diff --check
```

The workspace format script was not used as final evidence because it scans the
large, intentionally retained local working tree past this verification
window. Every changed text source in this slice was formatted directly with
Prettier before the tests above; `pnpm lint` and the builds are passing.

## Do not overstate

- Do not say the worker is live unless a deployed worker was actually run.
- Do not say browser sync was proven unless a browser run was captured.
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
