begin;

select plan(49);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'profiles has row-level security enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.account_roles'::regclass),
  'account_roles has row-level security enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.consent_records'::regclass),
  'consent_records has row-level security enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.data_subject_requests'::regclass),
  'data_subject_requests has row-level security enabled'
);

select throws_ok(
  $$
    insert into auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data)
    values (
      '00000000-0000-0000-0000-0000000000ff',
      'authenticated',
      'authenticated',
      'unapproved@example.test',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb
    )
  $$,
  '42501',
  'Registration is not available.',
  'an Auth user without a one-time registration approval is denied'
);

insert into private.registration_approvals (
  email_digest,
  approval_token_digest,
  adult_policy_version,
  policy_document_digest,
  adult_attested_at,
  expires_at
)
values (
  private.hash_email('retry@example.test'),
  private.hash_secret(repeat('x', 32)),
  'adult-beta-v1',
  repeat('e', 64),
  clock_timestamp() - interval '30 minutes',
  clock_timestamp() - interval '1 minute'
);

select lives_ok(
  $$
    select private.record_registration_approval(
      'retry@example.test',
      'yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy',
      'adult-beta-v1',
      repeat('f', 64),
      clock_timestamp(),
      clock_timestamp() + interval '15 minutes',
      null
    )
  $$,
  'an expired unconsumed registration approval can be safely replaced'
);
select is(
  (
    select approval_token_digest
    from private.registration_approvals
    where email_digest = private.hash_email('retry@example.test')
      and consumed_at is null
  ),
  private.hash_secret('yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy'),
  'the replacement registration approval stores only a fresh token digest'
);

insert into private.registration_approvals (
  email_digest,
  approval_token_digest,
  adult_policy_version,
  policy_document_digest,
  adult_attested_at,
  expires_at
)
values
  (
    private.hash_email('learner-a@example.test'),
    private.hash_secret('approval-token-a'),
    'adult-beta-v1',
    repeat('a', 64),
    clock_timestamp(),
    clock_timestamp() + interval '15 minutes'
  ),
  (
    private.hash_email('learner-b@example.test'),
    private.hash_secret('approval-token-b'),
    'adult-beta-v1',
    repeat('b', 64),
    clock_timestamp(),
    clock_timestamp() + interval '15 minutes'
  );

insert into auth.users (
  id,
  aud,
  role,
  email,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'learner-a@example.test',
    clock_timestamp(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"registration_approval_token":"approval-token-a"}'::jsonb,
    clock_timestamp(),
    clock_timestamp()
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'learner-b@example.test',
    clock_timestamp(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"registration_approval_token":"approval-token-b"}'::jsonb,
    clock_timestamp(),
    clock_timestamp()
  );

select is(
  (select count(*) from public.profiles),
  2::bigint,
  'approved Auth users receive profiles'
);
select is(
  (
    select adult_policy_version
    from public.profiles
    where user_id = '00000000-0000-0000-0000-000000000001'
  ),
  'adult-beta-v1',
  'profile receives the approved adult-policy version'
);
select is(
  (select count(*) from public.consent_records),
  2::bigint,
  'approved registration writes one append-only eligibility consent record per user'
);
select is(
  (
    select role_epoch
    from public.profiles
    where user_id = '00000000-0000-0000-0000-000000000001'
  ),
  1::bigint,
  'initial learner role advances the monotonically increasing role epoch'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001","session_id":"00000000-0000-0000-0000-0000000000c1"}',
  true
);
set local role authenticated;

