begin;

grant usage, create on schema private to app_security_definer;

-- The original turn functions remain available only to their security-definer
-- owner. The executor-facing wrappers below add an attempt lease and a replay
-- read before policy/provider configuration is required.
alter table private.ai_tutor_turns
  add column lease_token uuid;

update private.ai_tutor_turns
set lease_token = extensions.gen_random_uuid()
where lease_token is null;

alter table private.ai_tutor_turns
  alter column lease_token set default extensions.gen_random_uuid(),
  alter column lease_token set not null;

create function private.rotate_ai_tutor_turn_lease()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, private
as $function$
declare
  transition_result record;
  current_lease_token uuid;
begin
  if tg_op = 'UPDATE' and new.attempt_count > old.attempt_count then
    new.lease_token := extensions.gen_random_uuid();
  end if;
  return new;
end;
$function$;

alter function private.rotate_ai_tutor_turn_lease() owner to app_security_definer;

create trigger rotate_ai_tutor_turn_lease_before_retry
before update on private.ai_tutor_turns
for each row execute function private.rotate_ai_tutor_turn_lease();

-- Account deletion freezes the learner before the purge worker runs. Acquiring
-- the same namespace as AI reservations makes the lifecycle transition wait for
-- an in-flight reservation transaction instead of interleaving with it.
create function private.lock_ai_tutor_lifecycle_before_deletion_freeze()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, private
as $function$
begin
  if old.status = 'requested'
    and new.status = 'frozen'
    and new.request_kind = 'deletion' then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(new.user_id::text, 7210)
    );
  end if;
  return new;
end;
$function$;

alter function private.lock_ai_tutor_lifecycle_before_deletion_freeze()
  owner to app_security_definer;

create trigger ai_tutor_lifecycle_lock_before_deletion_freeze
before update on public.data_subject_requests
for each row execute function private.lock_ai_tutor_lifecycle_before_deletion_freeze();

-- The previous executor-facing signatures did not protect a reclaimed attempt.
-- Revoke them before exposing the guarded wrappers.
revoke all on function private.begin_ai_tutor_turn(
  uuid, uuid, uuid, text, jsonb, text, text, text, text, text, text, timestamptz
) from app_learning_api_executor;
revoke all on function private.complete_ai_tutor_turn(
  uuid, uuid, uuid, text, jsonb, bigint, bigint, bigint, bigint, text, text, timestamptz
) from app_learning_api_executor;
revoke all on function private.fail_ai_tutor_turn(
  uuid, uuid, uuid, text, text, timestamptz
) from app_learning_api_executor;

create function private.read_ai_tutor_turn_replay(
  p_user_id uuid,
  p_conversation_id uuid,
  p_turn_id uuid,
  p_payload_hash text
)
returns table (
  conversation_id uuid,
  turn_id uuid,
  state text,
  idempotent_replay boolean,
  response_payload jsonb,
  prompt_tokens bigint,
  completion_tokens bigint,
  total_tokens bigint,
  estimated_cost_microusd bigint,
  lease_token uuid
)
language plpgsql
security definer
set search_path = pg_catalog, private, public
as $function$
begin
  if p_user_id is null
    or p_conversation_id is null
    or p_turn_id is null
    or p_payload_hash is null
    or p_payload_hash !~* '^[0-9a-f]{64}$' then
    raise exception using
      errcode = '22023',
      message = 'Tutor replay input is invalid.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 7210)
  );
  perform private.require_active_learning_account(p_user_id);

  return query
  select
    tutor_turn.conversation_id,
    tutor_turn.turn_id,
    tutor_turn.state,
    true,
    tutor_turn.response_payload,
    tutor_turn.prompt_tokens,
    tutor_turn.completion_tokens,
    tutor_turn.total_tokens,
    tutor_turn.estimated_cost_microusd,
    tutor_turn.lease_token
  from private.ai_tutor_turns as tutor_turn
  where tutor_turn.user_id = p_user_id
    and tutor_turn.conversation_id = p_conversation_id
    and tutor_turn.turn_id = p_turn_id
    and tutor_turn.payload_hash = lower(p_payload_hash)
    and tutor_turn.state = 'completed'
  for update;
end;
$function$;

create function private.begin_ai_tutor_turn_v2(
  p_user_id uuid,
  p_conversation_id uuid,
  p_turn_id uuid,
  p_payload_hash text,
  p_request_payload jsonb,
  p_canonical_request_payload text,
  p_language_code text,
  p_target_level_code text,
  p_objective_key text,
  p_explanation_depth text,
  p_tone text,
  p_consent_policy_key text
)
returns table (
  conversation_id uuid,
  turn_id uuid,
  state text,
  idempotent_replay boolean,
  response_payload jsonb,
  prompt_tokens bigint,
  completion_tokens bigint,
  total_tokens bigint,
  estimated_cost_microusd bigint,
  lease_token uuid
)
language plpgsql
security definer
set search_path = pg_catalog, private, public
as $function$
declare
  transition_result record;
  current_lease_token uuid;
