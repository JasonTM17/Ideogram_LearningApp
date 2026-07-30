# Web/Auth/Learner Production Review — 2026-07-30

## Scope

- Passwordless web auth, callback, sign-out, session cookies, proxy refresh
- Active learner authorization and learner-safe catalog presentation
- Public/sign-in/learner responsive UI and accessibility state transitions
- Shared auth contracts, API request descriptors, and local Supabase redirects

## Findings resolved before commit

1. Callback redirects now set `Referrer-Policy: no-referrer`.
2. Email and PKCE flow identifiers reject Unicode-confusable input; malformed
   flow IDs are rejected before cookie access.
3. Callback cookie consumption is inside the guarded exchange path.
4. OTP defense-in-depth limiting hashes keys, bounds bucket/attempt memory,
   skips shared network buckets unless trusted proxy headers are explicitly
   enabled, and returns `Retry-After`.
5. Learner pages re-read active/unrevoked profile state and the active learner
   role after verified Supabase identity.
6. Return targets are capped to 256 raw / 768 encoded characters; generic and
   flow-specific cookies are not duplicated, and at most four pending flow
   targets remain.
7. Local Supabase Site URL and callback allowlist match the example
   `APP_ORIGIN`.

## Final assessment

No unresolved blocking or high-priority finding remains in this slice.

Known release condition: the in-process OTP limiter is supplemental. A
distributed control is required before horizontal scaling or wider production
access.

## Verification

- Contracts: 46 tests passed
- Web: 103 tests passed
- Full workspace lint, typecheck, tests, and production build passed
- Format, env contract, docs validation, diff hygiene, and production audit
  passed

## Unresolved questions

- Which deployment ingress and distributed rate-limit store will be selected
  for wider beta?

Status: DONE
