begin;

-- The first live tutor boundary is deliberately private. Learners never receive
-- direct table grants; the web route can only call the three narrow transitions
-- through app_learning_api_executor.

grant create on schema private to app_security_definer;

-- Existing identity migration grants the security-definer role append-only
-- consent writes. Tutor reservation also needs to read the latest decision while
-- holding the learner authorization lock; no learner-facing grant is added.
grant select on table public.consent_records to app_security_definer;
create policy "internal security definer: read consent for AI tutor"
on public.consent_records
for select to app_security_definer
using (true);

create table private.ai_tutor_conversations (
  conversation_id uuid primary key,
  user_id uuid not null references public.profiles (user_id) on delete restrict,
  language_code text not null references public.language_packs (language_code) on delete restrict,
  target_level_code text not null,
  objective_key text not null references public.learning_objectives (objective_key) on delete restrict,
  explanation_depth text not null
    check (explanation_depth in ('concise', 'standard', 'detailed')),
  tone text not null check (tone in ('encouraging', 'direct')),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  archived_at timestamptz,
  unique (user_id, conversation_id),
  foreign key (language_code, target_level_code)
    references public.level_definitions (language_code, level_code) on delete restrict
);

create table private.ai_tutor_turns (
  turn_id uuid primary key,
  conversation_id uuid not null,
  user_id uuid not null,
  state text not null check (state in ('pending', 'streaming', 'completed', 'cancelled', 'failed')),
  payload_hash text not null check (payload_hash ~* '^[0-9a-f]{64}$'),
  request_payload jsonb not null
    check (jsonb_typeof(request_payload) = 'object' and pg_column_size(request_payload) <= 65536),
  response_payload jsonb
    check (response_payload is null or (jsonb_typeof(response_payload) = 'object' and pg_column_size(response_payload) <= 65536)),
  provider_model text not null check (provider_model ~ '^[-a-z0-9.]{3,120}$'),
  configuration_version text not null check (configuration_version ~ '^[-a-z0-9.:]{3,160}$'),
  prompt_tokens bigint check (prompt_tokens is null or prompt_tokens between 0 and 1000000),
  completion_tokens bigint check (completion_tokens is null or completion_tokens between 0 and 1000000),
  total_tokens bigint check (total_tokens is null or total_tokens between 0 and 1000000),
  estimated_cost_microusd bigint not null default 0 check (estimated_cost_microusd between 0 and 10000000),
  attempt_count integer not null default 1 check (attempt_count between 1 and 3),
  lease_expires_at timestamptz,
  started_at timestamptz not null default clock_timestamp(),
  completed_at timestamptz,
  updated_at timestamptz not null default clock_timestamp(),
  error_code text check (error_code is null or error_code ~ '^[-a-z0-9_.]{1,80}$'),
  unique (user_id, conversation_id, turn_id),
  foreign key (user_id, conversation_id)
    references private.ai_tutor_conversations (user_id, conversation_id) on delete cascade,
  check (
    total_tokens is null
    or (prompt_tokens is not null and completion_tokens is not null and total_tokens = prompt_tokens + completion_tokens)
  ),
  check (state <> 'completed' or (response_payload is not null and completed_at is not null and prompt_tokens is not null and completion_tokens is not null and total_tokens is not null)),
  check (state not in ('pending', 'streaming') or completed_at is null)
);

create table private.ai_tutor_rate_windows (
  user_id uuid not null references public.profiles (user_id) on delete restrict,
  window_start timestamptz not null,
  turn_count integer not null default 0 check (turn_count between 0 and 20),
  reserved_cost_microusd bigint not null default 0 check (reserved_cost_microusd between 0 and 5000000),
  actual_cost_microusd bigint not null default 0 check (actual_cost_microusd between 0 and 5000000),
  updated_at timestamptz not null default clock_timestamp(),
  primary key (user_id, window_start)
);

create index ai_tutor_conversations_user_updated_idx
  on private.ai_tutor_conversations (user_id, updated_at desc);
create index ai_tutor_turns_user_created_idx
  on private.ai_tutor_turns (user_id, started_at desc);
create index ai_tutor_turns_conversation_created_idx
  on private.ai_tutor_turns (conversation_id, started_at);
create index ai_tutor_turns_pending_lease_idx
  on private.ai_tutor_turns (state, lease_expires_at)
  where state in ('pending', 'streaming');
