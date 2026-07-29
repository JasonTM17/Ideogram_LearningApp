# Authentication Guide

## Current state

Sign-in, callback, and sign-out remain contract-led today. Protected server API
verification is now route-led for `GET /api/v1/learning/catalog`, but the app
auth lifecycle routes are still not implemented yet.

## Verified contracts

| Contract               | Source                                              | Purpose                                                                 |
| ---------------------- | --------------------------------------------------- | ----------------------------------------------------------------------- |
| Protected request auth | `apps/web/src/lib/supabase/request-auth.ts`         | Verifies bearer or SSR cookie sessions with Supabase Auth `getUser()`   |
| Catalog route          | `apps/web/src/app/api/v1/learning/catalog/route.ts` | Protected learner-catalog read path                                     |
| PKCE transaction       | `packages/auth/src/pkce-transaction.ts`             | Generates opaque state, nonce, verifier, and challenge values           |
| Callback consumption   | `packages/auth/src/authorization-callback.ts`       | Parses authorization-code callbacks and rejects token-bearing payloads  |
| Code exchange          | `packages/auth/src/authorization-exchange.ts`       | Requires a verified ID-token nonce to match the consumed transaction    |
| Session lifecycle      | `packages/auth/src/session-lifecycle.ts`            | Determines refresh timing and clears local credentials on sign-out      |
| Session cookies        | `packages/contracts/src/auth/auth-session.ts`       | Defines hardened web cookie attributes                                  |
| Planned API requests   | `packages/api-client/src/auth/auth-api-requests.ts` | Defines invite-only OTP, callback exchange, and sign-out request shapes |

## Allowed flow

1. A server-side registration service records an adult eligibility approval.
2. The app asks Supabase for an email OTP request with `shouldCreateUser: false`.
3. The client stores PKCE state, nonce, and verifier in one-use storage.
4. The callback parser accepts only authorization-code callbacks.
5. One-use storage atomically consumes a transaction only when both its state
   and exact redirect URI match; a mismatched URI cannot burn the valid state.
6. The callback exchange carries the stored verifier, state, and nonce. Its
   OIDC adapter must validate the token issuer, audience, signature, expiry,
   and nonce before a session is issued.

## Guardrails

- Bearer tokens in callback payloads are rejected.
- Redirect URIs are matched exactly, not by host suffix or path prefix.
- Expired or replayed PKCE state is rejected.
- PKCE entropy sources must return the expected byte lengths and the digest
  adapter must return a 32-byte SHA-256 result.
- Protected request parsing is strict: bearer credentials must use the
  `Authorization: Bearer ...` form, and the bearer client does not persist or
  refresh sessions.
- Web session cookies are hardened by the shared cookie options before they are
  written back to the SSR store.
- 401 is used for missing or rejected credentials; 503 is used for unexpected
  auth-provider unavailability.
- Local credential cleanup starts before remote sign-out completes, so a hung
  revocation call cannot leave the local session in place.
- Web session cookies are server-only, `httpOnly`, `SameSite=lax`, and
  `secure` in production.
- The native app still needs a production HTTPS universal/app-link configuration.
  The current custom-scheme fallback is only a development escape hatch.
- `private.session_claim_matches(subject_id, candidate_session_id)` only checks
  the current JWT claims against the subject. It does not prove session
  revocation state.

## Not implemented yet

- App route handlers for `/api/v1/auth/email-otp`, `/api/v1/auth/callback`, and
  `/api/v1/auth/sign-out`
- A native storage adapter for secure credential persistence
- A production deep-link callback deployment
- Authoritative session revocation checks for sensitive server actions
- A production OIDC exchange adapter that verifies ID-token claims before
  calling the nonce comparison helper

## Open questions

- Final launch auth provider set
- Where the production secure token store will live for native clients
- Whether web sign-in remains email OTP only or later expands to social login
