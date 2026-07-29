-- Identity baseline for the adult-only closed beta.
--
-- This migration deliberately stores neither date of birth nor raw registration
-- email in application tables. A server-side registration service records a
-- one-time, hashed approval after the adult eligibility gate has succeeded.
-- The Auth trigger consumes that approval atomically before creating a profile.

create schema if not exists private authorization postgres;

do $block$
begin
  create role app_security_definer noinherit nologin;
exception
  when duplicate_object then null;
end;
$block$;

revoke all on schema private from public, anon, authenticated;
revoke all on schema public from public;
revoke create on schema public from anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;

alter default privileges for role postgres
  revoke execute on functions from public;
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public;
alter default privileges for role postgres in schema private
  revoke all on tables from public, anon, authenticated;
alter default privileges for role postgres in schema private
  revoke execute on functions from public;

create table private.registration_approvals (
  approval_id uuid primary key default extensions.gen_random_uuid(),
  email_digest text not null check (email_digest ~ '^[0-9a-f]{64}$'),
  approval_token_digest text not null
    check (approval_token_digest ~ '^[0-9a-f]{64}$'),
  adult_policy_version text not null
    check (char_length(adult_policy_version) between 1 and 128),
  policy_document_digest text not null
    check (policy_document_digest ~ '^[0-9a-f]{64}$'),
  adult_attested_at timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default clock_timestamp(),
  consumed_at timestamptz,
  consumed_user_id uuid,
  created_by_user_id uuid,
  check (expires_at > adult_attested_at),
  check ((consumed_at is null) = (consumed_user_id is null))
);

create unique index registration_approvals_unconsumed_email_idx
  on private.registration_approvals (email_digest)
  where consumed_at is null;

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete restrict,
  display_name text check (char_length(display_name) between 1 and 80),
  preferred_ui_locale text not null default 'vi-VN'
    check (preferred_ui_locale in ('vi-VN')),
  timezone text not null default 'Asia/Ho_Chi_Minh'
    check (char_length(timezone) between 1 and 64),
  adult_policy_version text not null
    check (char_length(adult_policy_version) between 1 and 128),
  adult_eligibility_attested_at timestamptz not null,
  account_state text not null default 'active'
    check (account_state in ('active', 'frozen', 'pending_deletion')),
  role_epoch bigint not null default 0 check (role_epoch >= 0),
  revoked_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  check (
    (account_state = 'active' and revoked_at is null)
    or (account_state <> 'active' and revoked_at is not null)
  )
);

create table public.account_roles (
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  role text not null check (role in ('learner', 'content_editor', 'support', 'admin')),
  granted_at timestamptz not null default clock_timestamp(),
  granted_by_user_id uuid,
  revoked_at timestamptz,
  revoked_by_user_id uuid,
  revocation_reason text check (char_length(revocation_reason) <= 280),
  primary key (user_id, role),
  check (revoked_at is null or revoked_at >= granted_at),
  check ((revoked_at is null) = (revocation_reason is null))
);

create index account_roles_active_role_idx
  on public.account_roles (role, user_id)
  where revoked_at is null;

create table public.consent_records (
  consent_id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete restrict,
  policy_key text not null check (char_length(policy_key) between 1 and 120),
  policy_version text not null check (char_length(policy_version) between 1 and 128),
  policy_document_digest text not null
    check (policy_document_digest ~ '^[0-9a-f]{64}$'),
  decision text not null check (decision in ('accepted', 'revoked')),
  source text not null check (source in ('registration_service', 'web', 'mobile', 'support')),
  idempotency_key uuid not null,
  recorded_at timestamptz not null default clock_timestamp(),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  unique (user_id, idempotency_key)
);

create index consent_records_user_policy_recorded_idx
  on public.consent_records (user_id, policy_key, recorded_at desc);