create index ai_tutor_rate_windows_updated_idx
  on private.ai_tutor_rate_windows (user_id, updated_at desc);

alter table private.ai_tutor_conversations enable row level security;
alter table private.ai_tutor_turns enable row level security;
alter table private.ai_tutor_rate_windows enable row level security;

revoke all on table private.ai_tutor_conversations
  from public, anon, authenticated, service_role;
revoke all on table private.ai_tutor_turns
  from public, anon, authenticated, service_role;
revoke all on table private.ai_tutor_rate_windows
  from public, anon, authenticated, service_role;

create policy "internal security definer: manage AI tutor conversations"
on private.ai_tutor_conversations
for all to app_security_definer
using (true)
with check (true);

create policy "internal security definer: manage AI tutor turns"
on private.ai_tutor_turns
for all to app_security_definer
using (true)
with check (true);

create policy "internal security definer: manage AI tutor rate windows"
on private.ai_tutor_rate_windows
for all to app_security_definer
using (true)
with check (true);

grant select, insert, update, delete on table private.ai_tutor_conversations to app_security_definer;
grant select, insert, update, delete on table private.ai_tutor_turns to app_security_definer;
grant select, insert, update, delete on table private.ai_tutor_rate_windows to app_security_definer;

create function private.begin_ai_tutor_turn(
  p_user_id uuid,
  p_conversation_id uuid,
  p_turn_id uuid,
  p_payload_hash text,
  p_request_payload jsonb,
  p_language_code text,
  p_target_level_code text,
  p_objective_key text,
  p_explanation_depth text,
  p_tone text,
  p_consent_policy_key text,
  p_now timestamptz default clock_timestamp()
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
  estimated_cost_microusd bigint
)
language plpgsql
security definer
set search_path = pg_catalog, private, public
as $function$
declare
  conversation_record private.ai_tutor_conversations%rowtype;
  existing_turn private.ai_tutor_turns%rowtype;
  latest_consent text;
  rate_record private.ai_tutor_rate_windows%rowtype;
  current_window timestamptz;
  stale_window timestamptz;
  reservation_microusd constant bigint := 500000;
  max_hourly_cost_microusd constant bigint := 5000000;