select is(
  (select count(*) from public.profiles),
  1::bigint,
  'learner A can read only their own profile'
);
select is(
  (
    select count(*)
    from public.profiles
    where user_id = '00000000-0000-0000-0000-000000000002'
  ),
  0::bigint,
  'learner A cannot read learner B profile'
);
select lives_ok(
  $$
    update public.profiles
    set display_name = 'Learner A'
    where user_id = '00000000-0000-0000-0000-000000000001'
  $$,
  'learner A can update their allowed profile preferences'
);
select throws_ok(
  $$
    update public.profiles
    set timezone = 'Not/A_Timezone'
    where user_id = '00000000-0000-0000-0000-000000000001'
  $$,
  '22023',
  'timezone must be a valid IANA timezone identifier.',
  'learner A cannot persist a non-IANA timezone through direct table access'
);
select lives_ok(
  $$
    update public.profiles
    set display_name = 'Cross-user attempt'
    where user_id = '00000000-0000-0000-0000-000000000002'
  $$,
  'learner A cross-user profile update does not raise a database error'
);
select throws_ok(
  $$
    update public.profiles
    set account_state = 'frozen', revoked_at = clock_timestamp()
    where user_id = '00000000-0000-0000-0000-000000000001'
  $$,
  '42501',
  null,
  'learner A cannot change protected profile security state'
);
select throws_ok(
  $$
    update public.account_roles
    set revoked_at = clock_timestamp(), revocation_reason = 'escalation attempt'
    where user_id = '00000000-0000-0000-0000-000000000001'
  $$,
  '42501',
  null,
  'learner A cannot mutate account roles'
);
select throws_ok(
  $$
    update public.consent_records
    set decision = 'revoked'
    where user_id = '00000000-0000-0000-0000-000000000001'
  $$,
  '42501',
  null,
  'learner A cannot mutate append-only consent history'
);
select throws_ok(
  $$
    insert into public.data_subject_requests (
      user_id,
      request_kind,
      idempotency_key,
      subject_role_epoch,
      requesting_session_id,
      reauthenticated_at
    )
    values (
      '00000000-0000-0000-0000-000000000001',
      'deletion',
      '00000000-0000-0000-0000-0000000000b0',
      1,
      '00000000-0000-0000-0000-0000000000c1',
      clock_timestamp()
    )
  $$,
  '42501',
  null,
  'learner A cannot bypass server reauthentication to enqueue a data-subject request'
);
select ok(
  private.has_current_role(
    '00000000-0000-0000-0000-000000000001',
    'learner'
  ),
  'learner A current role is evaluated from database state'
);
select ok(
  private.session_claim_matches(
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-0000000000c1'
  ),
  'the session claim must belong to the current authenticated subject'
);

reset role;
reset "request.jwt.claim.sub";
reset "request.jwt.claims";

select is(
  (
    select display_name
    from public.profiles
    where user_id = '00000000-0000-0000-0000-000000000002'
  ),
  null::text,
  'learner A cross-user profile update leaves learner B unchanged'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001","session_id":"00000000-0000-0000-0000-0000000000c1"}',
  true
);
set local role authenticated;

select ok(
  not private.session_claim_matches(
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-0000000000c2'
  ),
  'a mismatched session claim fails closed'
);

reset role;
reset "request.jwt.claim.sub";
reset "request.jwt.claims";

set local role anon;

select throws_ok(
  $$select count(*) from public.profiles$$,
  '42501',
  null,
  'anonymous callers have no profiles table privilege'
);

reset role;

select lives_ok(
  $$
    update public.account_roles
    set revoked_at = clock_timestamp(), revocation_reason = 'test revocation'
    where user_id = '00000000-0000-0000-0000-000000000002'
      and role = 'learner'
  $$,
  'server-side role revocation succeeds'
);
select is(
  (
    select role_epoch
    from public.profiles
    where user_id = '00000000-0000-0000-0000-000000000002'
  ),
  2::bigint,
  'role revocation advances the profile role epoch instead of reusing it'
);

select throws_ok(
  $$
    insert into public.data_subject_requests (
      user_id,
      request_kind,
      idempotency_key,
      subject_role_epoch,
      requesting_session_id,
      reauthenticated_at
    )
    values (
      '00000000-0000-0000-0000-000000000002',
      'export',
      '00000000-0000-0000-0000-0000000000b2',
      1,
      '00000000-0000-0000-0000-0000000000c2',
      clock_timestamp()
    )
  $$,
  '42501',
  'Data subject request authorization is stale.',
  'a request cannot be enqueued with a stale role epoch'
);
select throws_ok(
  $$
    insert into public.data_subject_requests (
      user_id,
      request_kind,
      idempotency_key,
      subject_role_epoch,
      requesting_session_id,
      reauthenticated_at
    )
    values (
      '00000000-0000-0000-0000-000000000002',
      'export',
      '00000000-0000-0000-0000-0000000000b3',
      2,
      '00000000-0000-0000-0000-0000000000c2',
      clock_timestamp() - interval '16 minutes'
    )
  $$,
  '42501',
  'Data subject requests require recent server-verified reauthentication.',
  'a request cannot be enqueued from an expired reauthentication event'
);