create table public.data_subject_requests (
  request_id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete restrict,
  request_kind text not null check (request_kind in ('export', 'deletion')),
  status text not null default 'requested'
    check (status in ('requested', 'frozen', 'processing', 'completed', 'failed', 'cancelled')),
  transition_version bigint not null default 1 check (transition_version >= 1),
  idempotency_key uuid not null,
  subject_role_epoch bigint not null check (subject_role_epoch >= 0),
  requesting_session_id uuid not null,
  reauthenticated_at timestamptz not null,
  requested_at timestamptz not null default clock_timestamp(),
  frozen_at timestamptz,
  freeze_role_epoch bigint check (freeze_role_epoch >= 0),
  worker_claimed_at timestamptz,
  worker_claimed_by uuid,
  lease_expires_at timestamptz,
  completed_at timestamptz,
  completion_receipt text check (char_length(completion_receipt) between 1 and 280),
  failure_code text check (char_length(failure_code) between 1 and 120),
  unique (user_id, request_kind, idempotency_key),
  check (completed_at is null or status = 'completed'),
  check ((status = 'completed') = (completion_receipt is not null)),
  check (reauthenticated_at <= requested_at),
  check (frozen_at is null or status in ('frozen', 'processing', 'completed', 'failed')),
  check (freeze_role_epoch is null or frozen_at is not null),
  check (worker_claimed_at is null or status in ('processing', 'completed', 'failed')),
  check ((worker_claimed_at is null) = (worker_claimed_by is null)),
  check (lease_expires_at is null or status = 'processing'),
  check ((status = 'failed') = (failure_code is not null))
);

create unique index data_subject_requests_one_active_per_user_idx
  on public.data_subject_requests (user_id)
  where status in ('requested', 'frozen', 'processing');

create index data_subject_requests_worker_claim_idx
  on public.data_subject_requests (status, requested_at)
  where status in ('requested', 'frozen', 'processing');

create table private.security_events (
  event_id uuid primary key default extensions.gen_random_uuid(),
  occurred_at timestamptz not null default clock_timestamp(),
  actor_user_id uuid,
  subject_user_id uuid,
  session_id uuid,
  request_id uuid,
  event_type text not null check (char_length(event_type) between 1 and 120),
  outcome text not null check (outcome in ('allowed', 'denied', 'failed', 'completed')),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object')
);

create index security_events_subject_occurred_idx
  on private.security_events (subject_user_id, occurred_at desc);

create index security_events_actor_occurred_idx
  on private.security_events (actor_user_id, occurred_at desc);

create table private.data_subject_request_worker_operations (
  request_id uuid primary key references public.data_subject_requests (request_id) on delete cascade,
  operation text not null check (operation in ('claim', 'complete', 'fail', 'reclaim')),
  worker_id uuid not null,
  transaction_id bigint not null,
  created_at timestamptz not null default clock_timestamp()
);

create function private.hash_email(value text)
returns text
language sql
immutable
strict
set search_path = pg_catalog, extensions
as $function$
  select pg_catalog.encode(
    extensions.digest(
      pg_catalog.convert_to(pg_catalog.lower(pg_catalog.btrim(value)), 'UTF8'),
      'sha256'
    ),
    'hex'
  );
$function$;

create function private.hash_secret(value text)
returns text
language sql
immutable
strict
set search_path = pg_catalog, extensions
as $function$
  select pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to(value, 'UTF8'), 'sha256'),
    'hex'
  );
$function$;