begin
  if p_canonical_request_payload is null
    or pg_catalog.char_length(p_canonical_request_payload) > 65536
    or p_canonical_request_payload::jsonb is distinct from p_request_payload
    or pg_catalog.encode(
      extensions.digest(
        pg_catalog.convert_to(p_canonical_request_payload, 'UTF8'),
        'sha256'
      ),
      'hex'
    ) <> pg_catalog.lower(p_payload_hash) then
    raise exception using
      errcode = '22023',
      message = 'Tutor request input is invalid.';
  end if;

  select *
  into transition_result
  from private.begin_ai_tutor_turn(
    p_user_id,
    p_conversation_id,
    p_turn_id,
    p_payload_hash,
    p_request_payload,
    p_language_code,
    p_target_level_code,
    p_objective_key,
    p_explanation_depth,
    p_tone,
    p_consent_policy_key
  );

  select tutor_turn.lease_token
  into current_lease_token
  from private.ai_tutor_turns as tutor_turn
  where tutor_turn.user_id = p_user_id
    and tutor_turn.conversation_id = transition_result.conversation_id
    and tutor_turn.turn_id = transition_result.turn_id;

  return query
  select
    transition_result.conversation_id,
    transition_result.turn_id,
    transition_result.state,
    transition_result.idempotent_replay,
    transition_result.response_payload,
    transition_result.prompt_tokens,
    transition_result.completion_tokens,
    transition_result.total_tokens,
    transition_result.estimated_cost_microusd,
    current_lease_token;
end;
$function$;

create function private.complete_ai_tutor_turn_v2(
  p_user_id uuid,
  p_conversation_id uuid,
  p_turn_id uuid,
  p_lease_token uuid,
  p_payload_hash text,
  p_response_payload jsonb,
  p_prompt_tokens bigint,
  p_completion_tokens bigint,
  p_total_tokens bigint,
  p_estimated_cost_microusd bigint,
  p_provider_model text,
  p_configuration_version text
)
returns table (
  conversation_id uuid,
  turn_id uuid,
  state text,
  idempotent_replay boolean,
  response_payload jsonb,
  prompt_tokens bigint,
  completion_tokens bigint,
  total_tokens bigint,
  estimated_cost_microusd bigint,
  lease_token uuid
)
language plpgsql
security definer
set search_path = pg_catalog, private, public
as $function$
declare
  turn_record private.ai_tutor_turns%rowtype;
  transition_result record;
  current_lease_token uuid;
begin
  if p_lease_token is null then
    raise exception using
      errcode = '22023',
      message = 'Tutor turn lease is required.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 7210)
  );

  select *
  into turn_record
  from private.ai_tutor_turns as tutor_turn
  where tutor_turn.turn_id = p_turn_id
  for update;

  if turn_record.turn_id is null
    or turn_record.user_id <> p_user_id
    or turn_record.conversation_id <> p_conversation_id
    or turn_record.payload_hash <> pg_catalog.lower(p_payload_hash) then
    raise exception using
      errcode = '42501',
      message = 'Tutor turn is not owned by this learner.';
  end if;

  if turn_record.state = 'completed' then
    return query
    select
      turn_record.conversation_id,
      turn_record.turn_id,
      turn_record.state,
      true,
      turn_record.response_payload,
      turn_record.prompt_tokens,
      turn_record.completion_tokens,
      turn_record.total_tokens,
      turn_record.estimated_cost_microusd,
      turn_record.lease_token;
    return;
  end if;

  if turn_record.state not in ('pending', 'streaming')
    or turn_record.lease_token <> p_lease_token
    or turn_record.lease_expires_at is null
    or turn_record.lease_expires_at <= pg_catalog.clock_timestamp() then
    raise exception using
      errcode = '22023',
      message = 'Tutor turn lease is stale.';
  end if;

  select *
  into transition_result
  from private.complete_ai_tutor_turn(
    p_user_id,
    p_conversation_id,
    p_turn_id,
    p_payload_hash,
    p_response_payload,
    p_prompt_tokens,
    p_completion_tokens,
    p_total_tokens,
    p_estimated_cost_microusd,
    p_provider_model,
    p_configuration_version
  );

  select tutor_turn.lease_token
  into current_lease_token
  from private.ai_tutor_turns as tutor_turn
  where tutor_turn.user_id = p_user_id
    and tutor_turn.conversation_id = transition_result.conversation_id
    and tutor_turn.turn_id = transition_result.turn_id;

  return query
  select
    transition_result.conversation_id,
    transition_result.turn_id,
    transition_result.state,
    transition_result.idempotent_replay,
    transition_result.response_payload,
    transition_result.prompt_tokens,
    transition_result.completion_tokens,
    transition_result.total_tokens,
    transition_result.estimated_cost_microusd,
    current_lease_token;
