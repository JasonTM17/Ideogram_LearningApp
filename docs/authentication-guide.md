# Authentication Guide

## Current state

Sign-in, callback, and sign-out are implemented in the web app as an invite-only
email OTP flow plus Supabase SSR PKCE. Protected server API verification is now
route-led for `GET /api/v1/learning/catalog`, and protected learner pages use
the same server-side session gate. The generic `packages/auth` contracts still
exist, but they are not the wired web implementation.

## Verified contracts

| Contract / route           | Source                                                                      | Current purpose / status                                                                                                                                                                                                 |
| -------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Web auth route config      | `apps/web/src/lib/supabase/auth-route-config.ts`                            | Derives the exact trusted origin and callback URL for the web auth flow                                                                                                                                                  |
| Protected request auth     | `apps/web/src/lib/supabase/request-auth.ts`                                 | Verifies bearer or SSR cookie sessions with Supabase Auth verification                                                                                                                                                   |
| Learner page session gate  | `apps/web/src/lib/supabase/learner-session.ts`                              | Requires a verified user, active profile, and active learner role before SSR rendering                                                                                                                                   |
| Email OTP route            | `apps/web/src/server/auth/email-otp-route.ts`                               | Invite-only request with `shouldCreateUser: false`, safe return cookie, generic `202`                                                                                                                                    |
| Callback route             | `apps/web/src/server/auth/callback-route.ts`                                | Browser `GET /auth/callback` PKCE exchange and safe redirect                                                                                                                                                             |
| Sign-out route             | `apps/web/src/server/auth/sign-out-route.ts`                                | Cookie-session-only local sign-out with empty JSON body                                                                                                                                                                  |
| Catalog route              | `apps/web/src/app/api/v1/learning/catalog/route.ts`                         | Protected learner-catalog read path                                                                                                                                                                                      |
| Session cookies            | `packages/contracts/src/auth/auth-session.ts`                               | Hardened web cookie attributes used by the auth/session helpers                                                                                                                                                          |
| Generic auth contracts     | `packages/auth/src/*`                                                       | Provider-agnostic PKCE, callback, nonce, and session helpers; contract-level only here                                                                                                                                   |
| Auth API request envelopes | `packages/api-client/src/auth/auth-api-requests.ts`                         | Email OTP and sign-out request builders only; no callback builder exists                                                                                                                                                 |
| Native Supabase foundation | `apps/mobile/src/lib/supabase/*` and `apps/mobile/src/lib/secure-session/*` | SecureStore persistence, installation-bound cleanup, PKCE shadow registry handling, native auth options, AppState refresh control, and session epochs; native callback UI and claimed HTTPS link handling remain pending |

## Allowed flow

1. `/sign-in` reads a safe relative `returnTo` path and keeps the form invite-only.
2. `POST /api/v1/auth/email-otp` validates `email` and `returnTo`, asks Supabase
   for an OTP with `shouldCreateUser: false`, stores the safe return cookie, and
   returns the generic accepted response without leaking account existence.
3. Supabase redirects back to `GET /auth/callback?code=...&sb_flow_id=...`.
4. The callback parser rejects token-bearing query fields, consumes the stored
   return path, and exchanges the code through Supabase SSR.
5. The callback route redirects with `303` to the normalized return target or to
   `/sign-in?reason=...` when exchange or provider state fails.
6. Protected learner pages re-read the current profile and learner role after
   `auth.getUser()`; frozen, pending-deletion, or role-revoked accounts fail
   closed. The catalog route uses the request-auth helper for bearer or cookie
   sessions and its RPC independently rechecks active account state.
7. `POST /api/v1/auth/sign-out` accepts only a verified cookie session and an
   empty JSON body, then calls `signOut({ scope: 'local' })`.

The native foundation follows a separate runtime boundary:

1. The native client factory accepts only a Supabase HTTPS origin and a
   publishable/legacy anonymous key; loopback HTTP is allowed only for local
   development.
2. Session material is persisted through the chunked Expo SecureStore adapter.
   The installation-bound storage layer clears retained credentials before the
   first read/write after a reinstall, and the PKCE shadow registry keeps
   track of active flow verifier slots.
3. Native auth options set PKCE, disabled URL detection, persisted secure
   storage, and explicit flow-ID redirects. The refresh controller starts and
   stops the SDK refresh ticker from AppState, while the session store exposes
   a user-bound `sessionEpoch`
   and initial anonymous hydration state for later native API guards.
4. Native callback UI, claimed HTTPS universal/app links, state/nonce
   exchange, one-use code exchange, root auth-provider wiring, and the abort
   coordinator are still pending; the custom scheme remains development-only.

## Guardrails

- `APP_ORIGIN` must match the exact web origin used by the app, and local dev is
  aligned to `http://127.0.0.1:3000`.
- The Supabase redirect allowlist must include the callback origin and the
  query-bearing callback path (`/auth/callback*`) so PKCE flow IDs can round-trip
  safely. The local `supabase/config.toml` already shows that shape; production
  config still needs separate verification.
- Bearer tokens in callback payloads are rejected.
- Callback redirects use `Referrer-Policy: no-referrer`; flow identifiers accept
  ASCII only and never become unvalidated cookie names.
- Expired or replayed PKCE state is rejected.
- Return targets are limited to 256 raw characters and 768 encoded characters.
  The app stores either the legacy generic cookie or the flow-specific cookie,
  never both, and retains at most four pending flow targets.
- Protected request parsing is strict: bearer credentials must use the
  `Authorization: Bearer ...` form, and the bearer client does not persist or
  refresh sessions.
- Web session cookies are hardened by the shared cookie options before they are
  written back to the SSR store.
- 202 is used for the generic OTP acceptance envelope; 303 is used for the
  callback redirect; 200 is used for same-origin local sign-out.
- Web session cookies are server-only, `httpOnly`, `SameSite=lax`, and `secure`
  in production.
- Local sign-out is not global revocation and does not delete user data.
- OTP requests have a bounded in-process, hashed defense-in-depth limiter:
  5 attempts per normalized email and, only when a trusted ingress is explicitly
  enabled, 30 attempts per verified proxy IP per 15 minutes. Supabase/provider
  controls remain authoritative; horizontally scaled production needs a
  distributed limiter before widening access.
- `TRUST_PROXY_IP_HEADERS` defaults to `false`. Enable it only when ingress
  strips client-supplied proxy headers and writes its own values.
- Native SecureStore persistence is implemented as a foundation, but the app
  still needs a production HTTPS universal/app-link configuration plus the
  callback UI and state/nonce exchange. The current custom-scheme fallback is
  only a development escape hatch.
- Native callback URLs must never carry access, refresh, or ID tokens. The
  pending native callback slice must accept only a one-use authorization code
  bound to the app-owned state/nonce transaction and Supabase PKCE flow ID.
- `private.session_claim_matches(subject_id, candidate_session_id)` only checks
  the current JWT claims against the subject. It does not prove session
  revocation state.

## Not implemented yet

- Native sign-in UI, callback parsing, and production deep-link callback
  deployment
- Root auth-provider wiring and an in-flight cancellation coordinator for
  logout/account switch
- Authoritative session revocation checks for sensitive server actions
- Any additional auth provider beyond the current invite-only email OTP flow
- An app-owned OIDC/nonce adapter if the generic `packages/auth` contract path
  is wired later

## Open questions

- Final launch auth provider set
- Which production HTTPS domain and store-owned universal/app-link association
  will be approved for native callbacks
- Whether web sign-in remains email OTP only or later expands to social login