begin
  if p_user_id is null
    or p_conversation_id is null
    or p_turn_id is null
    or p_payload_hash is null
    or p_payload_hash !~* '^[0-9a-f]{64}$'
    or p_request_payload is null
    or jsonb_typeof(p_request_payload) <> 'object'
    or pg_column_size(p_request_payload) > 65536
    or p_language_code is null
    or p_language_code not in ('ja', 'zh', 'ko')
    or p_target_level_code is null
    or p_target_level_code !~ '^[A-Za-z0-9_]{1,32}$'
    or p_objective_key is null
    or p_objective_key not in ('exam', 'communication', 'work', 'travel')
    or p_explanation_depth is null
    or p_explanation_depth not in ('concise', 'standard', 'detailed')
    or p_tone is null
    or p_tone not in ('encouraging', 'direct')
    or p_consent_policy_key is null
    or p_consent_policy_key !~ '^[-a-z0-9.]{3,120}$'
    or p_now is null then
    raise exception using
      errcode = '22023',
      message = 'Tutor turn input is invalid.';
  end if;

  -- Serialize all AI work for one learner before touching profile, consent,
  -- conversation, or rate rows. The purge worker uses a different lock family
  -- and cannot interleave a half-purged AI turn with this reservation.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 7210)
  );
  perform private.require_active_learning_account(p_user_id);

  select decision
  into latest_consent
  from public.consent_records
  where user_id = p_user_id
    and policy_key = p_consent_policy_key
  order by recorded_at desc, consent_id desc
  limit 1;

  if latest_consent is distinct from 'accepted' then
    raise exception using
      errcode = '42501',
      message = 'AI tutor provider processing consent is required.';
  end if;

  perform 1
  from public.language_packs
  where language_code = p_language_code
    and availability_state = 'active';
  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Tutor language pack is not available.';
  end if;

  perform 1
  from public.level_definitions
  where language_code = p_language_code
    and level_code = p_target_level_code;
  if not found then
    raise exception using
      errcode = '22023',
      message = 'Tutor target level is not valid for the selected language.';
  end if;

  select *
  into conversation_record
  from private.ai_tutor_conversations as conversation
  where conversation.conversation_id = p_conversation_id;

  if conversation_record.conversation_id is not null
    and conversation_record.user_id <> p_user_id then
    raise exception using
      errcode = '42501',
      message = 'Tutor conversation is not owned by this learner.';
  end if;

  if conversation_record.conversation_id is null then
    insert into private.ai_tutor_conversations (
      conversation_id,
      user_id,
      language_code,
      target_level_code,
      objective_key,
      explanation_depth,
      tone
    )
    values (
      p_conversation_id,
      p_user_id,
      p_language_code,
      p_target_level_code,
      p_objective_key,
      p_explanation_depth,
      p_tone
    )
    returning * into conversation_record;
  elsif conversation_record.language_code <> p_language_code
    or conversation_record.target_level_code <> p_target_level_code
    or conversation_record.objective_key <> p_objective_key
    or conversation_record.explanation_depth <> p_explanation_depth
    or conversation_record.tone <> p_tone then
    raise exception using
      errcode = '22023',
      message = 'Tutor conversation settings cannot change after creation.';
  end if;

  select *
  into existing_turn
  from private.ai_tutor_turns as tutor_turn
  where tutor_turn.turn_id = p_turn_id
  for update;

  if existing_turn.turn_id is not null then
    if existing_turn.user_id <> p_user_id
      or existing_turn.conversation_id <> p_conversation_id
      or existing_turn.payload_hash <> lower(p_payload_hash) then
      raise exception using
        errcode = '22023',
        message = 'Tutor turn identity was reused with a different payload.';
    end if;

    if existing_turn.state = 'completed' then
      return query
      select
        existing_turn.conversation_id,
        existing_turn.turn_id,
        existing_turn.state,
        true,
        existing_turn.response_payload,
        existing_turn.prompt_tokens,
        existing_turn.completion_tokens,
        existing_turn.total_tokens,
        existing_turn.estimated_cost_microusd;
      return;
    end if;

    if existing_turn.state in ('pending', 'streaming')
      and existing_turn.lease_expires_at is not null
      and existing_turn.lease_expires_at > p_now then
      raise exception using
        errcode = 'P0001',
        message = 'Tutor turn is already in progress.';
    end if;

    if existing_turn.attempt_count >= 3 then
      raise exception using
        errcode = 'P0001',
        message = 'Tutor turn retry limit has been reached.';
    end if;

    if existing_turn.state in ('pending', 'streaming') then
      stale_window := date_trunc('hour', existing_turn.started_at);
      update private.ai_tutor_rate_windows
      set
        reserved_cost_microusd = greatest(0, reserved_cost_microusd - reservation_microusd),
        updated_at = p_now
      where user_id = p_user_id
        and window_start = stale_window;
    end if;
  end if;

  current_window := date_trunc('hour', p_now);
  insert into private.ai_tutor_rate_windows (user_id, window_start)
  values (p_user_id, current_window)
  on conflict (user_id, window_start) do nothing;

  select *
  into rate_record
  from private.ai_tutor_rate_windows
  where user_id = p_user_id
    and window_start = current_window
  for update;

  if rate_record.turn_count >= 20
    or rate_record.actual_cost_microusd + rate_record.reserved_cost_microusd + reservation_microusd > max_hourly_cost_microusd then
    raise exception using
      errcode = 'P0001',
      message = 'Tutor hourly quota has been reached.';
  end if;

  update private.ai_tutor_rate_windows
  set
    reserved_cost_microusd = reserved_cost_microusd + reservation_microusd,
    turn_count = turn_count + 1,
    updated_at = p_now
  where user_id = p_user_id
    and window_start = current_window;

  if existing_turn.turn_id is null then
    insert into private.ai_tutor_turns (
      turn_id,
      conversation_id,
      user_id,
      state,
      payload_hash,
      request_payload,
      provider_model,
      configuration_version,
      attempt_count,
      lease_expires_at,
      started_at,
      updated_at
    )
    values (
      p_turn_id,
      p_conversation_id,
      p_user_id,
      'pending',
      lower(p_payload_hash),
      p_request_payload,
      'deepseek-v4-flash',
      'deepseek-v4-flash:pending',
      1,
      p_now + interval '60 seconds',
      p_now,
      p_now
    );
  else
    update private.ai_tutor_turns as tutor_turn
    set
      state = 'pending',
      response_payload = null,
      prompt_tokens = null,
      completion_tokens = null,
      total_tokens = null,
      estimated_cost_microusd = 0,
      error_code = null,
      attempt_count = attempt_count + 1,
      lease_expires_at = p_now + interval '60 seconds',
      started_at = p_now,
      completed_at = null,
      updated_at = p_now
    where tutor_turn.turn_id = p_turn_id;
  end if;

  return query
  select
    p_conversation_id,
    p_turn_id,
    'pending'::text,
    false,
    null::jsonb,
    null::bigint,
    null::bigint,
    null::bigint,
    0::bigint;
