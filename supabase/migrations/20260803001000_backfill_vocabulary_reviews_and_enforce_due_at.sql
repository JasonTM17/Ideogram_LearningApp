begin;

grant create on schema private to app_security_definer;

-- Existing eligible completions predate the vocabulary review initializer.
-- This administrative migration accepts active and paused enrollments: a pause
-- prevents review mutations, but must not make an already completed activity
-- lose its future review schedule after the learner resumes. The uniqueness
-- constraint makes deployment retries safe without rewriting item identity.
insert into public.review_items (
  user_id,
  content_release_id,
  activity_id,
  source_item_key
)
select
  completion.user_id,
  completion.content_release_id,
  completion.activity_id,
  format('vocabulary-%s', vocabulary_entry.ordinality)
from public.learner_activity_completions as completion
join public.activities as activity
  on activity.content_release_id = completion.content_release_id
  and activity.activity_id = completion.activity_id
join public.profiles as profile
  on profile.user_id = completion.user_id
  and profile.account_state = 'active'
  and profile.revoked_at is null
join public.account_roles as learner_role
  on learner_role.user_id = completion.user_id
  and learner_role.role = 'learner'
  and learner_role.revoked_at is null
join public.learner_enrollments as enrollment
  on enrollment.user_id = completion.user_id
  and enrollment.content_release_id = completion.content_release_id
  and enrollment.enrollment_state in ('active', 'paused')
cross join lateral jsonb_array_elements(activity.payload -> 'entries')
  with ordinality as vocabulary_entry(entry, ordinality)
where activity.activity_type = 'vocabulary'
  and activity.status = 'published'
  and private.is_visible_content_release(completion.content_release_id)
on conflict (user_id, content_release_id, activity_id, source_item_key) do nothing;

create or replace function private.submit_review_event(
  p_user_id uuid,
  p_item_id uuid,
  p_idempotency_key uuid,
  p_device_id uuid,
  p_device_sequence bigint,
  p_payload_hash text,
  p_grade text,
  p_reviewed_at_client timestamptz,
  p_client_timezone text
)
returns table (
  event_id uuid,
  idempotent_replay boolean,
  server_receipt_sequence bigint,
  algorithm_version text,
  due_at timestamptz,
  ease_factor numeric,
  interval_minutes integer,
  lapse_count integer,
  repetition_count integer,
  state text
)
language plpgsql
security definer
set search_path = pg_catalog, private, public
as $function$
declare
  existing_event public.review_events%rowtype;
  existing_device_event public.review_events%rowtype;
  item_record public.review_items%rowtype;
  inserted_event public.review_events%rowtype;
  active_enrollment_id uuid;
  item_content_release_id text;
  normalized_hash text;
  receipt_sequence bigint;
  release_path_id uuid;
  review_now timestamptz;
  previous_schedule jsonb;
  next_due_at timestamptz;
  next_ease_factor numeric(3, 2);
  next_interval_minutes integer;
  next_lapse_count integer;
  next_repetition_count integer;
  next_state text;
