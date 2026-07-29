# Foundation Security Scan

Date: 2026-07-29  
Scope: Phase 1 application, workspace, CI and Supabase configuration

## Summary

| Category     | Critical | High | Moderate | Low |
| ------------ | -------- | ---- | -------- | --- |
| Secrets      | 0        | 0    | 0        | 0   |
| Dependencies | 0        | 0    | 1        | 0   |
| Code patterns| 0        | 0    | 0        | 0   |

No repository secret or Phase 1 release blocker was found. The user-provided AI
credential was not written, executed, logged, staged or committed; it must still
be revoked and replaced because it was disclosed outside the secret store.

## Evidence

- `git ls-files` found no tracked runtime `.env` file.
- High-confidence scans found no AWS, GitHub, Stripe, Slack, Google, Anthropic,
  private-key or JWT credential pattern in project files.
- `pnpm check:env` passed. Five root environment tests cover process variables,
  framework dotenv precedence, schema validation and Linux dotenv symlinks; four
  pass on Windows and the symlink case is intentionally exercised only on Linux.
- Forty executable lint probes reject Node/server imports, cross-app paths,
  non-literal dynamic imports, CommonJS/runtime loaders, URL modules and
  server-only Next.js entrypoints in browser/mobile/shared boundaries.
- Application source scanning found no dangerous DOM, evaluation, command
  interpolation or disabled-TLS pattern.
- `pnpm audit --prod --audit-level=high` exited successfully with zero
  High/Critical findings and one accepted Moderate transitive Expo build-tool
  advisory. See
  [dependency investigation](./dependency-audit-investigation.md).
- Supabase self-service signup is fail-closed, analytics is off and the internal
  `storage` schema is not exposed through PostgREST. Local Auth health returned
  HTTP 200 after restart.
- GitHub Actions use read-only permissions, immutable action SHAs and
  `persist-credentials: false`; commit policy covers pull requests and direct
  pushes.

## Limits

- This is a static foundation scan, not penetration testing.
- No production project, cloud secret store, deployed endpoint or real learner
  data exists yet.
- GitHub-hosted clean-runner execution remains unverified until the branch is
  pushed.
- Auth, RLS, storage policies, AI routes and abuse controls require dedicated
  threat-model and adversarial tests in later phases.

## Required follow-up

1. Revoke/rotate the disclosed AI credential before any provider integration.
2. Re-run dependency audit when Expo updates the affected transitive chain.
3. Run full STRIDE/OWASP review after Phase 2 identity/RLS and Phase 6 AI routes.

Status: PASS_WITH_MONITORED_RISK  
Unresolved questions: production secret-store owner; named adult/legal approver;
GitHub branch-protection state.
