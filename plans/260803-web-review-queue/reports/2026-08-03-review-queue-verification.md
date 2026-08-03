# Web review queue verification

## Delivered

- Completed vocabulary activities create one immutable `vocabulary-{position}`
  review item per entry; historical active and paused enrollments are backfilled
  without rewriting existing item identity.
- `/review` now renders a protected, answer-on-demand vocabulary review flow.
  The learner explicitly self-assesses; only the server receipt advances the
  card and supplies the next scheduled time.
- Queue reads use the authenticated client/RLS, accept only exact supported
  source keys before the 50-card cap, and canonicalize PostgreSQL timestamps.
- The locked DB transaction rejects stale fresh submissions before `due_at`.

## Verification passed

- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` — web: 44 files, 230 tests; workspace: all packages passed.
- `pnpm build`
- `pnpm content:lint`, `pnpm check:env`, docs validator, `git diff --check`
- `pnpm audit --prod --json` — 0 production advisories.
- Two focused review passes; final adversarial pass found no remaining blocker.

## Pending external validation

`pnpm exec supabase test db supabase/tests/review_idempotency_test.sql` could
not connect because the local Docker Desktop engine was stopped and this
session lacks permission to start its Windows service. Run it after Docker is
available, then inspect `/review` with an authenticated learner and due items.

## Unresolved questions

- None in the code path; local DB/browser verification waits on Docker Desktop.
