begin;

grant create on schema private to app_security_definer;

create table private.activity_attempt_receipts (
  attempt_id uuid primary key references public.learner_activity_attempts(attempt_id) on delete cascade,
  lesson_id text not null,
  progress_state text not null check (progress_state in ('not_started', 'in_progress', 'completed')),
  completed_activity_count integer not null check (completed_activity_count >= 0),
  total_activity_count integer not null check (total_activity_count >= completed_activity_count)
);

alter table private.activity_attempt_receipts owner to app_security_definer;

revoke all on table private.activity_attempt_receipts
  from public, anon, authenticated, service_role, app_learning_api_executor;

create function private.evaluate_and_submit_activity_attempt(
  p_user_id uuid,
  p_content_release_id text,
  p_activity_id text,
  p_device_id uuid,
  p_device_sequence bigint,
  p_idempotency_key uuid,
  p_payload_hash text,
  p_response_payload jsonb,
  p_reviewed_at_client timestamptz,
  p_client_timezone text
)
returns table (
  attempt_id uuid,
  idempotent_replay boolean,
  lesson_id text,
  completion_state text,
  progress_state text,
  completed_activity_count integer,
  total_activity_count integer
)
language plpgsql
security definer
set search_path = pg_catalog, private, public
as $function$
declare
  activity_record public.activities%rowtype;
  existing_attempt public.learner_activity_attempts%rowtype;
  stored_receipt private.activity_attempt_receipts%rowtype;
  persisted_receipt record;
  release_path_id uuid;
  normalized_hash text;
  question_record jsonb;
  question_count integer;
  answer_count integer;
  correct_answer_count integer := 0;
  correct_option_count integer;
  correct_option_id text;
  submitted_option_id text;
  evaluated_completion_state text;
  evaluated_score numeric;
  response_key_count integer;
  evaluator_version constant text := 'activity-evaluator-v1';
