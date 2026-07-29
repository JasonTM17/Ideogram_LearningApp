# Data Lifecycle Matrix

## Purpose

This matrix inventories the verified stores that hold identity-adjacent data and
describes their current lifecycle posture.

## Inventory

| Store                                            | Subject binding                       | Retention / TTL                           | Export                         | Purge / deletion              | Notes                                          |
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

## Current constraints

- Signed URL revocation and provider-side deletion verification are not yet
  implemented.
- Offline device resurrection handling is reserved for later phases.
- No legal retention schedule is claimed yet.

## Open questions

- Exact TTL policy for audit events and exports
- Whether any store needs a formal legal hold path
- Backup expiry timing for deleted subjects
