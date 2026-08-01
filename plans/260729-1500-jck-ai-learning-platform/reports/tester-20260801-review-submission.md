# Tester Report

## Scope

- Final local verification for the review-submission hardening slice.
- Covers production URL and role provisioning guards, lock-order harness
  cleanup, database CI configuration, and supporting docs.
- User-owned untracked scaffolding was preserved. Tests left no fixture files.

## Result

Local gates pass. The configured database CI job still needs its first hosted
run before it is release evidence.

## Validation

- `pnpm check:env` — pass
- `pnpm format:check` — pass
- `pnpm lint` — pass
- `pnpm typecheck` — pass
- `pnpm test` — `423 passed`, `1 skipped`, `0 failed`
- `pnpm build` — pass for web, mobile export, and worker
- `pnpm audit --prod --audit-level=high` — no known vulnerabilities
- Focused database environment test — `24/24` pass
- pgTAP review suite — `42/42` pass
- Local lock-order integration — pass; exact temporary learner fixture count
  verified as zero after cleanup
- Existing-login provisioning probes — injected role membership, executor
  `ADMIN OPTION`, and direct database ACL all rejected with `42501`, reverted,
  then clean provisioning passed

## Notes

- Database CI starts local Supabase, masks its ephemeral DB URL, runs pgTAP and
  the lock-order harness, then stops Supabase with `always()`.
- Optional local Supabase services remain stopped: imgproxy, edge runtime,
  analytics, vector, and pooler. Core DB/API tests remained usable.
- No coverage percentage was generated.

## Remaining Release Gates

1. Observe a successful hosted database-CI run.
2. Add distributed rate limiting before wider beta opens the bounded mutation pool.
3. Add request-ID-linked, secret-safe diagnostics under Phase 8.

## Unresolved Questions

- Which release owner confirms the first hosted database-CI run?
- Which ingress/distributed rate limiter will protect mutation-pool capacity?