create function private.record_registration_approval(
  p_email text,
  p_approval_token text,
  p_adult_policy_version text,
  p_policy_document_digest text,
  p_adult_attested_at timestamptz,
  p_expires_at timestamptz,
  p_created_by_user_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, private
as $function$
declare
  approval_id uuid;
  approval_now timestamptz := pg_catalog.clock_timestamp();
begin
  if p_email is null
    or pg_catalog.btrim(p_email) = ''
    or p_approval_token is null
    or pg_catalog.char_length(p_approval_token) < 32
    or p_adult_policy_version is null
    or pg_catalog.char_length(p_adult_policy_version) not between 1 and 128
    or p_policy_document_digest is null
    or p_policy_document_digest !~ '^[0-9a-f]{64}$'
    or p_adult_attested_at is null
    or p_expires_at is null
    or p_expires_at <= p_adult_attested_at
    or p_expires_at <= approval_now then
    raise exception using
      errcode = '22023',
      message = 'Registration approval input is invalid.';
  end if;

  update private.registration_approvals
  set
    approval_token_digest = private.hash_secret(p_approval_token),
    adult_policy_version = p_adult_policy_version,
    policy_document_digest = p_policy_document_digest,
    adult_attested_at = p_adult_attested_at,
    expires_at = p_expires_at,
    created_at = approval_now,
    created_by_user_id = p_created_by_user_id
  where email_digest = private.hash_email(p_email)
    and consumed_at is null
    and expires_at <= approval_now
  returning private.registration_approvals.approval_id into approval_id;

  if approval_id is not null then
    return approval_id;
  end if;

  insert into private.registration_approvals (
    email_digest,
    approval_token_digest,
    adult_policy_version,
    policy_document_digest,
    adult_attested_at,
    expires_at,
    created_by_user_id
  )
  values (
    private.hash_email(p_email),
    private.hash_secret(p_approval_token),
    p_adult_policy_version,
    p_policy_document_digest,
    p_adult_attested_at,
    p_expires_at,
    p_created_by_user_id
  )
  returning private.registration_approvals.approval_id into approval_id;

  return approval_id;
exception
  when unique_violation then
    raise exception using
      errcode = '23505',
      message = 'An active registration approval already exists.';
end;
$function$;

create function private.validate_registration_approval()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, private, extensions
as $function$
declare
  approval_token text := nullif(new.raw_user_meta_data ->> 'registration_approval_token', '');
  matched_approval_id uuid;
begin
  if new.is_anonymous
    or new.email is null
    or pg_catalog.btrim(new.email) = ''
    or approval_token is null then
    raise exception using
      errcode = '42501',
      message = 'Registration is not available.';
  end if;

  update private.registration_approvals
  set
    consumed_at = pg_catalog.clock_timestamp(),
    consumed_user_id = new.id
  where email_digest = private.hash_email(new.email)
    and approval_token_digest = private.hash_secret(approval_token)
    and consumed_at is null
    and expires_at > pg_catalog.clock_timestamp()
  returning approval_id into matched_approval_id;

  if matched_approval_id is null then
    raise exception using
      errcode = '42501',
      message = 'Registration is not available.';
  end if;

  new.raw_user_meta_data := coalesce(new.raw_user_meta_data, '{}'::jsonb)
    - 'registration_approval_token';
  return new;
end;
$function$;

create function private.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, private, public
as $function$
declare
  approval private.registration_approvals%rowtype;
begin
  select *
  into approval
  from private.registration_approvals
  where consumed_user_id = new.id
  order by consumed_at desc
  limit 1;

  if approval.approval_id is null then
    raise exception using
      errcode = '42501',
      message = 'Registration is not available.';
  end if;

  insert into public.profiles (
    user_id,
    adult_policy_version,
    adult_eligibility_attested_at
  )
  values (
    new.id,
    approval.adult_policy_version,
    approval.adult_attested_at
  );

  insert into public.account_roles (user_id, role)
  values (new.id, 'learner');

  insert into public.consent_records (
    user_id,
    policy_key,
    policy_version,
    policy_document_digest,
    decision,
    source,
    idempotency_key
  )
  values (
    new.id,
    'adult-beta-eligibility',
    approval.adult_policy_version,
    approval.policy_document_digest,
    'accepted',
    'registration_service',
    approval.approval_id
  );

  return new;
end;
$function$;

create function private.touch_profile_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $function$
begin
  if current_user in ('anon', 'authenticated') and (
    new.user_id <> old.user_id
    or new.adult_policy_version <> old.adult_policy_version
    or new.adult_eligibility_attested_at <> old.adult_eligibility_attested_at
    or new.account_state <> old.account_state
    or new.role_epoch <> old.role_epoch
    or new.revoked_at is distinct from old.revoked_at
  ) then
    raise exception using
      errcode = '42501',
      message = 'Profile security fields are managed by the server.';
  end if;

  if new.timezone is distinct from old.timezone
    and not exists (
      select 1
      from pg_catalog.pg_timezone_names
      where name = new.timezone
    ) then
    raise exception using
      errcode = '22023',
      message = 'timezone must be a valid IANA timezone identifier.';
  end if;

  new.updated_at := pg_catalog.clock_timestamp();
  return new;
end;
$function$;

create function private.bump_profile_role_epoch()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  affected_user_id uuid := coalesce(new.user_id, old.user_id);
begin
  update public.profiles
  set role_epoch = role_epoch + 1
  where user_id = affected_user_id;
  return coalesce(new, old);
end;
$function$;

create function private.prevent_consent_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $function$
begin
  raise exception using
    errcode = '42501',
    message = 'Consent records are append-only.';
end;
$function$;

create function private.consume_data_subject_request_worker_operation(
  p_request_id uuid,
  p_operation text,
  p_worker_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, private
as $function$
declare
  consumed boolean := false;
begin
  delete from private.data_subject_request_worker_operations
  where request_id = p_request_id
    and operation = p_operation
    and worker_id = p_worker_id
    and transaction_id = pg_catalog.txid_current()
  returning true into consumed;

  return coalesce(consumed, false);
end;
$function$;

create function private.enforce_data_subject_request_transition()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, private, public
as $function$
declare
  current_account_state text;
  current_role_epoch bigint;
  current_revoked_at timestamptz;
  claim_operation_consumed boolean := false;
  completion_operation_consumed boolean := false;
  failure_operation_consumed boolean := false;
  reclaim_operation_consumed boolean := false;
  transition_now timestamptz := pg_catalog.clock_timestamp();
begin
  if tg_op = 'INSERT' then
    new.requested_at := transition_now;

    if new.status <> 'requested'
      or new.frozen_at is not null
      or new.freeze_role_epoch is not null
      or new.worker_claimed_at is not null
      or new.worker_claimed_by is not null
      or new.lease_expires_at is not null
      or new.completed_at is not null
      or new.completion_receipt is not null
      or new.failure_code is not null then
      raise exception using
        errcode = '23514',
        message = 'A new data subject request must begin in the requested state.';
    end if;

    if new.reauthenticated_at < transition_now - interval '15 minutes'
      or new.reauthenticated_at > transition_now then
      raise exception using
        errcode = '42501',
        message = 'Data subject requests require recent server-verified reauthentication.';
    end if;

    select account_state, role_epoch
    into current_account_state, current_role_epoch
    from public.profiles
    where user_id = new.user_id;

    if current_account_state is distinct from 'active' then
      raise exception using
        errcode = '42501',
        message = 'Only active accounts can create data subject requests.';
    end if;

    if new.subject_role_epoch <> current_role_epoch then
      raise exception using
        errcode = '42501',
        message = 'Data subject request authorization is stale.';
    end if;

    return new;
  end if;

  if new.user_id <> old.user_id
    or new.request_kind <> old.request_kind
    or new.idempotency_key <> old.idempotency_key
    or new.subject_role_epoch <> old.subject_role_epoch
    or new.requesting_session_id is distinct from old.requesting_session_id
    or new.reauthenticated_at is distinct from old.reauthenticated_at
    or new.requested_at <> old.requested_at then
    raise exception using
      errcode = '42501',
      message = 'Data subject request identity fields are immutable.';
  end if;

  if new.status <> old.status and not (
    (old.status = 'requested' and new.status in ('frozen', 'failed', 'cancelled'))
    or (old.status = 'frozen' and new.status in ('processing', 'failed', 'cancelled'))
    or (old.status = 'processing' and new.status in ('completed', 'failed'))
  ) then
    raise exception using
      errcode = '23514',
      message = 'Invalid data subject request state transition.';
  end if;

  if old.status = 'frozen'
    and old.request_kind = 'deletion'
    and new.status = 'cancelled' then
    raise exception using
      errcode = '23514',
      message = 'A frozen deletion request cannot be cancelled.';
  end if;

  if new.status = old.status then
    if new is not distinct from old then
      return new;
    end if;

    if old.status = 'processing'
      and private.consume_data_subject_request_worker_operation(
        new.request_id,
        'reclaim',
        new.worker_claimed_by
      ) then
      reclaim_operation_consumed := true;
      new.transition_version := old.transition_version + 1;
    else
      raise exception using
        errcode = '42501',
        message = 'Data subject request writes must be state transitions.';
    end if;
  end if;

  if new.status <> old.status then
    new.transition_version := old.transition_version + 1;
  end if;

  if old.status = 'frozen' and new.status = 'processing' then
    claim_operation_consumed := private.consume_data_subject_request_worker_operation(
      new.request_id,
      'claim',
      new.worker_claimed_by
    );

    if not claim_operation_consumed then
      raise exception using
        errcode = '42501',
        message = 'Data subject requests must be claimed through the worker claim function.';
    end if;
  end if;

  if old.status = 'processing' and new.status = 'completed' then
    completion_operation_consumed := private.consume_data_subject_request_worker_operation(
      new.request_id,
      'complete',
      new.worker_claimed_by
    );

    if not completion_operation_consumed then
      raise exception using
        errcode = '42501',
        message = 'Data subject requests must be finalized through a worker function.';
    end if;
  end if;

  if old.status = 'processing' and new.status = 'failed' then
    failure_operation_consumed := private.consume_data_subject_request_worker_operation(
      new.request_id,
      'fail',
      new.worker_claimed_by
    );

    if not failure_operation_consumed then
      raise exception using
        errcode = '42501',
        message = 'Data subject requests must be finalized through a worker function.';
    end if;
  end if;

  if old.status = 'requested' and new.status = 'frozen' then
    if new.frozen_at is null then
      raise exception using
        errcode = '23514',
        message = 'Frozen data subject requests require a freeze timestamp.';
    end if;

    if new.request_kind = 'deletion' then
      update public.profiles
      set
        account_state = 'pending_deletion',
        revoked_at = transition_now,
        role_epoch = role_epoch + 1
      where user_id = new.user_id
        and account_state = 'active'
        and role_epoch = new.subject_role_epoch
      returning role_epoch into new.freeze_role_epoch;
    else
      select role_epoch
      into new.freeze_role_epoch
      from public.profiles
      where user_id = new.user_id
        and account_state = 'active'
        and revoked_at is null
        and role_epoch = new.subject_role_epoch;
    end if;

    if new.freeze_role_epoch is null then
      raise exception using
        errcode = '42501',
        message = 'Data subject request authorization changed before freeze.';
    end if;
  end if;

  if old.frozen_at is not null and new.frozen_at is distinct from old.frozen_at then
    raise exception using
      errcode = '42501',
      message = 'Data subject request freeze timestamp is immutable.';
  end if;

  if old.freeze_role_epoch is not null
    and new.freeze_role_epoch is distinct from old.freeze_role_epoch then
    raise exception using
      errcode = '42501',
      message = 'Data subject request freeze authorization is immutable.';
  end if;

  if new.status in ('frozen', 'processing', 'completed')
    and (new.frozen_at is null or new.freeze_role_epoch is null) then
    raise exception using
      errcode = '23514',
      message = 'Frozen data subject requests require freeze evidence.';
  end if;

  if old.worker_claimed_at is not null
    and new.worker_claimed_at is distinct from old.worker_claimed_at
    and not reclaim_operation_consumed then
    raise exception using
      errcode = '42501',
      message = 'Data subject request worker claim is immutable.';
  end if;

  if old.worker_claimed_by is not null
    and new.worker_claimed_by is distinct from old.worker_claimed_by
    and not reclaim_operation_consumed then
    raise exception using
      errcode = '42501',
      message = 'Data subject request worker identity is immutable.';
  end if;

  if old.lease_expires_at is not null
    and new.lease_expires_at is distinct from old.lease_expires_at
    and not (
      old.status = 'processing'
      and new.status in ('completed', 'failed')
      and new.lease_expires_at is null
    )
    and not reclaim_operation_consumed then
    raise exception using
      errcode = '42501',
      message = 'Data subject request lease is immutable after claim.';
  end if;

  if new.status = 'processing' then
    if not claim_operation_consumed and not reclaim_operation_consumed then
      raise exception using
        errcode = '42501',
        message = 'Data subject requests must be claimed through the worker claim function.';
    end if;

    if new.worker_claimed_at is null
      or new.worker_claimed_by is null
      or new.lease_expires_at is null then
      raise exception using
        errcode = '23514',
        message = 'Processing data subject requests require a worker claim and lease.';
    end if;

    if new.lease_expires_at <= new.worker_claimed_at then
      raise exception using
        errcode = '23514',
        message = 'Data subject request lease must outlive its worker claim.';
    end if;
  end if;

  if new.status = 'completed' and new.completed_at is null then
    raise exception using
      errcode = '23514',
      message = 'Completed data subject requests require a completion timestamp.';
  end if;

  if new.status = 'completed' and new.completion_receipt is null then
    raise exception using
      errcode = '23514',
      message = 'Completed data subject requests require a completion receipt.';
  end if;

  return new;
end;
$function$;

create function private.claim_data_subject_request(
  p_request_id uuid,
  p_expected_transition_version bigint,
  p_worker_id uuid,
  p_lease_seconds integer
)
returns public.data_subject_requests
language plpgsql
security definer
set search_path = pg_catalog, private, public
as $function$
declare
  request_record public.data_subject_requests%rowtype;
  claimed_record public.data_subject_requests%rowtype;
  current_account_state text;
  current_role_epoch bigint;
  current_revoked_at timestamptz;
  claim_now timestamptz := pg_catalog.clock_timestamp();
begin
  if p_request_id is null
    or p_worker_id is null
    or p_expected_transition_version < 1
    or p_lease_seconds not between 60 and 900 then
    raise exception using
      errcode = '22023',
      message = 'Worker claim input is invalid.';
  end if;

  select *
  into request_record
  from public.data_subject_requests
  where request_id = p_request_id
  for update;

  if request_record.request_id is null
    or request_record.status <> 'frozen'
    or request_record.transition_version <> p_expected_transition_version then
    raise exception using
      errcode = 'P0001',
      message = 'Data subject request is not available for claim.';
  end if;

  select account_state, role_epoch, revoked_at
  into current_account_state, current_role_epoch, current_revoked_at
  from public.profiles
  where user_id = request_record.user_id;

  if request_record.request_kind = 'deletion' then
    if current_account_state is distinct from 'pending_deletion'
      or current_revoked_at is null
      or current_role_epoch is distinct from request_record.freeze_role_epoch then
      raise exception using
        errcode = '42501',
        message = 'Data subject request authorization changed before claim.';
    end if;
  elsif current_account_state is distinct from 'active'
    or current_revoked_at is not null
    or current_role_epoch is distinct from request_record.freeze_role_epoch then
    raise exception using
      errcode = '42501',
      message = 'Data subject request authorization changed before claim.';
  end if;

  insert into private.data_subject_request_worker_operations (
    request_id,
    operation,
    worker_id,
    transaction_id
  )
  values (
    request_record.request_id,
    'claim',
    p_worker_id,
    pg_catalog.txid_current()
  );

  update public.data_subject_requests
  set
    status = 'processing',
    worker_claimed_at = claim_now,
    worker_claimed_by = p_worker_id,
    lease_expires_at = claim_now + make_interval(secs => p_lease_seconds)
  where request_id = request_record.request_id
  returning * into claimed_record;

  return claimed_record;
end;
$function$;

create function private.complete_data_subject_request(
  p_request_id uuid,
  p_expected_transition_version bigint,
  p_worker_id uuid,
  p_completion_receipt text
)
returns public.data_subject_requests
language plpgsql
security definer
set search_path = pg_catalog, private, public
as $function$
declare
  request_record public.data_subject_requests%rowtype;
  completed_record public.data_subject_requests%rowtype;
  current_account_state text;
  current_role_epoch bigint;
  current_revoked_at timestamptz;
  completion_now timestamptz := pg_catalog.clock_timestamp();
begin
  if p_request_id is null
    or p_worker_id is null
    or p_expected_transition_version < 1
    or p_completion_receipt is null
    or pg_catalog.char_length(pg_catalog.btrim(p_completion_receipt)) not between 1 and 280 then
    raise exception using
      errcode = '22023',
      message = 'Data subject request completion input is invalid.';
  end if;

  select *
  into request_record
  from public.data_subject_requests
  where request_id = p_request_id
  for update;

  if request_record.request_id is null
    or request_record.status <> 'processing'
    or request_record.transition_version <> p_expected_transition_version
    or request_record.worker_claimed_by is distinct from p_worker_id
    or request_record.lease_expires_at <= completion_now then
    raise exception using
      errcode = 'P0001',
      message = 'Data subject request is not available for completion.';
  end if;

  select account_state, role_epoch, revoked_at
  into current_account_state, current_role_epoch, current_revoked_at
  from public.profiles
  where user_id = request_record.user_id;

  if request_record.request_kind = 'deletion' then
    if current_account_state is distinct from 'pending_deletion'
      or current_revoked_at is null
      or current_role_epoch is distinct from request_record.freeze_role_epoch then
      raise exception using
        errcode = '42501',
        message = 'Data subject request authorization changed before completion.';
    end if;
  elsif current_account_state is distinct from 'active'
    or current_revoked_at is not null
    or current_role_epoch is distinct from request_record.freeze_role_epoch then
    raise exception using
      errcode = '42501',
      message = 'Data subject request authorization changed before completion.';
  end if;

  insert into private.data_subject_request_worker_operations (
    request_id,
    operation,
    worker_id,
    transaction_id
  )
  values (
    request_record.request_id,
    'complete',
    p_worker_id,
    pg_catalog.txid_current()
  );

  update public.data_subject_requests
  set
    status = 'completed',
    completed_at = completion_now,
    completion_receipt = pg_catalog.btrim(p_completion_receipt),
    lease_expires_at = null
  where request_id = request_record.request_id
  returning * into completed_record;

  return completed_record;
end;
$function$;

create function private.reclaim_expired_data_subject_request(
  p_request_id uuid,
  p_expected_transition_version bigint,
  p_worker_id uuid,
  p_lease_seconds integer
)
returns public.data_subject_requests
language plpgsql
security definer
set search_path = pg_catalog, private, public
as $function$
declare
  request_record public.data_subject_requests%rowtype;
  reclaimed_record public.data_subject_requests%rowtype;
  current_account_state text;
  current_role_epoch bigint;
  current_revoked_at timestamptz;
  reclaim_now timestamptz := pg_catalog.clock_timestamp();
begin
  if p_request_id is null
    or p_worker_id is null
    or p_expected_transition_version < 1
    or p_lease_seconds not between 60 and 900 then
    raise exception using
      errcode = '22023',
      message = 'Worker reclaim input is invalid.';
  end if;

  select *
  into request_record
  from public.data_subject_requests
  where request_id = p_request_id
  for update;

  if request_record.request_id is null
    or request_record.status <> 'processing'
    or request_record.transition_version <> p_expected_transition_version
    or request_record.lease_expires_at is null
    or request_record.lease_expires_at > reclaim_now then
    raise exception using
      errcode = 'P0001',
      message = 'Data subject request is not available for reclaim.';
  end if;

  select account_state, role_epoch, revoked_at
  into current_account_state, current_role_epoch, current_revoked_at
  from public.profiles
  where user_id = request_record.user_id;

  if request_record.request_kind = 'deletion' then
    if current_account_state is distinct from 'pending_deletion'
      or current_revoked_at is null
      or current_role_epoch is distinct from request_record.freeze_role_epoch then
      raise exception using
        errcode = '42501',
        message = 'Data subject request authorization changed before reclaim.';
    end if;
  elsif current_account_state is distinct from 'active'
    or current_revoked_at is not null
    or current_role_epoch is distinct from request_record.freeze_role_epoch then
    raise exception using
      errcode = '42501',
      message = 'Data subject request authorization changed before reclaim.';
  end if;

  insert into private.data_subject_request_worker_operations (
    request_id,
    operation,
    worker_id,
    transaction_id
  )
  values (
    request_record.request_id,
    'reclaim',
    p_worker_id,
    pg_catalog.txid_current()
  );

  update public.data_subject_requests
  set
    worker_claimed_at = reclaim_now,
    worker_claimed_by = p_worker_id,
    lease_expires_at = reclaim_now + make_interval(secs => p_lease_seconds)
  where request_id = request_record.request_id
  returning * into reclaimed_record;

  return reclaimed_record;
end;
$function$;

create function private.fail_data_subject_request(
  p_request_id uuid,
  p_expected_transition_version bigint,
  p_worker_id uuid,
  p_failure_code text
)
returns public.data_subject_requests
language plpgsql
security definer
set search_path = pg_catalog, private, public
as $function$
declare
  request_record public.data_subject_requests%rowtype;
  failed_record public.data_subject_requests%rowtype;
begin
  if p_request_id is null
    or p_worker_id is null
    or p_expected_transition_version < 1
    or p_failure_code is null
    or pg_catalog.char_length(pg_catalog.btrim(p_failure_code)) not between 1 and 120 then
    raise exception using
      errcode = '22023',
      message = 'Data subject request failure input is invalid.';
  end if;

  select *
  into request_record
  from public.data_subject_requests
  where request_id = p_request_id
  for update;

  if request_record.request_id is null
    or request_record.status <> 'processing'
    or request_record.transition_version <> p_expected_transition_version
    or request_record.worker_claimed_by is distinct from p_worker_id then
    raise exception using
      errcode = 'P0001',
      message = 'Data subject request is not available for failure handling.';
  end if;

  insert into private.data_subject_request_worker_operations (
    request_id,
    operation,
    worker_id,
    transaction_id
  )
  values (
    request_record.request_id,
    'fail',
    p_worker_id,
    pg_catalog.txid_current()
  );

  update public.data_subject_requests
  set
    status = 'failed',
    failure_code = pg_catalog.btrim(p_failure_code),
    lease_expires_at = null
  where request_id = request_record.request_id
  returning * into failed_record;

  return failed_record;
end;
$function$;

create function private.prevent_security_event_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $function$
begin
  raise exception using
    errcode = '42501',
    message = 'Security events are immutable.';
end;
$function$;

create trigger validate_registration_approval_before_auth_user_insert
before insert on auth.users
for each row execute function private.validate_registration_approval();

create trigger create_profile_after_auth_user_insert
after insert on auth.users
for each row execute function private.handle_auth_user_created();

create trigger touch_profile_before_update
before update on public.profiles
for each row execute function private.touch_profile_updated_at();

create trigger bump_profile_role_epoch_after_account_role_change
after insert or update or delete on public.account_roles
for each row execute function private.bump_profile_role_epoch();

create trigger prevent_consent_update
before update on public.consent_records
for each row execute function private.prevent_consent_mutation();

create trigger prevent_consent_delete
before delete on public.consent_records
for each row execute function private.prevent_consent_mutation();

create trigger enforce_data_subject_request_transition_before_write
before insert or update on public.data_subject_requests
for each row execute function private.enforce_data_subject_request_transition();

create trigger prevent_security_event_update
before update on private.security_events
for each row execute function private.prevent_security_event_mutation();

create trigger prevent_security_event_delete
before delete on private.security_events
for each row execute function private.prevent_security_event_mutation();

grant usage on schema private, public, extensions to app_security_definer;
grant select, insert, update on table private.registration_approvals to app_security_definer;
grant select, insert, delete on table private.data_subject_request_worker_operations to app_security_definer;
grant select, insert, update on table public.profiles to app_security_definer;
grant select, insert on table public.account_roles to app_security_definer;
grant insert on table public.consent_records to app_security_definer;
grant select, update on table public.data_subject_requests to app_security_definer;
grant execute on function private.hash_email(text) to app_security_definer;
grant execute on function private.hash_secret(text) to app_security_definer;

grant create on schema private to app_security_definer;
grant app_security_definer to postgres;
alter function private.validate_registration_approval() owner to app_security_definer;
alter function private.handle_auth_user_created() owner to app_security_definer;
alter function private.bump_profile_role_epoch() owner to app_security_definer;
alter function private.record_registration_approval(text, text, text, text, timestamptz, timestamptz, uuid)
  owner to app_security_definer;
alter function private.enforce_data_subject_request_transition() owner to app_security_definer;
alter function private.consume_data_subject_request_worker_operation(uuid, text, uuid)
  owner to app_security_definer;
alter function private.claim_data_subject_request(uuid, bigint, uuid, integer)
  owner to app_security_definer;
alter function private.complete_data_subject_request(uuid, bigint, uuid, text)
  owner to app_security_definer;
alter function private.reclaim_expired_data_subject_request(uuid, bigint, uuid, integer)
  owner to app_security_definer;
alter function private.fail_data_subject_request(uuid, bigint, uuid, text)
  owner to app_security_definer;
revoke create on schema private from app_security_definer;

revoke all on table private.registration_approvals from public, anon, authenticated;
revoke all on table private.data_subject_request_worker_operations from public, anon, authenticated;
revoke all on table private.security_events from public, anon, authenticated;
revoke all on function private.hash_email(text) from public, anon, authenticated;
revoke all on function private.hash_secret(text) from public, anon, authenticated;
revoke all on function private.record_registration_approval(text, text, text, text, timestamptz, timestamptz, uuid)
  from public, anon, authenticated;
revoke all on function private.validate_registration_approval() from public, anon, authenticated;
revoke all on function private.handle_auth_user_created() from public, anon, authenticated;
revoke all on function private.touch_profile_updated_at() from public, anon, authenticated;
revoke all on function private.bump_profile_role_epoch() from public, anon, authenticated;
revoke all on function private.prevent_consent_mutation() from public, anon, authenticated;
revoke all on function private.enforce_data_subject_request_transition() from public, anon, authenticated;
revoke all on function private.consume_data_subject_request_worker_operation(uuid, text, uuid)
  from public, anon, authenticated;
revoke all on function private.claim_data_subject_request(uuid, bigint, uuid, integer)
  from public, anon, authenticated;
revoke all on function private.complete_data_subject_request(uuid, bigint, uuid, text)
  from public, anon, authenticated;
revoke all on function private.reclaim_expired_data_subject_request(uuid, bigint, uuid, integer)
  from public, anon, authenticated;
revoke all on function private.fail_data_subject_request(uuid, bigint, uuid, text)
  from public, anon, authenticated;
revoke all on function private.prevent_security_event_mutation() from public, anon, authenticated;
