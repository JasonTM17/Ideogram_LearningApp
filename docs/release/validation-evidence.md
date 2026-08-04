# Release Validation Evidence

## What counts as evidence

| Evidence type                                 | Accepted?                      | Notes                                              |
| --------------------------------------------- | ------------------------------ | -------------------------------------------------- |
| Source files and migrations in this workspace | Yes                            | Confirms the behavior exists in source             |
| Local unit/integration tests                  | Yes                            | Confirms local behavior under the current checkout |
| Repo link/required-file validator output      | Yes                            | Confirms checked local links and required files    |
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
authenticated learner cannot call them. Unsupported scoring input is quarantined
through a fenced failure RPC so a malformed rubric cannot starve the queue.

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

## 2026-08-03 native background executor proof

The pure executor unit tests in
[`apps/mobile/src/lib/offline-sync/native-offline-sync-background-executor.test.ts`](../../apps/mobile/src/lib/offline-sync/native-offline-sync-background-executor.test.ts)
cover the native queue contract without claiming a real-device OS task run:

- an empty queue returns OS `success` without transport;
- cross-account or cross-session namespace mismatch clears the queue before
  any transport call;
- a raced account switch detected after session lookup clears the queue before
  transport;
- missing native session preserves queued work;
- retryable drain returns `failed`;
- a clean drain returns `success`;
- a stable blocked mutation returns scheduler success but remains blocked for
  user action and does not imply receipt completion; and
- dependency errors return `failed`.

The companion ownership tests in
[`apps/mobile/src/lib/offline-sync/owned-sync-queue-cleanup.test.ts`](../../apps/mobile/src/lib/offline-sync/owned-sync-queue-cleanup.test.ts)
add the compare-and-clear proof:

- stale background A cannot clear newer background B queue;
- a queue is cleared only when the stored namespace still matches the expected
  owner; and
- invalid storage values are left untouched when ownership cannot be proven.

The session-signal and drain path also prove that AbortSignal is bound to the
queued namespace, that the native abort path counts as retryable, and that auth
or storage read failures surface as OS-visible `failed` outcomes rather than
silent success.

The live background provider re-reads the Supabase session on each invocation
and refuses to transport if the persisted namespace has drifted while storage
lagged behind, so a stale account switch cannot push mutations from the wrong
user.

These tests prove executor and storage ownership behavior, not Expo
BackgroundTask scheduling on a real device.

The final mobile Vitest run executed 34 files and 146 tests. A direct source
scan finds 29 focused `it`/`test` declarations under the offline-sync module,
including executor, migration, queue-reader, session-signal, live-session,
blocked-mutation, and abort-retry proofs.

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
pnpm docs:check
pnpm exec supabase test db supabase/tests/placement_lifecycle_test.sql
pnpm exec supabase test db supabase/tests/review_idempotency_test.sql
pnpm test:db:review-lock-order
git diff --check
```

`pnpm format:check` also passed after the documentation refresh.

## 2026-08-03 container package proof

The repository-package hardening run built both local images from the checked-in
Dockerfiles:

```text
docker build --file Dockerfile --tag ideogram-learning-web:local .
docker build --file Dockerfile.worker --tag ideogram-learning-worker:local .
```

The web image ran as `nextjs`, exposed a Docker healthcheck, and returned
`status: ok` from `/api/v1/health`. The worker image ran as `worker`, exposed a
process-liveness healthcheck, and contained production dependencies only. This
local worker proof did not validate database readiness. Both runtime stages use
the same pinned Node 24 Alpine digest and exclude npm, Corepack, and Yarn
because package managers are not required after build.

Trivy `0.73.0` scanned both final local images with vulnerability-only scanning,
`HIGH,CRITICAL`, and `ignore-unfixed`. Both reports returned zero matching OS or
Node-package vulnerabilities. This proves the local image contents only.

## 2026-08-04 alpha.2 repository preview release proof

The final repository preview tag is
[`v0.1.0-alpha.2`](https://github.com/JasonTM17/Ideogram_LearningApp/releases/tag/v0.1.0-alpha.2),
cut from commit `81d2b1239077877846d6b3cf78398c679f1652d2`.

- Tag CI run: [30873588546](https://github.com/JasonTM17/Ideogram_LearningApp/actions/runs/30873588546)
- Final main run: [30873262910](https://github.com/JasonTM17/Ideogram_LearningApp/actions/runs/30873262910)

That release published the same tested images to GHCR and verified the
immutable digests below:

| Package | Verified GHCR digest                                                      |
| ------- | ------------------------------------------------------------------------- |
| Web     | `sha256:a0f5ba12566ee2a08e249d6189782be24075fcad8996a82b91077dc4cb043926` |
| Worker  | `sha256:e481ec304406ad512a400531469784ed7e36f57cacae630a486f1e3192bf4764` |

Docker Hub was not published for this release because the protected
credentials were unavailable. The deterministic source tar.gz and
`SHA256SUMS.txt` were attached, with source checksum
`940cda41d98d519540f3d583576cfa7d7abe34c05e46c91599888e0625a34002`. Worker
database readiness and public runtime deployment also remain unproven.

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
pnpm docs:check
pnpm content:lint
pnpm peers check
pnpm --filter @ideogram/mobile exec expo install --check
pnpm audit --prod --audit-level=high
```
