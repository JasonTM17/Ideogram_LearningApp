# Privileged Operation Matrix

## Purpose

This matrix records who may perform sensitive operations and what reauthorization
is required. It is the current source of truth for Phase 2 docs, not a launch
policy.

## Database privilege model

| Caller                 | Allowed privilege                | Notes                                                  |
| ---------------------- | -------------------------------- | ------------------------------------------------------ |
| Anonymous              | None                             | No direct read/write access to protected identity data |
| Authenticated learner  | Own profile preferences only     | Cannot mutate roles, consent history, or requests      |
| Support/admin actor    | Server-managed only              | Must reauthorize against current DB state              |
| Worker                 | Service-role + current DB checks | Only runtime intended to hold the privileged secret    |
| Browser/mobile request | None                             | Must not carry service-role credentials                |

## Operation matrix

| Operation                                 | DB object or helper                                                               | Reauthorization required                       | Notes                                                |
| ----------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------- |
| Create profile from approved registration | `private.handle_auth_user_created()`                                              | Approval trigger already consumed              | App never writes the row directly                    |
| Grant or revoke role                      | `public.account_roles` plus role epoch bump                                       | Current profile `role_epoch`                   | Server-managed, not client-managed                   |
| Record consent                            | `public.consent_records`                                                          | Approval or user action depending on source    | Append-only                                          |
| Enqueue export/deletion                   | `public.data_subject_requests`                                                    | Server reauth before claim                     | No direct client enqueue yet                         |
| Claim processing work                     | `private.claim_data_subject_request()`                                            | Current subject state, epoch, version, lease   | One-use guard; direct writes are rejected            |
| Reclaim expired work                      | `private.reclaim_expired_data_subject_request()`                                  | Current state, epoch, version, expired lease   | Replaces worker ownership atomically                 |
| Finalize processing work                  | `private.complete_data_subject_request()` / `private.fail_data_subject_request()` | Current state, claimant, version, receipt/code | One-use guard; direct writes are rejected            |
| Issue export URL                          | worker or trusted server helper                                                   | Active account plus owned prefix               | Signed URLs and revocation timing remain future work |
| Read or write private security events     | `private.security_events`                                                         | Server only                                    | Immutable log                                        |

## Security-definer rules

- Use `SECURITY DEFINER` only for narrow helpers.
- Fix `search_path` on every definer function.
- Revoke the default permission to call these helpers from public.
- Never allow `app_security_definer` to log in or bypass RLS.
- `private.session_claim_matches(subject_id, candidate_session_id)` is a claim
  check only; it does not replace a future authoritative session-validation
  adapter.

## Open questions

- Exact admin UI authorization boundary
- Whether any support workflow should be split from the admin role
- Which helper should own signed export URL issuance
