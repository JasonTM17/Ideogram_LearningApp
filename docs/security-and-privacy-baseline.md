# Security and Privacy Baseline

## Scope

This document records the verified identity and privacy boundary for Phase 2.
It is evidence-based, not a claim of legal compliance or launch readiness.

## Verified baseline

| Area              | Current state                                                               |
| ----------------- | --------------------------------------------------------------------------- |
| Supabase signup   | `enable_signup = false` for Auth, email, SMS, and anonymous sign-in         |
| Auth surface      | No app auth route is implemented yet                                        |
| Public schema     | Only `public` is configured in the local API schema list                    |
| Storage           | Available through the Storage API and guarded by bucket and object policies |
| Production config | No production project, domain, or secret is configured in the repo          |

## Identity model

- Auth identity is provided by Supabase Auth.
- User creation is gated by a one-time registration approval trigger.
- The trigger consumes a hashed email plus hashed approval token.
- No raw date of birth or raw registration email is stored in application tables.
- `user_metadata` is scrubbed of the registration approval token before the
  trigger completes.

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
- Worker claim, completion, failure, and expired-lease reclaim helpers issue a
  transaction-bound one-use guard that the request trigger consumes. A helper
  call therefore does not leave a reusable direct-write permission behind.
- Browser, mobile, and request-layer runtimes should not hold service-role
  credentials.
- `private.session_claim_matches(subject_id, candidate_session_id)` only binds
  the current JWT claims to the subject. It is not authoritative revocation
  proof.

## Session validation note

Sensitive server actions still need a future authoritative session-validation
adapter or GoTrue verification path, plus the current DB `role_epoch` and
tombstone checks. Do not treat claim matching as immediate logout revocation.

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