begin
  if p_user_id is null
    or p_item_id is null
    or p_idempotency_key is null
    or p_device_id is null
    or p_device_sequence is null
    or p_device_sequence <= 0
    or p_payload_hash is null
    or p_payload_hash !~* '^[0-9a-f]{64}$'
    or p_grade is null
    or p_grade not in ('again', 'hard', 'good', 'easy')
    or p_client_timezone is null
    or not exists (select 1 from pg_catalog.pg_timezone_names where name = p_client_timezone) then
    raise exception using
      errcode = '22023',
      message = 'Review submission input is invalid.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 7204)
  );

  perform private.require_active_learning_account(p_user_id);

  review_now := pg_catalog.clock_timestamp();
  normalized_hash := lower(p_payload_hash);

  select *
  into existing_event
  from public.review_events
  where user_id = p_user_id
    and idempotency_key = p_idempotency_key
  for update;

  if existing_event.event_id is not null then
    if existing_event.item_id <> p_item_id
      or existing_event.device_id <> p_device_id
      or existing_event.device_sequence <> p_device_sequence
      or existing_event.payload_hash <> normalized_hash
      or existing_event.grade <> p_grade
      or existing_event.reviewed_at_client is distinct from p_reviewed_at_client
      or existing_event.client_timezone <> p_client_timezone then
      raise exception using
        errcode = '22023',
        message = 'Review idempotency key was reused with a different payload.';
    end if;

    return query
    select
      existing_event.event_id,
      true,
      existing_event.server_receipt_sequence,
      existing_event.algorithm_version,
      existing_event.next_due_at,
      existing_event.next_ease_factor,
      existing_event.next_interval_minutes,
      existing_event.next_lapse_count,
      existing_event.next_repetition_count,
      existing_event.next_state;
    return;
  end if;

  select *
  into existing_device_event
  from public.review_events
  where user_id = p_user_id
    and device_id = p_device_id
    and device_sequence = p_device_sequence
  for update;

  if existing_device_event.event_id is not null then
    raise exception using
      errcode = '22023',
      message = 'Device sequence was already used for another review event.';
  end if;

  select content_release_id
  into item_content_release_id
  from public.review_items
  where user_id = p_user_id
    and item_id = p_item_id;

  if item_content_release_id is null then
    raise exception using
      errcode = 'P0002',
      message = 'Review item is not available to this learner.';
  end if;

  release_path_id := private.require_visible_learning_release(item_content_release_id);
  active_enrollment_id := private.require_active_release_enrollment(
    p_user_id,
    item_content_release_id,
    release_path_id
  );

  select *
  into item_record
  from public.review_items
  where user_id = p_user_id
    and item_id = p_item_id
    and content_release_id = item_content_release_id
  for update;

  if item_record.item_id is null then
    raise exception using
      errcode = 'P0002',
      message = 'Review item changed while the operation was being validated.';
  end if;

  if item_record.state = 'suspended' then
    raise exception using
      errcode = '23514',
      message = 'Suspended review items cannot receive review events.';
  end if;

  if item_record.due_at > review_now then
    raise exception using
      errcode = '23514',
      message = 'Review item is not due yet.';
  end if;

  previous_schedule := jsonb_build_object(
    'algorithmVersion', item_record.algorithm_version,
    'dueAt', item_record.due_at,
    'easeFactor', item_record.ease_factor,
    'intervalMinutes', item_record.interval_minutes,
    'lapseCount', item_record.lapse_count,
    'repetitionCount', item_record.repetition_count,
    'state', item_record.state
  );

  if p_grade = 'again' then
    next_interval_minutes := 10;
    next_ease_factor := greatest(1.30::numeric, least(3.50::numeric, item_record.ease_factor - 0.20));
    next_lapse_count := item_record.lapse_count + 1;
    next_repetition_count := 0;
    next_state := 'relearning';
  elsif p_grade = 'hard' then
    next_interval_minutes := least(5256000, case
      when item_record.interval_minutes = 0 then 1440
      else greatest(1440, round(greatest(item_record.interval_minutes, 1440) * 1.2)::integer)
    end);
    next_ease_factor := greatest(1.30::numeric, least(3.50::numeric, item_record.ease_factor - 0.15));
    next_lapse_count := item_record.lapse_count;
    next_repetition_count := item_record.repetition_count + 1;
    next_state := 'review';
  elsif p_grade = 'good' and item_record.state = 'relearning' then
    next_interval_minutes := 20;
    next_ease_factor := greatest(
      1.30::numeric,
      least(3.50::numeric, item_record.ease_factor + 0.05)
    );
    next_lapse_count := item_record.lapse_count;
    next_repetition_count := item_record.repetition_count + 1;
    next_state := 'learning';
  else
    next_interval_minutes := least(5256000, case
      when item_record.interval_minutes = 0 and p_grade = 'easy' then 5760
      when item_record.interval_minutes = 0 then 1440
      when p_grade = 'easy' then round((item_record.interval_minutes * 3) / 10.0) * 10
      else round((item_record.interval_minutes * item_record.ease_factor) / 10.0) * 10
    end);
    next_ease_factor := greatest(
      1.30::numeric,
      least(3.50::numeric, item_record.ease_factor + case when p_grade = 'easy' then 0.15 else 0.05 end)
    );
    next_lapse_count := item_record.lapse_count;
    next_repetition_count := item_record.repetition_count + 1;
    next_state := 'review';
  end if;

  next_due_at := review_now + make_interval(mins => next_interval_minutes);

  insert into private.learner_event_cursors (user_id, event_stream, next_receipt_sequence)
  values (p_user_id, 'review', 1)
  on conflict (user_id, event_stream) do update
  set
    next_receipt_sequence = private.learner_event_cursors.next_receipt_sequence + 1,
    updated_at = review_now
  returning next_receipt_sequence into receipt_sequence;

  update public.review_items
  set
    state = next_state,
    due_at = next_due_at,
    ease_factor = next_ease_factor,
    interval_minutes = next_interval_minutes,
    lapse_count = next_lapse_count,
    repetition_count = next_repetition_count,
    updated_at = review_now
  where user_id = p_user_id
    and item_id = p_item_id;

  insert into public.review_events (
    user_id,
    item_id,
    idempotency_key,
    device_id,
    device_sequence,
    payload_hash,
    grade,
    reviewed_at_client,
    client_timezone,
    server_receipt_sequence,
    algorithm_version,
    previous_schedule,
    next_due_at,
    next_ease_factor,
    next_interval_minutes,
    next_lapse_count,
    next_repetition_count,
    next_state,
    recorded_at
  )
  values (
    p_user_id,
    p_item_id,
    p_idempotency_key,
    p_device_id,
    p_device_sequence,
    normalized_hash,
    p_grade,
    p_reviewed_at_client,
    p_client_timezone,
    receipt_sequence,
    item_record.algorithm_version,
    previous_schedule,
    next_due_at,
    next_ease_factor,
    next_interval_minutes,
    next_lapse_count,
    next_repetition_count,
    next_state,
    review_now
  )
  returning * into inserted_event;

  update public.learner_enrollments
  set last_activity_at = review_now
  where enrollment_id = active_enrollment_id;

  return query
  select
    inserted_event.event_id,
    false,
    inserted_event.server_receipt_sequence,
    inserted_event.algorithm_version,
    inserted_event.next_due_at,
    inserted_event.next_ease_factor,
    inserted_event.next_interval_minutes,
    inserted_event.next_lapse_count,
    inserted_event.next_repetition_count,
    inserted_event.next_state;
end;
$function$;

alter function private.submit_review_event(
  uuid, uuid, uuid, uuid, bigint, text, text, timestamptz, text
) owner to app_security_definer;

revoke create on schema private from app_security_definer;

revoke all on function private.submit_review_event(
  uuid, uuid, uuid, uuid, bigint, text, text, timestamptz, text
) from public, anon, authenticated, service_role, app_learning_api_executor;

grant execute on function private.submit_review_event(
  uuid, uuid, uuid, uuid, bigint, text, text, timestamptz, text
) to app_learning_api_executor;

commit;