begin
  if p_user_id is null
    or p_content_release_id is null
    or p_content_release_id !~ '^[a-z0-9][a-z0-9-]{1,118}$'
    or p_activity_id is null
    or p_activity_id !~ '^[a-z0-9][a-z0-9-]{1,118}$'
    or p_device_id is null
    or p_device_sequence is null
    or p_device_sequence <= 0
    or p_idempotency_key is null
    or p_payload_hash is null
    or p_payload_hash !~* '^[0-9a-f]{64}$'
    or p_response_payload is null
    or jsonb_typeof(p_response_payload) <> 'object'
    or pg_column_size(p_response_payload) > 65536
    or p_reviewed_at_client is null
    or p_client_timezone is null
    or not exists (select 1 from pg_catalog.pg_timezone_names where name = p_client_timezone) then
    raise exception using
      errcode = '22023',
      message = 'Activity attempt input is invalid.';
  end if;

  normalized_hash := lower(p_payload_hash);
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 7203)
  );
  perform private.require_active_learning_account(p_user_id);
  release_path_id := private.require_visible_learning_release(p_content_release_id);
  perform private.require_active_release_enrollment(
    p_user_id,
    p_content_release_id,
    release_path_id
  );

  select *
  into existing_attempt
  from public.learner_activity_attempts
  where user_id = p_user_id
    and idempotency_key = p_idempotency_key
  for update;

  if existing_attempt.attempt_id is not null then
    if existing_attempt.content_release_id <> p_content_release_id
      or existing_attempt.activity_id <> p_activity_id
      or existing_attempt.device_id <> p_device_id
      or existing_attempt.device_sequence <> p_device_sequence
      or existing_attempt.payload_hash <> normalized_hash
      or existing_attempt.response_payload <> p_response_payload
      or existing_attempt.reviewed_at_client is distinct from p_reviewed_at_client
      or existing_attempt.client_timezone <> p_client_timezone then
      raise exception using
        errcode = '22023',
        message = 'Activity idempotency key was reused with a different payload.';
    end if;

    select *
    into stored_receipt
    from private.activity_attempt_receipts as receipt
    where receipt.attempt_id = existing_attempt.attempt_id;

    if stored_receipt.attempt_id is null then
      raise exception using
        errcode = '22023',
        message = 'Activity attempt receipt is unavailable.';
    end if;

    return query
    select
      existing_attempt.attempt_id,
      true,
      stored_receipt.lesson_id,
      existing_attempt.completion_state,
      stored_receipt.progress_state,
      stored_receipt.completed_activity_count,
      stored_receipt.total_activity_count;
    return;
  end if;

  select *
  into activity_record
  from public.activities
  where content_release_id = p_content_release_id
    and activity_id = p_activity_id
    and status = 'published'
  for share;

  if activity_record.activity_id is null then
    raise exception using
      errcode = 'P0002',
      message = 'Activity is not available in the selected release.';
  end if;

  case activity_record.activity_type
    when 'vocabulary' then
      if p_response_payload <> '{"acknowledged": true}'::jsonb then
        raise exception using
          errcode = '22023',
          message = 'Activity attempt input is invalid.';
      end if;
      evaluated_completion_state := 'completed';
      evaluated_score := null;
    when 'listening' then
      if jsonb_typeof(p_response_payload -> 'answers') is distinct from 'object' then
        raise exception using
          errcode = '22023',
          message = 'Activity attempt input is invalid.';
      end if;

      select count(*)
      into response_key_count
      from jsonb_object_keys(p_response_payload);
      if response_key_count <> 1 then
        raise exception using
          errcode = '22023',
          message = 'Activity attempt input is invalid.';
      end if;

      question_count := jsonb_array_length(activity_record.payload -> 'questions');
      select count(*)
      into answer_count
      from jsonb_object_keys(p_response_payload -> 'answers');
      if question_count < 1 or answer_count <> question_count then
        raise exception using
          errcode = '22023',
          message = 'Activity attempt input is invalid.';
      end if;

      for question_record in
        select question.value
        from jsonb_array_elements(activity_record.payload -> 'questions') as question(value)
      loop
        submitted_option_id := p_response_payload -> 'answers' ->> (question_record ->> 'questionId');

        select
          count(*) filter (where option.value ->> 'isCorrect' = 'true'),
          max(option.value ->> 'optionId') filter (where option.value ->> 'isCorrect' = 'true')
        into correct_option_count, correct_option_id
        from jsonb_array_elements(question_record -> 'options') as option(value);

        if correct_option_count <> 1
          or submitted_option_id is null
          or not exists (
            select 1
            from jsonb_array_elements(question_record -> 'options') as option(value)
            where option.value ->> 'optionId' = submitted_option_id
          ) then
          raise exception using
            errcode = '22023',
            message = 'Activity attempt input is invalid.';
        end if;

        if submitted_option_id = correct_option_id then
          correct_answer_count := correct_answer_count + 1;
        end if;
      end loop;

      evaluated_completion_state := 'completed';
      evaluated_score := correct_answer_count::numeric / question_count::numeric;
    else
      raise exception using
        errcode = 'P0002',
        message = 'Activity evaluator is not available for this activity type.';
  end case;

  select *
  into persisted_receipt
  from private.submit_activity_attempt(
    p_user_id,
    p_content_release_id,
    p_activity_id,
    p_device_id,
    p_device_sequence,
    p_idempotency_key,
    normalized_hash,
    p_response_payload,
    evaluated_completion_state,
    evaluated_score,
    evaluator_version,
    p_reviewed_at_client,
    p_client_timezone
  );

  insert into private.activity_attempt_receipts (
    attempt_id,
    lesson_id,
    progress_state,
    completed_activity_count,
    total_activity_count
  )
  values (
    persisted_receipt.attempt_id,
    persisted_receipt.lesson_id,
    persisted_receipt.progress_state,
    persisted_receipt.completed_activity_count,
    persisted_receipt.total_activity_count
  )
  on conflict on constraint activity_attempt_receipts_pkey do nothing;

  return query
  select
    persisted_receipt.attempt_id,
    persisted_receipt.idempotent_replay,
    persisted_receipt.lesson_id,
    persisted_receipt.completion_state,
    persisted_receipt.progress_state,
    persisted_receipt.completed_activity_count,
    persisted_receipt.total_activity_count;
end;
$function$;

alter function private.evaluate_and_submit_activity_attempt(
  uuid, text, text, uuid, bigint, uuid, text, jsonb, timestamptz, text
) owner to app_security_definer;

revoke create on schema private from app_security_definer;

revoke all on function private.evaluate_and_submit_activity_attempt(
  uuid, text, text, uuid, bigint, uuid, text, jsonb, timestamptz, text
) from public, anon, authenticated, service_role, app_learning_api_executor;

revoke all on function private.submit_activity_attempt(
  uuid, text, text, uuid, bigint, uuid, text, jsonb, text, numeric, text, timestamptz, text
) from app_learning_api_executor;

grant execute on function private.evaluate_and_submit_activity_attempt(
  uuid, text, text, uuid, bigint, uuid, text, jsonb, timestamptz, text
) to app_learning_api_executor;

commit;