end;
$function$;

create function private.complete_ai_tutor_turn(
  p_user_id uuid,
  p_conversation_id uuid,
  p_turn_id uuid,
  p_payload_hash text,
  p_response_payload jsonb,
  p_prompt_tokens bigint,
  p_completion_tokens bigint,
  p_total_tokens bigint,
  p_estimated_cost_microusd bigint,
  p_provider_model text,
  p_configuration_version text,
  p_now timestamptz default clock_timestamp()
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
  estimated_cost_microusd bigint
)
language plpgsql
security definer
set search_path = pg_catalog, private, public
as $function$
declare
  turn_record private.ai_tutor_turns%rowtype;
  current_window timestamptz;
  reservation_microusd constant bigint := 500000;
begin
  if p_user_id is null
    or p_conversation_id is null
    or p_turn_id is null
    or p_payload_hash is null
    or p_payload_hash !~* '^[0-9a-f]{64}$'
    or p_response_payload is null
    or jsonb_typeof(p_response_payload) <> 'object'
    or pg_column_size(p_response_payload) > 65536
    or not (p_response_payload ?& array[
      'assessmentVietnamese',
      'explanationVietnamese',
      'example',
      'frequentVietnameseMistake',
      'nextExerciseVietnamese',
      'sourceBoundaryVietnamese'
    ])
    or p_prompt_tokens is null
    or p_completion_tokens is null
    or p_total_tokens is null
    or p_prompt_tokens < 0
    or p_completion_tokens < 0
    or p_total_tokens <> p_prompt_tokens + p_completion_tokens
    or p_total_tokens > 1000000
    or p_estimated_cost_microusd is null
    or p_estimated_cost_microusd < 0
    or p_estimated_cost_microusd > reservation_microusd
    or p_provider_model is null
    or p_provider_model !~ '^[-a-z0-9.]{3,120}$'
    or p_configuration_version is null
    or p_configuration_version !~ '^[-a-z0-9.:]{3,160}$'
    or p_now is null then
    raise exception using
      errcode = '22023',
      message = 'Tutor completion input is invalid.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 7210)
  );
  perform private.require_active_learning_account(p_user_id);

  select *
  into turn_record
  from private.ai_tutor_turns as tutor_turn
  where tutor_turn.turn_id = p_turn_id
  for update;

  if turn_record.turn_id is null
    or turn_record.user_id <> p_user_id
    or turn_record.conversation_id <> p_conversation_id
    or turn_record.payload_hash <> lower(p_payload_hash) then
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
      turn_record.estimated_cost_microusd;
    return;
  end if;

  if turn_record.state not in ('pending', 'streaming') then
    raise exception using
      errcode = '22023',
      message = 'Tutor turn is not available for completion.';
  end if;

  current_window := date_trunc('hour', turn_record.started_at);
  update private.ai_tutor_rate_windows
  set
    reserved_cost_microusd = greatest(0, reserved_cost_microusd - reservation_microusd),
    actual_cost_microusd = actual_cost_microusd + p_estimated_cost_microusd,
    updated_at = p_now
  where user_id = p_user_id
    and window_start = current_window;

  update private.ai_tutor_turns as tutor_turn
  set
    state = 'completed',
    response_payload = p_response_payload,
    provider_model = p_provider_model,
    configuration_version = p_configuration_version,
    prompt_tokens = p_prompt_tokens,
    completion_tokens = p_completion_tokens,
    total_tokens = p_total_tokens,
    estimated_cost_microusd = p_estimated_cost_microusd,
    lease_expires_at = null,
    completed_at = p_now,
    updated_at = p_now,
    error_code = null
  where tutor_turn.turn_id = p_turn_id;

  return query
  select
    p_conversation_id,
    p_turn_id,
    'completed'::text,
    false,
    p_response_payload,
    p_prompt_tokens,
    p_completion_tokens,
    p_total_tokens,
    p_estimated_cost_microusd;