insert into public.data_subject_requests (
  request_id,
  user_id,
  request_kind,
  idempotency_key,
  subject_role_epoch,
  requesting_session_id,
  reauthenticated_at
)
values (
  '00000000-0000-0000-0000-0000000000a1',
  '00000000-0000-0000-0000-000000000001',
  'deletion',
  '00000000-0000-0000-0000-0000000000b1',
  1,
  '00000000-0000-0000-0000-0000000000c1',
  clock_timestamp()
);

select throws_ok(
  $$
    update public.data_subject_requests
    set
      status = 'processing',
      worker_claimed_at = clock_timestamp(),
      lease_expires_at = clock_timestamp() + interval '5 minutes'
    where request_id = '00000000-0000-0000-0000-0000000000a1'
  $$,
  '23514',
  'Invalid data subject request state transition.',
  'a deletion request cannot skip the freeze state'
);
select throws_ok(
  $$
    update public.data_subject_requests
    set status = 'frozen'
    where request_id = '00000000-0000-0000-0000-0000000000a1'
  $$,
  '23514',
  'Frozen data subject requests require a freeze timestamp.',
  'a server cannot mark a request frozen without recording when the freeze occurred'
);
select lives_ok(
  $$
    update public.data_subject_requests
    set status = 'frozen', frozen_at = clock_timestamp()
    where request_id = '00000000-0000-0000-0000-0000000000a1'
  $$,
  'server can atomically freeze a data-subject request'
);
select is(
  (
    select transition_version
    from public.data_subject_requests
    where request_id = '00000000-0000-0000-0000-0000000000a1'
  ),
  2::bigint,
  'each accepted request-state transition advances a monotonic version'
);
select is(
  (
    select account_state
    from public.profiles
    where user_id = '00000000-0000-0000-0000-000000000001'
  ),
  'pending_deletion',
  'freezing a deletion request atomically blocks the learner account'
);
select throws_ok(
  $$
    update public.data_subject_requests
    set status = 'cancelled'
    where request_id = '00000000-0000-0000-0000-0000000000a1'
  $$,
  '23514',
  'A frozen deletion request cannot be cancelled.',
  'a deletion request cannot restore account access after the privacy freeze'
);
select throws_ok(
  $$
    update public.data_subject_requests
    set
      status = 'processing',
      worker_claimed_at = clock_timestamp(),
      worker_claimed_by = '00000000-0000-0000-0000-0000000000f1',
      lease_expires_at = clock_timestamp() + interval '5 minutes'
    where request_id = '00000000-0000-0000-0000-0000000000a1'
  $$,
  '42501',
  'Data subject requests must be claimed through the worker claim function.',
  'a frozen request cannot be directly claimed outside the worker helper'
);
select lives_ok(
  $$
    select private.claim_data_subject_request(
      '00000000-0000-0000-0000-0000000000a1',
      2,
      '00000000-0000-0000-0000-0000000000f1',
      300
    )
  $$,
  'a frozen request can be claimed only through a bounded worker lease helper'
);
select is(
  (
    select status || ':' || transition_version::text || ':' || worker_claimed_by::text
    from public.data_subject_requests
    where request_id = '00000000-0000-0000-0000-0000000000a1'
  ),
  'processing:3:00000000-0000-0000-0000-0000000000f1',
  'a worker claim records ownership and advances the request version'
);
select throws_ok(
  $$
    select private.claim_data_subject_request(
      '00000000-0000-0000-0000-0000000000a1',
      3,
      '00000000-0000-0000-0000-0000000000f2',
      300
    )
  $$,
  'P0001',
  'Data subject request is not available for claim.',
  'a second worker cannot overwrite an active request lease'
);
select throws_ok(
  $$
    update public.data_subject_requests
    set frozen_at = null
    where request_id = '00000000-0000-0000-0000-0000000000a1'
  $$,
  '42501',
  'Data subject request writes must be state transitions.',
  'a worker cannot erase the request freeze audit timestamp'
);
select throws_ok(
  $$
    update public.data_subject_requests
    set
      status = 'completed',
      completed_at = clock_timestamp(),
      completion_receipt = 'forged-direct-completion',
      lease_expires_at = null
    where request_id = '00000000-0000-0000-0000-0000000000a1'
  $$,
  '42501',
  'Data subject requests must be finalized through a worker function.',
  'a worker cannot directly acknowledge a request completion'
);

