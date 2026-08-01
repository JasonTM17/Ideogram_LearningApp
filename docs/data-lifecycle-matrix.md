# Data Lifecycle Matrix

## Purpose

This matrix inventories the verified stores that hold identity-adjacent data and
describes their current lifecycle posture.

## Auth lifecycle inventory

- Supabase Auth stores the raw email/session/provider data for sign-in and callback exchange.
- Web session and PKCE cookies are `httpOnly`, `SameSite=Lax`, and `secure` in production.
- Return-to cookies are normalized to safe same-origin paths, scoped to
  `/auth/callback`, and live for 15 minutes. Values are limited to 256 raw / 768
  encoded characters; only a generic or flow-specific value is stored, with at
  most four pending flow cookies.
- Local sign-out clears the local web session only; it is not a deletion request and not a global revocation guarantee.

## Inventory

| Store group                                      | Subject binding                       | Retention / TTL                           | Export                         | Purge / deletion              | Notes                                          |
| ------------------------------------------------ | ------------------------------------- | ----------------------------------------- | ------------------------------ | ----------------------------- | ---------------------------------------------- |
| `public.profiles`                                | `user_id`                             | Until account removal or server freeze    | Included in user export later  | Server-managed only           | Holds account state and locale preferences     |
| `public.account_roles`                           | `user_id`                             | Until role revocation or account removal  | Included in admin export later | Server-managed only           | Drives `role_epoch`                            |
| `public.consent_records`                         | `user_id`                             | Append-only history                       | Included                       | Not mutated inline            | Revocation is recorded as a new row            |
| `public.data_subject_requests`                   | `user_id`                             | Request ledger until lifecycle completion | N/A                            | State-machine driven          | Unified export/deletion queue                  |
| `private.registration_approvals`                 | hashed email                          | One-time and expiring                     | Not user-facing                | Consumed atomically           | Never stores raw DOB or raw registration email |
| `private.data_subject_request_worker_operations` | request + worker + transaction        | One statement only                        | N/A                            | Consumed by request trigger   | Ephemeral one-use worker-operation guard       |
| `private.security_events`                        | actor/subject ids                     | Not yet given a fixed policy              | Internal only                  | Immutable                     | Private audit trail                            |
| `storage.objects` in `learner-recordings`        | `owner_id` and `{user_id}/...` prefix | Until user or worker deletion             | Export path later              | Bucket policy + worker purge  | Private bucket                                 |
| `storage.objects` in `learner-attachments`       | `owner_id` and `{user_id}/...` prefix | Until user or worker deletion             | Export path later              | Bucket policy + worker purge  | Private bucket                                 |
| `storage.objects` in `learner-exports`           | `{user_id}/...` prefix                | Temporary, worker-created                 | Export artifact itself         | Server cleanup after delivery | Reader is the owner prefix                     |

## Learning lifecycle inventory

| Store group                                                                                                                                                                                                                                                                                                                | Subject binding                      | Retention / TTL                                                   | Export                                  | Purge / deletion                                                        | Notes                                                                                                                           |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `public.language_packs`, `public.learning_objectives`, `public.level_definitions`, `public.learning_paths`, `public.content_provenance`, `public.content_releases`, `public.content_units`, `public.lessons`, `public.activities`                                                                                          | Content catalog, not per-subject     | Published catalog retained until versioned archive or replacement | Content export later                    | Content archive does not delete learner history                         | Japanese pack is active, but its authored N5 source is review-only; Chinese and Korean are hidden until later release gates     |
| `public.learner_enrollments`, `public.placement_sessions`, `public.placement_answers`, `public.learner_activity_attempts`, `public.learner_activity_completions`, `public.learner_lesson_progress`, `public.learner_proficiency_snapshots`, `public.review_items`, `public.review_events`, `private.learner_event_cursors` | `user_id`                            | Until privacy purge or account removal                            | Included in future learner export paths | Purged by `private.purge_learner_learning_data()`                       | Append-only history is preserved until a governed deletion request completes                                                    |
| `private.learning_data_purge_receipts`                                                                                                                                                                                                                                                                                     | `request_id`, `user_id`, `worker_id` | Until deletion workflow completion                                | Internal only                           | One receipt per request; retained for audit until cleanup policy exists | A completed deletion request requires a matching purge receipt                                                                  |
| `private.ai_tutor_conversations` / `private.ai_tutor_turns`                                                                                                                                                                                                                                                                | `user_id`, conversation/turn UUIDs   | Until privacy purge; no legal TTL claimed                         | Not yet exposed                         | AI cleanup trigger deletes by user in the purge transaction             | Stores bounded learner prompt and structured Vietnamese response plus a server-only attempt lease; never direct client-readable |
| `private.ai_tutor_rate_windows`                                                                                                                                                                                                                                                                                            | `user_id`, hourly window             | Hourly accounting rows; cleanup with user purge                   | Not applicable                          | Same purge trigger removes windows                                      | Stores turn count, reservation, and estimated micro-USD only                                                                    |

## Current constraints

- Signed URL revocation and provider-side deletion verification are not yet
  implemented.
- Offline device resurrection handling is reserved for later phases.
- No legal retention schedule is claimed yet.
- The learning purge helper is idempotent after the receipt is written: a retry returns the recorded purge counts instead of deleting the same rows twice.
- The AI migration installs an `AFTER INSERT` trigger on
  `private.learning_data_purge_operations`; it deletes AI turns first, then rate
  windows and conversations, within the same transaction as the existing learning
  purge. AI rows are private and have no direct authenticated or service-role grant.
- The AI hardening migration acquires the same advisory lifecycle lock (`7210`)
  when a deletion request freezes an account. Executor-facing AI transitions are
  lease-token guarded; stale provider completions cannot overwrite a reclaimed
  attempt. The lock covers reservation transactions only: a DeepSeek request
  already in flight is not cancelled retroactively by a later freeze, and its
  response is fenced from persistence. Zero post-freeze provider processing would
  require an explicit cancellation/state-fence policy.
- `service_role` is the only runtime allowed to score placements or purge learning data; learner writes flow through the executor boundary.

## Open questions

- Exact TTL policy for audit events and exports
- Whether any store needs a formal legal hold path
- Backup expiry timing for deleted subjects
