# Security and Privacy Baseline

## Scope

This document records the verified identity and privacy boundary through the
current Phase 4 web/auth delivery slice. It is evidence-based, not a claim of
legal compliance or launch readiness.

## Verified baseline

| Area              | Current state                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------- |
| Supabase signup   | `enable_signup = false` for Auth, email, SMS, and anonymous sign-in                               |
| Auth surface      | Implemented `POST /api/v1/auth/email-otp`, `GET /auth/callback`, and `POST /api/v1/auth/sign-out` |
| Public schema     | Only `public` is configured in the local API schema list                                          |
| Storage           | Available through the Storage API and guarded by bucket and object policies                       |
| Production config | No production project, domain, or secret is configured in the repo                                |

## Identity model

- Auth identity is provided by Supabase Auth.
- User creation is gated by a one-time registration approval trigger.
- The web auth flow is invite-only email OTP with `shouldCreateUser: false`.
- No raw date of birth or raw registration email is stored in application tables.
- `user_metadata` is scrubbed of the registration approval token before the trigger completes.

## Public and private tables

| Table                                            | Visibility | Notes                                              |
| ------------------------------------------------ | ---------- | -------------------------------------------------- |
| `public.profiles`                                | Public     | Learner profile boundary and current account state |
| `public.account_roles`                           | Public     | Current role assignments and revocations           |
| `public.consent_records`                         | Public     | Append-only consent history                        |
| `public.data_subject_requests`                   | Public     | Unified export/deletion queue                      |
| `private.registration_approvals`                 | Private    | One-time approval records                          |
| `private.data_subject_request_worker_operations` | Private    | One-use worker write guards                        |
| `private.security_events`                        | Private    | Immutable security event log                       |

## Privileged execution model

- `app_security_definer` cannot log in and does not bypass RLS.
- Helper functions use a fixed `search_path`.
- Service-role access is worker-only in the current design.
- The worker runtime in this slice is readiness-only; the service-role helpers remain reserved, not exercised by the current worker stub.
- Worker claim, completion, failure, and expired-lease reclaim helpers issue a
  transaction-bound one-use guard that the request trigger consumes. A helper
  call therefore does not leave a reusable direct-write permission behind.
- Browser, mobile, and request-layer runtimes should not hold service-role
  credentials.
- `private.session_claim_matches(subject_id, candidate_session_id)` only binds
  the current JWT claims to the subject. It is not authoritative revocation
  proof.

## Protected API request verification

- The request-auth helper accepts either a strict Bearer token or the SSR
  cookie session path.
- Request identity is verified with Supabase Auth verification.
- Bearer clients are non-persistent and do not refresh or store sessions.
- Normal credential rejection becomes a 401 response.
- Unexpected auth-provider unavailability becomes a 503 response.
- The auth lifecycle routes are split by intent: OTP is a same-origin JSON mutation, the callback is a browser redirect, and sign-out is a local cookie-session mutation.
- Protected learner pages require the current profile to remain active and
  unrevoked and require an active learner role after Supabase verifies the user.
- Callback redirects suppress referrers; callback flow IDs are ASCII-only, and
  pending return-path cookies have bounded value and aggregate counts.
- OTP has a bounded hashed in-process limiter. Proxy IP buckets are disabled
  unless `TRUST_PROXY_IP_HEADERS=true` behind an ingress that overwrites those
  headers; provider and future distributed limits remain authoritative.
- Route errors are serialized with the generic shared API error body and an
  opaque request ID.

## Catalog data boundary

- Raw SELECT access on the learner-catalog source tables is revoked for
  authenticated callers.
- `public.get_learner_catalog_data()` is a `SECURITY DEFINER` aggregate RPC
  with a fixed search path and a deep allowlist for catalog fields.
- Anonymous callers have no execute privilege on the catalog RPC.
- The public schema is exposed through the local API configuration, so the
  safe aggregate RPC remains callable by authenticated database users even
  though the raw source tables stay closed.
- The RPC rechecks active-account state and returns an empty catalog for frozen
  or revoked accounts.
- Publication rejects missing or malformed learner-visible payload fields,
  out-of-contract nested cardinalities, empty unit/lesson branches, and
  JavaScript/Zod-incompatible UTF-16 string lengths.
- The database enforces both the raw-source preflight budget and an exact
  512 KiB cap on the fully projected aggregate before returning it.

## Session validation note

The protected catalog route has an authoritative GoTrue verification path.
Learner pages also re-read profile and learner-role state, while the catalog RPC
independently denies inactive accounts. Sensitive mutation paths still need the
future session-revocation adapter or DB `role_epoch` and tombstone checks. Do
not treat claim matching alone as immediate logout revocation for those
higher-risk actions.

## Storage posture

Three private buckets are established:

- `learner-recordings`
- `learner-attachments`
- `learner-exports`

The current object policies scope learners to their own `{user_id}/...` prefix.
Exports are worker-created and readable only from the owner prefix.

## Open questions

- Named product/legal owner for the adult-only beta
- Jurisdiction-specific privacy obligations that need to be added to the policy
- Production secret storage and rotation ownership
- Signed URL revocation and provider-side deletion verification timing
- Authoritative session revocation flow for sensitive server actions