insert into private.data_subject_request_worker_operations (
  request_id,
  operation,
  worker_id,
  transaction_id
)
values (
  '00000000-0000-0000-0000-0000000000a1',
  'reclaim',
  '00000000-0000-0000-0000-0000000000f1',
  pg_catalog.txid_current()
);
update public.data_subject_requests
set
  worker_claimed_at = clock_timestamp() - interval '6 minutes',
  lease_expires_at = clock_timestamp() - interval '1 minute'
where request_id = '00000000-0000-0000-0000-0000000000a1';
select lives_ok(
  $$
    select private.reclaim_expired_data_subject_request(
      '00000000-0000-0000-0000-0000000000a1',
      4,
      '00000000-0000-0000-0000-0000000000f2',
      300
    )
  $$,
  'an expired processing lease can be reclaimed by a new worker'
);
select is(
  (
    select status || ':' || transition_version::text || ':' || worker_claimed_by::text
    from public.data_subject_requests
    where request_id = '00000000-0000-0000-0000-0000000000a1'
  ),
  'processing:5:00000000-0000-0000-0000-0000000000f2',
  'reclaim moves worker ownership with another monotonic version advance'
);
select throws_ok(
  $$
    select private.complete_data_subject_request(
      '00000000-0000-0000-0000-0000000000a1',
      5,
      '00000000-0000-0000-0000-0000000000f2',
      null
    )
  $$,
  '22023',
  'Data subject request completion input is invalid.',
  'a worker cannot complete a request without an effect receipt'
);
select lives_ok(
  $$
    select private.complete_data_subject_request(
      '00000000-0000-0000-0000-0000000000a1',
      5,
      '00000000-0000-0000-0000-0000000000f2',
      'test-deletion-completion-receipt'
    )
  $$,
  'the worker helper can finalize a valid claimed request with a receipt'
);
select is(
  (
    select status || ':' || transition_version::text
    from public.data_subject_requests
    where request_id = '00000000-0000-0000-0000-0000000000a1'
  ),
  'completed:6',
  'a worker completion retains the monotonic request history'
);

insert into public.data_subject_requests (
  request_id,
  user_id,
  request_kind,
  idempotency_key,
  subject_role_epoch,
  requesting_session_id,
  reauthenticated_at
)
values (
  '00000000-0000-0000-0000-0000000000a2',
  '00000000-0000-0000-0000-000000000002',
  'export',
  '00000000-0000-0000-0000-0000000000b4',
  2,
  '00000000-0000-0000-0000-0000000000c2',
  clock_timestamp()
);
insert into public.account_roles (user_id, role)
values ('00000000-0000-0000-0000-000000000002', 'support');
select throws_ok(
  $$
    update public.data_subject_requests
    set status = 'frozen', frozen_at = clock_timestamp()
    where request_id = '00000000-0000-0000-0000-0000000000a2'
  $$,
  '42501',
  'Data subject request authorization changed before freeze.',
  'a role change between enqueue and freeze invalidates the queued authorization'
);
select ok(
  (
    select not rolcanlogin and not rolbypassrls
    from pg_roles
    where rolname = 'app_security_definer'
  ),
  'security-definer role cannot log in or bypass RLS'
);
select ok(
  not has_function_privilege('anon', 'private.is_active_account(uuid)', 'execute'),
  'anonymous callers cannot execute private account-state helper'
);

select * from finish();
rollback;
