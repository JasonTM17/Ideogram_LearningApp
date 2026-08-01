# Privileged Operation Matrix

## Purpose

This matrix records who may perform sensitive operations and what reauthorization
is required through the current identity and Phase 4 delivery slice. It is not
a launch policy.

## Database privilege model

| Caller                 | Allowed privilege                                           | Notes                                                                                                                                                                         |
| ---------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Anonymous              | None                                                        | No direct read/write access to protected identity data                                                                                                                        |
| Authenticated learner  | Own profile preferences and allowlisted learner catalog RPC | Cannot mutate roles, consent history, or requests; raw catalog-table SELECT remains revoked, and the web learner shell requires current active profile and learner role state |
| Support/admin actor    | Server-managed only                                         | Must reauthorize against current DB state                                                                                                                                     |
| Worker                 | Service-role + current DB checks                            | Only runtime intended to hold the privileged secret; no direct learner-write path                                                                                             |
| App executor           | `app_learning_api_executor`                                 | Narrow boundary for learner-safe placement, evaluated activity, and review RPCs; no raw activity-persistence execute grant                                                    |
| Browser/mobile request | None                                                        | Must not carry service-role credentials                                                                                                                                       |

## Operation matrix

| Operation                                 | DB object or helper                                                               | Reauthorization required                                                     | Notes                                                                             |
| ----------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Create profile from approved registration | `private.handle_auth_user_created()`                                              | Approval trigger already consumed                                            | App never writes the row directly                                                 |
| Grant or revoke role                      | `public.account_roles` plus role epoch bump                                       | Current profile `role_epoch`                                                 | Server-managed, not client-managed                                                |
| Record consent                            | `public.consent_records`                                                          | Approval or user action depending on source                                  | Append-only                                                                       |
| Enqueue export/deletion                   | `public.data_subject_requests`                                                    | Server reauth before claim                                                   | No direct client enqueue yet                                                      |
| Claim processing work                     | `private.claim_data_subject_request()`                                            | Current subject state, epoch, version, lease                                 | One-use guard; direct writes are rejected                                         |
| Reclaim expired work                      | `private.reclaim_expired_data_subject_request()`                                  | Current state, epoch, version, expired lease                                 | Replaces worker ownership atomically                                              |
| Finalize processing work                  | `private.complete_data_subject_request()` / `private.fail_data_subject_request()` | Current state, claimant, version, receipt/code                               | One-use guard; direct writes are rejected                                         |
| Issue export URL                          | worker or trusted server helper                                                   | Active account plus owned prefix                                             | Signed URLs and revocation timing remain future work                              |
| Read or write private security events     | `private.security_events`                                                         | Server only                                                                  | Immutable log                                                                     |
| Request invite-only email OTP             | `POST /api/v1/auth/email-otp`                                                     | Same-origin JSON policy and bounded rate limits                              | Generic `202`; does not disclose account existence                                |
| Exchange passwordless callback            | `GET /auth/callback`                                                              | Valid ASCII flow ID, PKCE verifier, one-time code                            | Referrer suppressed; safe relative redirect only                                  |
| End current-device web session            | `POST /api/v1/auth/sign-out`                                                      | Verified cookie session and same-origin empty JSON                           | Local scope; not account deletion or global revoke                                |
| Read learner-safe catalog                 | `public.get_learner_catalog_data()` through SSR or `GET /api/v1/learning/catalog` | Verified user plus active profile/learner role                               | Deep allowlist; raw catalog tables remain closed                                  |
| Begin AI tutor turn                       | `private.begin_ai_tutor_turn()` via `POST /api/v1/ai/tutor/turn`                  | Active learner, current provider consent, active language pack, atomic quota | Binds user/conversation/turn/hash; reserves budget before provider call           |
| Complete AI tutor turn                    | `private.complete_ai_tutor_turn()`                                                | Same learner/hash and pending lease                                          | Stores structured response, token usage, model/config snapshot, and cost estimate |
| Fail AI tutor turn                        | `private.fail_ai_tutor_turn()`                                                    | Same learner/hash and pending lease                                          | Releases reservation; stores normalized failure code only                         |
| Purge AI tutor data                       | Purge-operation trigger on `private.learning_data_purge_operations`               | Service-role purge worker plus frozen deletion request                       | Removes turns, rate windows, and conversations in the same transaction            |

## Learning operation matrix

| Operation                    | DB object or helper                              | Reauthorization required                                                  | Notes                                                                                       |
| ---------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Start placement session      | `private.start_placement_session()`              | Active learner account and owned release                                  | Learner-safe write path through the app executor                                            |
| Record placement answer      | `private.record_placement_answer()`              | Active learner account, draft session for new answers                     | Idempotent replay stays valid after submission when the payload matches                     |
| Submit placement session     | `private.submit_placement_session()`             | Active learner account and owned session                                  | Returns the existing submitted/scored session when replayed                                 |
| Enroll learner in release    | `private.enroll_learner_in_release()`            | Active learner account and visible published release                      | Creates the enrolled state used by lesson/review helpers                                    |
| Initialize review item       | `private.initialize_review_item()`               | Active learner account and visible published release                      | Creates the first schedule row                                                              |
| Evaluate and submit activity | `private.evaluate_and_submit_activity_attempt()` | Active learner account, visible published release, and supported response | Server reads private content, computes evaluator-owned state/score, and recomputes progress |
| Persist activity attempt     | `private.submit_activity_attempt()`              | Definer evaluator only                                                    | Raw helper is not executable by `app_learning_api_executor`                                 |
| Submit review event          | `private.submit_review_event()`                  | Active learner account and visible published release                      | Deterministic SRS update with server receipt sequence                                       |
| Score placement session      | `private.score_placement_session()`              | Service role only                                                         | Worker-only writeback of placement outcome                                                  |
| Read placement scoring input | `private.get_placement_scoring_input()`          | Service role only                                                         | Worker-only read path for scoring rubric and answer data                                    |
| Purge learner learning data  | `private.purge_learner_learning_data()`          | Service role plus frozen deletion request                                 | Deletes learner learning state and writes a receipt; retry-safe after receipt exists        |

## Security-definer rules

- Use `SECURITY DEFINER` only for narrow helpers.
- Fix `search_path` on every definer function.
- Revoke the default permission to call these helpers from public.
- Never allow `app_security_definer` to log in or bypass RLS.
- `private.session_claim_matches(subject_id, candidate_session_id)` is a claim
  check only; it does not replace a future authoritative session-validation
  adapter.
- `app_learning_api_executor` exists as the app-side boundary for learner-safe learning RPCs. The migration grants it to `postgres` only so the local pgTAP suite can `SET LOCAL ROLE`; production still needs a real login role.
- The activity evaluator has a fixed `search_path`, runs as the narrow definer
  owner, serializes per learner before idempotency lookup, rechecks current
  release/enrollment access before replays, and is the only app-executable
  activity write surface. Its private receipt snapshot is not readable by the
  executor. It currently evaluates vocabulary acknowledgement and objective
  listening only.
- The learner shell gate independently checks `public.profiles.account_state = active`, `public.profiles.revoked_at is null`, and an active `learner` role before a protected learner page loads.

## Open questions

- Exact admin UI authorization boundary
- Whether any support workflow should be split from the admin role
- Which helper should own signed export URL issuance
