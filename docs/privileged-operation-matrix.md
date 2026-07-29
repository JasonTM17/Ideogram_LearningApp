# Privileged Operation Matrix

## Purpose

This matrix records who may perform sensitive operations and what reauthorization
is required. It is the current source of truth for Phase 2 docs, not a launch
policy.

## Database privilege model

| Caller                 | Allowed privilege                | Notes                                                                             |
| ---------------------- | -------------------------------- | --------------------------------------------------------------------------------- |
| Anonymous              | None                             | No direct read/write access to protected identity data                            |
| Authenticated learner  | Own profile preferences only     | Cannot mutate roles, consent history, or requests                                 |
| Support/admin actor    | Server-managed only              | Must reauthorize against current DB state                                         |
| Worker                 | Service-role + current DB checks | Only runtime intended to hold the privileged secret; no direct learner-write path |
| App executor           | `app_learning_api_executor`      | Narrow boundary for learner-safe placement, activity, and review RPCs             |
| Browser/mobile request | None                             | Must not carry service-role credentials                                           |

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

## Learning operation matrix

| Operation                    | DB object or helper                     | Reauthorization required                              | Notes                                                                                |
| ---------------------------- | --------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Start placement session      | `private.start_placement_session()`     | Active learner account and owned release              | Learner-safe write path through the app executor                                     |
| Record placement answer      | `private.record_placement_answer()`     | Active learner account, draft session for new answers | Idempotent replay stays valid after submission when the payload matches              |
| Submit placement session     | `private.submit_placement_session()`    | Active learner account and owned session              | Returns the existing submitted/scored session when replayed                          |
| Enroll learner in release    | `private.enroll_learner_in_release()`   | Active learner account and visible published release  | Creates the enrolled state used by lesson/review helpers                             |
| Initialize review item       | `private.initialize_review_item()`      | Active learner account and visible published release  | Creates the first schedule row                                                       |
| Submit activity attempt      | `private.submit_activity_attempt()`     | Active learner account and visible published release  | Recomputes lesson progress and preserves attempt history                             |
| Submit review event          | `private.submit_review_event()`         | Active learner account and visible published release  | Deterministic SRS update with server receipt sequence                                |
| Score placement session      | `private.score_placement_session()`     | Service role only                                     | Worker-only writeback of placement outcome                                           |
| Read placement scoring input | `private.get_placement_scoring_input()` | Service role only                                     | Worker-only read path for scoring rubric and answer data                             |
| Purge learner learning data  | `private.purge_learner_learning_data()` | Service role plus frozen deletion request             | Deletes learner learning state and writes a receipt; retry-safe after receipt exists |

## Security-definer rules

- Use `SECURITY DEFINER` only for narrow helpers.
- Fix `search_path` on every definer function.
- Revoke the default permission to call these helpers from public.
- Never allow `app_security_definer` to log in or bypass RLS.
- `private.session_claim_matches(subject_id, candidate_session_id)` is a claim
  check only; it does not replace a future authoritative session-validation
  adapter.
- `app_learning_api_executor` exists as the app-side boundary for learner-safe learning RPCs. The migration grants it to `postgres` only so the local pgTAP suite can `SET LOCAL ROLE`; production still needs a real login role.

## Open questions

- Exact admin UI authorization boundary
- Whether any support workflow should be split from the admin role
- Which helper should own signed export URL issuance
