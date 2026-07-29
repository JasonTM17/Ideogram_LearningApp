---
phase: 2
title: "Identity Data and Security"
status: in_progress
effort: "5–7 engineer-days"
---

# Phase 2: Identity Data and Security

## Context and outcome

Establish a secure identity boundary before placement or learner data exists.
Supabase Auth proves identity; Postgres RLS remains the authorization source of
truth for every exposed table and private Storage object.

**Depends on:** Phase 1.
**Unblocks:** learner domain, web/mobile auth, AI and admin roles.

## File ownership

Create:

- `supabase/migrations/20260729102624_identity_baseline.sql`
- `supabase/migrations/20260729102626_identity_rls_storage.sql`
- `supabase/tests/identity_rls_test.sql`, `supabase/tests/storage_rls_test.sql`
- `packages/contracts/src/auth/*`, `packages/contracts/src/profile/*`
- `packages/auth/src/*`, `packages/api-client/src/auth/*`
- `docs/security-and-privacy-baseline.md`, `docs/authentication-guide.md`,
  `docs/privileged-operation-matrix.md`, `docs/data-lifecycle-matrix.md`,
  `docs/account-deletion-and-export-saga.md`

Modify only Phase 1 configuration if an auth dependency must be declared; record
the reason in that commit.

## Requirements and architecture

- Enforce the signed adult-only eligibility policy before account/placement.
  Minors are denied and directed to support; no voice/AI/analytics data is
  collected. A future minors track requires guardian/legal requirements first.
- Support one authenticated learner before placement. Default candidate is email
  OTP; social providers remain a validation decision. Native authorization uses
  claimed HTTPS links, PKCE, random state/nonce, one-use code exchange and never
  places access/refresh bearer tokens in URLs.
- Create minimal `profiles`, `account_roles`, `consent_records`,
  `data_subject_requests` and immutable security/audit event structures.
- RLS must be enabled on all `public` tables. Policies explicitly scope
  `SELECT`, `INSERT`, `UPDATE` and `DELETE` to `auth.uid()`/approved role; no
  mutable `user_metadata` is used for authorization.
- Treat admin role as server-managed metadata plus current database role state.
  Admin UI/API uses the actor JWT + RLS/narrow publish endpoint; service-role is
  prohibited in browser, mobile, web request and admin runtimes. It is worker-only.
- Create a privileged-operation matrix covering caller, DB role, RPC/function/
  view, Storage URL issuer and required reauthorization. Harden every
  `SECURITY DEFINER` function with fixed `search_path`, explicit grants and
  revoked default `EXECUTE`.
- Define private buckets and ownership policy now for future recordings,
  exports and learning attachments; deny public listing by default.
- Set consent, export and deletion lifecycle contracts. Do not claim legal
  compliance or age suitability until owner policy is validated.
- Inventory every DB/Storage/local/provider/job/log/analytics/backup store with
  owner, subject binding, TTL, export, purge/de-identification and legal exception.
  Deletion is a tombstone/freeze → cancel jobs → purge → verify saga that blocks
  offline/provider resurrection before acknowledging completion.

## Implementation steps

1. Configure Supabase local and approved isolated staging; production remains
   Phase 9. Create migration conventions and a migration-review checklist.
2. Implement identity/profile tables, `auth.users` trigger/reference strategy,
   role representation and all RLS policies with deny-by-default posture.
3. Create auth-session contracts usable by SSR Next.js and Expo without
   embedding server secrets. Include cookie attributes for web; PKCE/state/nonce,
   exact callback allowlist, refresh rotation/revocation, expired-session and
   sign-out behavior for native.
4. Define consent versions and auditable acceptance/revocation; define a
   request queue for `data_subject_requests` rather than deleting records inline.
5. Implement `role_epoch`/`revoked_at` or equivalent current-state check for
   every privileged mutation; queued jobs carry actor and reauthorize at claim.
6. Create private Storage bucket policies for `{user_id}/...` prefixes and
   narrowly authorized export/worker paths.
7. Write database tests for cross-user read/write, role escalation, anonymous
   access, every privileged RPC/view/function, Storage traversal/signed URL,
   revocation and `data_subject_requests` ownership.
8. Specify the deletion/export state machine, store inventory, SLA and backup
   expiry; include job cancellation and offline tombstone behavior.
9. Document threat model, secret handling, auth recovery and incident contact
   placeholders. Commit schema/policies and client contracts separately.

## Verification and acceptance

- `supabase db reset` then migration replay succeeds on a blank database.
- `supabase test db` proves a learner cannot read/write another learner's row
  or object; admin/service paths are tested separately.
- Unit tests cover session refresh, missing callback state and logout cleanup.
- Manual web + iOS/Android deep-link callback test occurs in staging before UI
  phase is accepted.
- Hostile-app interception, callback replay, state/nonce mismatch, refresh-token
  reuse and active-admin/queued-job revocation tests fail closed.
- Deletion drill with an in-flight worker and offline device does not recreate
  data after the completion acknowledgement.

## Risks, rollback and security

- **Risk:** an RLS policy is permissive due to missing `WITH CHECK`. Mitigate
  with policy tests for all CRUD verbs and migration review.
- **Risk:** role data becomes stale in a JWT. Restrict sensitive server checks
  to current DB state on every privileged mutation and define a revocation SLA.
- **Rollback:** additive migrations first; destructive identity changes require
  a reversible migration and backup rehearsal.
- **Security:** no auth token, raw provider response, IP address or deletion
  payload is logged in client analytics.

## Completion checklist

- [ ] Auth/profile/role/consent schema and RLS tests pass.
- [ ] Storage is private by default and path policies are tested.
- [ ] Session contracts work on SSR and native boundaries.
- [ ] Privileged callers/RPCs/views/functions follow the tested allowlist.
- [ ] Adult eligibility and deletion/export saga fail closed.
- [ ] Privacy lifecycle is documented and does not overclaim compliance.