end;
$function$;

create function private.fail_ai_tutor_turn_v2(
  p_user_id uuid,
  p_conversation_id uuid,
  p_turn_id uuid,
  p_lease_token uuid,
  p_payload_hash text,
  p_error_code text
)
returns table (
  conversation_id uuid,
  turn_id uuid,
  state text,
  idempotent_replay boolean
)
language plpgsql
security definer
set search_path = pg_catalog, private, public
as $function$
declare
  turn_record private.ai_tutor_turns%rowtype;
begin
  if p_lease_token is null then
    raise exception using
      errcode = '22023',
      message = 'Tutor turn lease is required.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 7210)
  );

  select *
  into turn_record
  from private.ai_tutor_turns as tutor_turn
  where tutor_turn.turn_id = p_turn_id
  for update;

  if turn_record.turn_id is null
    or turn_record.user_id <> p_user_id
    or turn_record.conversation_id <> p_conversation_id
    or turn_record.payload_hash <> pg_catalog.lower(p_payload_hash) then
    raise exception using
      errcode = '42501',
      message = 'Tutor turn is not owned by this learner.';
  end if;

  if turn_record.state = 'completed' then
    return query select turn_record.conversation_id, turn_record.turn_id, turn_record.state, true;
    return;
  end if;

  if turn_record.state not in ('pending', 'streaming') then
    return query select turn_record.conversation_id, turn_record.turn_id, turn_record.state, false;
    return;
  end if;

  if turn_record.lease_token <> p_lease_token
    or turn_record.lease_expires_at is null
    or turn_record.lease_expires_at <= pg_catalog.clock_timestamp() then
    raise exception using
      errcode = '22023',
      message = 'Tutor turn lease is stale.';
  end if;

  return query
  select result.conversation_id, result.turn_id, result.state, result.idempotent_replay
  from private.fail_ai_tutor_turn(
    p_user_id,
    p_conversation_id,
    p_turn_id,
    p_payload_hash,
    p_error_code
  ) as result;
end;
$function$;

alter function private.read_ai_tutor_turn_replay(uuid, uuid, uuid, text)
  owner to app_security_definer;
alter function private.begin_ai_tutor_turn_v2(
  uuid, uuid, uuid, text, jsonb, text, text, text, text, text, text, text
) owner to app_security_definer;
alter function private.complete_ai_tutor_turn_v2(
  uuid, uuid, uuid, uuid, text, jsonb, bigint, bigint, bigint, bigint, text, text
) owner to app_security_definer;
alter function private.fail_ai_tutor_turn_v2(uuid, uuid, uuid, uuid, text, text)
  owner to app_security_definer;

grant execute on function private.read_ai_tutor_turn_replay(uuid, uuid, uuid, text)
  to app_learning_api_executor;
grant execute on function private.begin_ai_tutor_turn_v2(
  uuid, uuid, uuid, text, jsonb, text, text, text, text, text, text, text
) to app_learning_api_executor;
grant execute on function private.complete_ai_tutor_turn_v2(
  uuid, uuid, uuid, uuid, text, jsonb, bigint, bigint, bigint, bigint, text, text
) to app_learning_api_executor;
grant execute on function private.fail_ai_tutor_turn_v2(uuid, uuid, uuid, uuid, text, text)
  to app_learning_api_executor;

revoke all on function private.read_ai_tutor_turn_replay(uuid, uuid, uuid, text)
  from public, anon, authenticated, service_role;
revoke all on function private.begin_ai_tutor_turn_v2(
  uuid, uuid, uuid, text, jsonb, text, text, text, text, text, text, text
) from public, anon, authenticated, service_role;
revoke all on function private.complete_ai_tutor_turn_v2(
  uuid, uuid, uuid, uuid, text, jsonb, bigint, bigint, bigint, bigint, text, text
) from public, anon, authenticated, service_role;
revoke all on function private.fail_ai_tutor_turn_v2(uuid, uuid, uuid, uuid, text, text)
  from public, anon, authenticated, service_role;

revoke create on schema private from app_security_definer;

commit;