end;
$function$;

create function private.fail_ai_tutor_turn(
  p_user_id uuid,
  p_conversation_id uuid,
  p_turn_id uuid,
  p_payload_hash text,
  p_error_code text,
  p_now timestamptz default clock_timestamp()
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
  current_window timestamptz;
  reservation_microusd constant bigint := 500000;
begin
  if p_user_id is null
    or p_conversation_id is null
    or p_turn_id is null
    or p_payload_hash is null
    or p_payload_hash !~* '^[0-9a-f]{64}$'
    or p_error_code is null
    or p_error_code !~ '^[-a-z0-9_.]{1,80}$'
    or p_now is null then
    raise exception using
      errcode = '22023',
      message = 'Tutor failure input is invalid.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 7210)
  );
  perform private.require_active_learning_account(p_user_id);

  select *
  into turn_record
  from private.ai_tutor_turns as tutor_turn
  where tutor_turn.turn_id = p_turn_id
  for update;

  if turn_record.turn_id is null
    or turn_record.user_id <> p_user_id
    or turn_record.conversation_id <> p_conversation_id
    or turn_record.payload_hash <> lower(p_payload_hash) then
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

  current_window := date_trunc('hour', turn_record.started_at);
  update private.ai_tutor_rate_windows
  set
    reserved_cost_microusd = greatest(0, reserved_cost_microusd - reservation_microusd),
    updated_at = p_now
  where user_id = p_user_id
    and window_start = current_window;

  update private.ai_tutor_turns as tutor_turn
  set
    state = 'failed',
    error_code = p_error_code,
    lease_expires_at = null,
    updated_at = p_now
  where tutor_turn.turn_id = p_turn_id;

  return query select p_conversation_id, p_turn_id, 'failed'::text, false;
end;
$function$;

create function private.purge_ai_tutor_data_after_learning_operation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, private
as $function$
begin
  delete from private.ai_tutor_turns where user_id = new.user_id;
  delete from private.ai_tutor_rate_windows where user_id = new.user_id;
  delete from private.ai_tutor_conversations where user_id = new.user_id;
  return new;
end;
$function$;

create trigger purge_ai_tutor_data_after_learning_operation
after insert on private.learning_data_purge_operations
for each row execute function private.purge_ai_tutor_data_after_learning_operation();

alter function private.begin_ai_tutor_turn(
  uuid, uuid, uuid, text, jsonb, text, text, text, text, text, text, timestamptz
) owner to app_security_definer;
alter function private.complete_ai_tutor_turn(
  uuid, uuid, uuid, text, jsonb, bigint, bigint, bigint, bigint, text, text, timestamptz
) owner to app_security_definer;
alter function private.fail_ai_tutor_turn(
  uuid, uuid, uuid, text, text, timestamptz
) owner to app_security_definer;
alter function private.purge_ai_tutor_data_after_learning_operation()
  owner to app_security_definer;

grant usage on schema private to app_learning_api_executor;
grant execute on function private.begin_ai_tutor_turn(
  uuid, uuid, uuid, text, jsonb, text, text, text, text, text, text, timestamptz
) to app_learning_api_executor;
grant execute on function private.complete_ai_tutor_turn(
  uuid, uuid, uuid, text, jsonb, bigint, bigint, bigint, bigint, text, text, timestamptz
) to app_learning_api_executor;
grant execute on function private.fail_ai_tutor_turn(
  uuid, uuid, uuid, text, text, timestamptz
) to app_learning_api_executor;

revoke all on function private.begin_ai_tutor_turn(
  uuid, uuid, uuid, text, jsonb, text, text, text, text, text, text, timestamptz
) from public, anon, authenticated, service_role;
revoke all on function private.complete_ai_tutor_turn(
  uuid, uuid, uuid, text, jsonb, bigint, bigint, bigint, bigint, text, text, timestamptz
) from public, anon, authenticated, service_role;
revoke all on function private.fail_ai_tutor_turn(
  uuid, uuid, uuid, text, text, timestamptz
) from public, anon, authenticated, service_role;
revoke all on function private.purge_ai_tutor_data_after_learning_operation()
  from public, anon, authenticated, service_role;

revoke create on schema private from app_security_definer;

commit;
