-- Learner-owned progress, placement evidence, and deterministic SRS events.
--
-- Learner clients receive read-only access to their own learning records.
-- All mutations flow through private transactional helpers called only by a
-- trusted server runtime after it has bound the authenticated subject.

do $block$
begin
  create role app_learning_api_executor noinherit nologin nobypassrls;
exception
  when duplicate_object then null;
end;
$block$;

grant app_learning_api_executor to postgres;

create table public.learner_enrollments (
  enrollment_id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete restrict,
  path_id uuid not null,
  content_release_id text not null,
  enrollment_state text not null default 'active'
    check (enrollment_state in ('active', 'paused', 'completed', 'archived')),
  enrolled_at timestamptz not null default clock_timestamp(),
  paused_at timestamptz,
  completed_at timestamptz,
  last_activity_at timestamptz,
  foreign key (path_id, content_release_id)
    references public.content_releases (path_id, content_release_id) on delete restrict,
  unique (user_id, path_id, content_release_id),
  check (enrollment_state <> 'paused' or paused_at is not null),
  check (enrollment_state <> 'completed' or completed_at is not null)
);

create table public.placement_question_sets (
  placement_question_set_id uuid primary key default extensions.gen_random_uuid(),
  language_code text not null references public.language_packs (language_code) on delete restrict,
  objective_key text not null references public.learning_objectives (objective_key) on delete restrict,
  placement_version text not null check (placement_version ~ '^v[0-9]+\.[0-9]+\.[0-9]+$'),
  title_vietnamese text not null check (char_length(title_vietnamese) between 1 and 240),
  status text not null default 'draft'
    check (status in ('draft', 'reviewed', 'published', 'archived')),
  provenance_id uuid not null
    references public.content_provenance (provenance_id) on delete restrict,
  published_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique (language_code, objective_key, placement_version),
  unique (
    placement_question_set_id,
    language_code,
    objective_key,
    placement_version
  ),
  check (status <> 'published' or published_at is not null),
  check (status in ('published', 'archived') or published_at is null)
);

create table public.placement_questions (
  placement_question_id uuid primary key default extensions.gen_random_uuid(),
  placement_question_set_id uuid not null
    references public.placement_question_sets (placement_question_set_id) on delete restrict,
  question_key text not null check (question_key ~ '^[a-z0-9][a-z0-9-]{1,118}$'),
  sequence integer not null check (sequence between 1 and 500),
  question_type text not null
    check (question_type in ('reading', 'listening', 'vocabulary', 'grammar')),
  prompt_payload jsonb not null
    check (jsonb_typeof(prompt_payload) = 'object' and pg_column_size(prompt_payload) <= 65536),
  scoring_rubric jsonb not null
    check (jsonb_typeof(scoring_rubric) = 'object' and pg_column_size(scoring_rubric) <= 65536),
  status text not null default 'draft'
    check (status in ('draft', 'reviewed', 'published', 'archived')),
  provenance_id uuid not null
    references public.content_provenance (provenance_id) on delete restrict,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique (placement_question_set_id, placement_question_id),
  unique (placement_question_set_id, question_key),
  unique (placement_question_set_id, sequence)
);

create table public.placement_sessions (
  placement_session_id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete restrict,
  idempotency_key uuid not null,
  placement_question_set_id uuid not null,
  language_code text not null,
  objective_key text not null,
  placement_version text not null,
  session_status text not null default 'draft'
    check (session_status in ('draft', 'submitted', 'scored', 'abandoned')),
  recommended_level_code text,
  confidence numeric(4, 3) check (confidence between 0 and 1),
  score_summary jsonb not null default '{}'::jsonb
    check (jsonb_typeof(score_summary) = 'object' and pg_column_size(score_summary) <= 65536),
  started_at timestamptz not null default clock_timestamp(),
  submitted_at timestamptz,
  scored_at timestamptz,
  completed_at timestamptz,
  foreign key (
    placement_question_set_id,
    language_code,
    objective_key,
    placement_version
  ) references public.placement_question_sets (
    placement_question_set_id,
    language_code,
    objective_key,
    placement_version
  ) on delete restrict,
  foreign key (language_code, recommended_level_code)
    references public.level_definitions (language_code, level_code) on delete restrict,
  unique (placement_session_id, placement_question_set_id),
  unique (user_id, placement_session_id, placement_question_set_id),
  unique (user_id, idempotency_key),
  check (session_status <> 'submitted' or submitted_at is not null),
  check (
    session_status <> 'scored'
    or (
      submitted_at is not null
      and scored_at is not null
      and completed_at is not null
      and recommended_level_code is not null
      and confidence is not null
    )
  ),
  check (session_status <> 'abandoned' or completed_at is not null),
  check (recommended_level_code is null or session_status = 'scored'),
  check (confidence is null or session_status = 'scored')
);

create table public.placement_answers (
  placement_answer_id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete restrict,
  placement_session_id uuid not null,
  placement_question_set_id uuid not null,
  placement_question_id uuid not null,
  attempt_number integer not null check (attempt_number between 1 and 10),
  idempotency_key uuid not null,
  device_id uuid not null,
  device_sequence bigint not null check (device_sequence > 0),
  payload_hash text not null check (payload_hash ~* '^[0-9a-f]{64}$'),
  answer_payload jsonb not null
    check (jsonb_typeof(answer_payload) = 'object' and pg_column_size(answer_payload) <= 65536),
  response_time_ms integer check (response_time_ms between 0 and 7_200_000),
  client_recorded_at timestamptz,
  recorded_at timestamptz not null default clock_timestamp(),
  foreign key (user_id, placement_session_id, placement_question_set_id)
    references public.placement_sessions (
      user_id,
      placement_session_id,
      placement_question_set_id
    ) on delete restrict,
  foreign key (placement_question_set_id, placement_question_id)
    references public.placement_questions (
      placement_question_set_id,
      placement_question_id
    ) on delete restrict,
  unique (placement_session_id, placement_question_id, attempt_number),
  unique (placement_session_id, idempotency_key),
  unique (placement_session_id, device_id, device_sequence)
);

create table public.learner_activity_attempts (
  attempt_id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete restrict,
  content_release_id text not null,
  activity_id text not null,
  device_id uuid not null,
  device_sequence bigint not null check (device_sequence > 0),
  idempotency_key uuid not null,
  payload_hash text not null check (payload_hash ~* '^[0-9a-f]{64}$'),
  response_payload jsonb not null
    check (jsonb_typeof(response_payload) = 'object' and pg_column_size(response_payload) <= 65536),
  completion_state text not null
    check (completion_state in ('submitted', 'completed', 'needs_review')),
  score numeric(5, 4) check (score between 0 and 1),
  evaluation_version text not null check (char_length(evaluation_version) between 1 and 64),
  reviewed_at_client timestamptz,
  client_timezone text not null check (char_length(client_timezone) between 1 and 64),
  submitted_at timestamptz not null default clock_timestamp(),
  completed_at timestamptz,
  foreign key (content_release_id, activity_id)
    references public.activities (content_release_id, activity_id) on delete restrict,
  unique (user_id, attempt_id),
  unique (user_id, content_release_id, activity_id, attempt_id),
  unique (user_id, idempotency_key),
  unique (user_id, device_id, device_sequence),
  check ((completion_state = 'completed') = (completed_at is not null))
);

create table public.learner_activity_completions (
  user_id uuid not null references public.profiles (user_id) on delete restrict,
  content_release_id text not null,
  activity_id text not null,
  first_attempt_id uuid not null,
  completed_at timestamptz not null default clock_timestamp(),
  primary key (user_id, activity_id),
  foreign key (content_release_id, activity_id)
    references public.activities (content_release_id, activity_id) on delete restrict,
  foreign key (user_id, content_release_id, activity_id, first_attempt_id)
    references public.learner_activity_attempts (
      user_id,
      content_release_id,
      activity_id,
      attempt_id
    ) on delete restrict
);

create table public.learner_lesson_progress (
  user_id uuid not null references public.profiles (user_id) on delete restrict,
  content_release_id text not null,
  lesson_id text not null,
  completed_activity_count integer not null default 0 check (completed_activity_count >= 0),
  total_activity_count integer not null check (total_activity_count > 0),
  progress_state text not null default 'not_started'
    check (progress_state in ('not_started', 'in_progress', 'completed')),
  last_activity_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default clock_timestamp(),
  primary key (user_id, lesson_id),
  foreign key (content_release_id, lesson_id)
    references public.lessons (content_release_id, lesson_id) on delete restrict,
  check (completed_activity_count <= total_activity_count),
  check (progress_state <> 'completed' or completed_at is not null)
);

create table public.learner_proficiency_snapshots (
  snapshot_id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete restrict,
  placement_session_id uuid
    references public.placement_sessions (placement_session_id) on delete restrict,
  language_code text not null,
  level_code text not null,
  objective_key text not null references public.learning_objectives (objective_key) on delete restrict,
  evidence_source text not null
    check (evidence_source in ('placement', 'activity', 'review', 'manual')),
  confidence numeric(4, 3) not null check (confidence between 0 and 1),
  evidence jsonb not null
    check (jsonb_typeof(evidence) = 'object' and pg_column_size(evidence) <= 65536),
  content_release_id text references public.content_releases (content_release_id) on delete restrict,
  created_at timestamptz not null default clock_timestamp(),
  foreign key (language_code, level_code)
    references public.level_definitions (language_code, level_code) on delete restrict,
  check (
    (evidence_source = 'placement' and placement_session_id is not null)
    or (evidence_source <> 'placement' and placement_session_id is null)
  )
);

create table public.review_items (
  item_id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete restrict,
  content_release_id text not null,
  activity_id text not null,
  source_item_key text not null check (source_item_key ~ '^[a-z0-9][a-z0-9-]{1,118}$'),
  state text not null default 'learning'
    check (state in ('learning', 'review', 'relearning', 'suspended')),
  algorithm_version text not null default 'srs-v1'
    check (algorithm_version = 'srs-v1'),
  due_at timestamptz not null default clock_timestamp(),
  ease_factor numeric(3, 2) not null default 2.30
    check (ease_factor between 1.30 and 3.50),
  interval_minutes integer not null default 0 check (interval_minutes between 0 and 5256000),
  lapse_count integer not null default 0 check (lapse_count >= 0),
  repetition_count integer not null default 0 check (repetition_count >= 0),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  foreign key (content_release_id, activity_id)
    references public.activities (content_release_id, activity_id) on delete restrict,
  unique (user_id, item_id),
  unique (user_id, content_release_id, activity_id, source_item_key),
  check (interval_minutes <> 0 or state in ('learning', 'suspended'))
);

create table public.review_events (
  event_id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete restrict,
  item_id uuid not null,
  idempotency_key uuid not null,
  device_id uuid not null,
  device_sequence bigint not null check (device_sequence > 0),
  payload_hash text not null check (payload_hash ~* '^[0-9a-f]{64}$'),
  grade text not null check (grade in ('again', 'hard', 'good', 'easy')),
  reviewed_at_client timestamptz,
  client_timezone text not null check (char_length(client_timezone) between 1 and 64),
  server_receipt_sequence bigint not null check (server_receipt_sequence > 0),
  algorithm_version text not null check (algorithm_version = 'srs-v1'),
  previous_schedule jsonb not null
    check (jsonb_typeof(previous_schedule) = 'object' and pg_column_size(previous_schedule) <= 65536),
  next_due_at timestamptz not null,
  next_ease_factor numeric(3, 2) not null check (next_ease_factor between 1.30 and 3.50),
  next_interval_minutes integer not null check (next_interval_minutes between 1 and 5256000),
  next_lapse_count integer not null check (next_lapse_count >= 0),
  next_repetition_count integer not null check (next_repetition_count >= 0),
  next_state text not null check (next_state in ('learning', 'review', 'relearning', 'suspended')),
  recorded_at timestamptz not null default clock_timestamp(),
  foreign key (user_id, item_id)
    references public.review_items (user_id, item_id) on delete restrict,
  unique (user_id, idempotency_key),
  unique (user_id, device_id, device_sequence),
  unique (user_id, server_receipt_sequence)
);

create table private.learner_event_cursors (
  user_id uuid not null references public.profiles (user_id) on delete restrict,
  event_stream text not null check (event_stream in ('review')),
  next_receipt_sequence bigint not null default 0 check (next_receipt_sequence >= 0),
  updated_at timestamptz not null default clock_timestamp(),
  primary key (user_id, event_stream)
);

create table private.learning_data_purge_operations (
  request_id uuid primary key references public.data_subject_requests (request_id) on delete restrict,
  user_id uuid not null references public.profiles (user_id) on delete restrict,
  worker_id uuid not null,
  transaction_id bigint not null,
  created_at timestamptz not null default clock_timestamp()
);

create table private.learning_data_purge_receipts (
  request_id uuid primary key references public.data_subject_requests (request_id) on delete restrict,
  user_id uuid not null references public.profiles (user_id) on delete restrict,
  worker_id uuid not null,
  purge_counts jsonb not null
    check (jsonb_typeof(purge_counts) = 'object' and pg_column_size(purge_counts) <= 65536),
  purged_at timestamptz not null default clock_timestamp()
);

create index learner_enrollments_user_state_idx
  on public.learner_enrollments (user_id, enrollment_state, last_activity_at desc);
create index learner_enrollments_release_path_idx
  on public.learner_enrollments (path_id, content_release_id);
create index placement_question_sets_catalog_idx
  on public.placement_question_sets (language_code, objective_key, status);
create index placement_question_sets_objective_idx
  on public.placement_question_sets (objective_key);
create index placement_question_sets_provenance_idx
  on public.placement_question_sets (provenance_id);
create index placement_questions_set_sequence_idx
  on public.placement_questions (placement_question_set_id, status, sequence);
create index placement_questions_provenance_idx
  on public.placement_questions (provenance_id);
create index placement_sessions_user_created_idx
  on public.placement_sessions (user_id, started_at desc);
create index placement_sessions_question_set_contract_idx
  on public.placement_sessions (
    placement_question_set_id,
    language_code,
    objective_key,
    placement_version
  );
create index placement_sessions_recommended_level_idx
  on public.placement_sessions (language_code, recommended_level_code)
  where recommended_level_code is not null;
create index placement_answers_session_question_idx
  on public.placement_answers (placement_session_id, placement_question_id, attempt_number);
create index placement_answers_user_session_set_idx
  on public.placement_answers (user_id, placement_session_id, placement_question_set_id);
create index placement_answers_question_contract_idx
  on public.placement_answers (placement_question_set_id, placement_question_id);
create index learner_activity_attempts_user_activity_idx
  on public.learner_activity_attempts (user_id, activity_id, submitted_at desc);
create index learner_activity_attempts_activity_contract_idx
  on public.learner_activity_attempts (content_release_id, activity_id);
create index learner_activity_completions_user_release_idx
  on public.learner_activity_completions (user_id, content_release_id);
create index learner_activity_completions_activity_contract_idx
  on public.learner_activity_completions (content_release_id, activity_id);
create index learner_activity_completions_attempt_contract_idx
  on public.learner_activity_completions (
    user_id,
    content_release_id,
    activity_id,
    first_attempt_id
  );
create index learner_lesson_progress_user_release_idx
  on public.learner_lesson_progress (user_id, content_release_id, updated_at desc);
create index learner_lesson_progress_lesson_contract_idx
  on public.learner_lesson_progress (content_release_id, lesson_id);
create index learner_proficiency_snapshots_user_language_idx
  on public.learner_proficiency_snapshots (user_id, language_code, created_at desc);
create index learner_proficiency_snapshots_level_idx
  on public.learner_proficiency_snapshots (language_code, level_code);
create index learner_proficiency_snapshots_objective_idx
  on public.learner_proficiency_snapshots (objective_key);
create index learner_proficiency_snapshots_release_idx
  on public.learner_proficiency_snapshots (content_release_id)
  where content_release_id is not null;
create unique index learner_proficiency_snapshots_placement_session_idx
  on public.learner_proficiency_snapshots (placement_session_id)
  where placement_session_id is not null;
create index review_items_user_due_idx
  on public.review_items (user_id, due_at)
  where state <> 'suspended';
create index review_items_activity_contract_idx
  on public.review_items (content_release_id, activity_id);
create index review_events_user_item_receipt_idx
  on public.review_events (user_id, item_id, server_receipt_sequence);
create index learning_data_purge_receipts_user_idx
  on private.learning_data_purge_receipts (user_id, purged_at desc);
create index learning_data_purge_operations_user_idx
  on private.learning_data_purge_operations (user_id);

create function private.prevent_learner_history_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $function$
begin
  if tg_op = 'DELETE' and exists (
    select 1
    from private.learning_data_purge_operations
    where user_id = old.user_id
      and transaction_id = pg_catalog.txid_current()
  ) then
    return old;
  end if;

  raise exception using
    errcode = '42501',
    message = 'Learner event history is append-only.';
end;
$function$;

create function private.require_active_learning_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  perform 1
  from public.profiles
  where user_id = p_user_id
    and account_state = 'active'
    and revoked_at is null
  for update;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'Only active learner accounts may mutate learning state.';
  end if;
end;
$function$;

create function private.require_visible_learning_release(p_content_release_id text)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  release_record public.content_releases%rowtype;
  release_path_id uuid;
begin
  release_record := private.lock_content_release(p_content_release_id);

  select learning_paths.path_id
  into release_path_id
  from public.learning_paths
  join public.language_packs
    on language_packs.language_code = learning_paths.language_code
  where learning_paths.path_id = release_record.path_id
    and release_record.release_status = 'published'
    and learning_paths.path_status = 'published'
    and language_packs.availability_state = 'active'
  for update of learning_paths, language_packs;

  if release_path_id is null then
    raise exception using
      errcode = '42501',
      message = 'Learning operations require a published active content release.';
  end if;

  return release_path_id;
end;
$function$;

create function private.require_active_release_enrollment(
  p_user_id uuid,
  p_content_release_id text,
  p_path_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  active_enrollment_id uuid;
begin
  select enrollment_id
  into active_enrollment_id
  from public.learner_enrollments
  where user_id = p_user_id
    and path_id = p_path_id
    and content_release_id = p_content_release_id
    and enrollment_state = 'active'
  for update;

  if active_enrollment_id is null then
    raise exception using
      errcode = '42501',
      message = 'Learning operations require an active enrollment for the content release.';
  end if;

  return active_enrollment_id;
end;
$function$;

create function private.enforce_learner_enrollment_lifecycle()
returns trigger
language plpgsql
set search_path = pg_catalog
as $function$
begin
  if new.enrollment_id <> old.enrollment_id
    or new.user_id <> old.user_id
    or new.path_id <> old.path_id
    or new.content_release_id <> old.content_release_id
    or new.enrolled_at <> old.enrolled_at then
    raise exception using
      errcode = '42501',
      message = 'Learner enrollment identity is immutable.';
  end if;

  if old.enrollment_state in ('completed', 'archived') then
    raise exception using
      errcode = '23514',
      message = 'Completed or archived enrollments are immutable.';
  end if;

  if old.enrollment_state = 'active'
    and new.enrollment_state not in ('active', 'paused', 'completed', 'archived') then
    raise exception using
      errcode = '23514',
      message = 'Invalid active enrollment transition.';
  end if;

  if old.enrollment_state = 'paused'
    and new.enrollment_state not in ('paused', 'active', 'completed', 'archived') then
    raise exception using
      errcode = '23514',
      message = 'Invalid paused enrollment transition.';
  end if;

  if new.enrollment_state = 'paused' then
    new.paused_at := coalesce(new.paused_at, pg_catalog.clock_timestamp());
  elsif new.enrollment_state = 'active' then
    new.paused_at := null;
  end if;

  if new.enrollment_state = 'completed' then
    new.completed_at := coalesce(new.completed_at, pg_catalog.clock_timestamp());
  elsif new.completed_at is not null then
    raise exception using
      errcode = '23514',
      message = 'Only completed enrollments may have a completion timestamp.';
  end if;

  return new;
end;
$function$;

create function private.enforce_review_item_identity()
returns trigger
language plpgsql
set search_path = pg_catalog
as $function$
begin
  if new.item_id <> old.item_id
    or new.user_id <> old.user_id
    or new.content_release_id <> old.content_release_id
    or new.activity_id <> old.activity_id
    or new.source_item_key <> old.source_item_key
    or new.algorithm_version <> old.algorithm_version
    or new.created_at <> old.created_at then
    raise exception using
      errcode = '42501',
      message = 'Review item identity and scheduler version are immutable.';
  end if;

  return new;
end;
$function$;

-- Placement-set UPDATEs own this row before their BEFORE trigger obtains the
-- advisory lock. Consumers take the same row lock first to avoid a lock-order
-- inversion while a set is being published or archived.
create function private.lock_placement_question_set(p_placement_question_set_id uuid)
returns public.placement_question_sets
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  question_set_record public.placement_question_sets%rowtype;
begin
  select *
  into question_set_record
  from public.placement_question_sets
  where placement_question_set_id = p_placement_question_set_id
  for update;

  if question_set_record.placement_question_set_id is null then
    raise exception using
      errcode = 'P0002',
      message = 'Placement question set was not found.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_placement_question_set_id::text, 7307)
  );

  return question_set_record;
end;
$function$;

create function private.enforce_placement_question_set_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, private, public
as $function$
declare
  language_availability text;
  question_set_id uuid;
begin
  question_set_id := case
    when tg_op = 'DELETE' then old.placement_question_set_id
    else new.placement_question_set_id
  end;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(question_set_id::text, 7307)
  );

  if tg_op = 'DELETE' then
    if old.status in ('published', 'archived') then
      raise exception using
        errcode = '23514',
        message = 'Published placement question sets are immutable.';
    end if;

    return old;
  end if;

  if tg_op = 'UPDATE' then
    if new.placement_question_set_id <> old.placement_question_set_id
      or new.language_code <> old.language_code
      or new.objective_key <> old.objective_key
      or new.placement_version <> old.placement_version then
      raise exception using
        errcode = '42501',
        message = 'Placement question set identity is immutable.';
    end if;

    if old.status = 'archived' then
      raise exception using
        errcode = '23514',
        message = 'Archived placement question sets are immutable.';
    end if;

    if old.status = 'published' and new.status not in ('published', 'archived') then
      raise exception using
        errcode = '23514',
        message = 'Published placement question sets may only be archived.';
    end if;

    if old.status in ('published', 'archived')
      and (
        new.title_vietnamese <> old.title_vietnamese
        or new.provenance_id <> old.provenance_id
        or new.published_at is distinct from old.published_at
      ) then
      raise exception using
        errcode = '23514',
        message = 'Published placement question set metadata is immutable.';
    end if;
  end if;

  if new.status = 'published' then
    select availability_state
    into language_availability
    from public.language_packs
    where language_code = new.language_code
    for update;

    if language_availability is distinct from 'active' then
      raise exception using
        errcode = '23514',
        message = 'Only an active language pack may publish placement questions.';
    end if;

    perform private.require_reviewed_content_provenance(
      new.provenance_id,
      'placement question set'
    );

    if not exists (
      select 1
      from public.placement_questions
      where placement_question_set_id = new.placement_question_set_id
    )
      or exists (
        select 1
        from public.placement_questions
        where placement_question_set_id = new.placement_question_set_id
          and status <> 'published'
      ) then
      raise exception using
        errcode = '23514',
        message = 'Published placement sets require a complete published question bank.';
    end if;

    new.published_at := coalesce(new.published_at, pg_catalog.clock_timestamp());
  elsif new.status = 'archived' then
    if new.published_at is null then
      raise exception using
        errcode = '23514',
        message = 'Archived placement sets must retain their publication timestamp.';
    end if;
  elsif new.published_at is not null then
    raise exception using
      errcode = '23514',
      message = 'Only published or archived placement sets may have a publication timestamp.';
  end if;

  new.updated_at := pg_catalog.clock_timestamp();
  return new;
end;
$function$;

create function private.enforce_placement_question_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, private, public
as $function$
declare
  question_set_id uuid;
  question_set_status text;
  question_set_record public.placement_question_sets%rowtype;
begin
  question_set_id := case
    when tg_op = 'DELETE' then old.placement_question_set_id
    else new.placement_question_set_id
  end;

  question_set_record := private.lock_placement_question_set(question_set_id);
  question_set_status := question_set_record.status;

  if question_set_status in ('published', 'archived') then
    raise exception using
      errcode = '23514',
      message = 'Questions in a published or archived placement set are immutable.';
  end if;

  if tg_op = 'DELETE' then
    if old.status in ('published', 'archived') then
      raise exception using
        errcode = '23514',
        message = 'Published placement questions are immutable.';
    end if;

    return old;
  end if;

  if tg_op = 'UPDATE' then
    if new.placement_question_id <> old.placement_question_id
      or new.placement_question_set_id <> old.placement_question_set_id
      or new.question_key <> old.question_key then
      raise exception using
        errcode = '42501',
        message = 'Placement question identity is immutable.';
    end if;

    if old.status in ('published', 'archived') then
      raise exception using
        errcode = '23514',
        message = 'Published placement questions are immutable.';
    end if;
  end if;

  if new.status = 'published' then
    perform private.require_reviewed_content_provenance(
      new.provenance_id,
      'placement question'
    );
  end if;

  new.updated_at := pg_catalog.clock_timestamp();
  return new;
end;
$function$;

create function private.enforce_placement_session_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $function$
begin
  if new.placement_session_id <> old.placement_session_id
    or new.user_id <> old.user_id
    or new.idempotency_key <> old.idempotency_key
    or new.placement_question_set_id <> old.placement_question_set_id
    or new.language_code <> old.language_code
    or new.objective_key <> old.objective_key
    or new.placement_version <> old.placement_version
    or new.started_at <> old.started_at then
    raise exception using
      errcode = '42501',
      message = 'Placement session identity is immutable.';
  end if;

  if old.session_status in ('scored', 'abandoned') then
    raise exception using
      errcode = '23514',
      message = 'Completed placement sessions are immutable.';
  end if;

  if old.session_status = 'draft'
    and new.session_status not in ('draft', 'submitted', 'abandoned') then
    raise exception using
      errcode = '23514',
      message = 'Draft placement sessions may only be submitted or abandoned.';
  end if;

  if old.session_status = 'submitted'
    and new.session_status not in ('submitted', 'scored', 'abandoned') then
    raise exception using
      errcode = '23514',
      message = 'Submitted placement sessions may only be scored or abandoned.';
  end if;

  if old.submitted_at is not null and new.submitted_at is distinct from old.submitted_at then
    raise exception using
      errcode = '23514',
      message = 'Placement submission timestamps are immutable.';
  end if;

  return new;
end;
$function$;

create function private.abandon_draft_placement_sessions_for_archived_question_set()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  if old.status = 'published' and new.status = 'archived' then
    update public.placement_sessions
    set
      session_status = 'abandoned',
      completed_at = pg_catalog.clock_timestamp()
    where placement_question_set_id = new.placement_question_set_id
      and session_status = 'draft';
  end if;

  return new;
end;
$function$;

create function private.require_visible_placement_question_set(
  p_placement_question_set_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  question_set_record public.placement_question_sets%rowtype;
begin
  question_set_record := private.lock_placement_question_set(p_placement_question_set_id);

  perform 1
  from public.language_packs
  where language_code = question_set_record.language_code
    and question_set_record.status = 'published'
    and availability_state = 'active'
  for update;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'Placement requires a published question set for an active language.';
  end if;
end;
$function$;

create function private.start_placement_session(
  p_user_id uuid,
  p_placement_question_set_id uuid,
  p_idempotency_key uuid
)
returns table (
  placement_session_id uuid,
  idempotent_replay boolean,
  session_status text
)
language plpgsql
security definer
set search_path = pg_catalog, private, public
as $function$
declare
  existing_session public.placement_sessions%rowtype;
  inserted_session public.placement_sessions%rowtype;
  question_set_record public.placement_question_sets%rowtype;
begin
  if p_user_id is null
    or p_placement_question_set_id is null
    or p_idempotency_key is null then
    raise exception using
      errcode = '22023',
      message = 'Placement session input is invalid.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 7202)
  );
  perform private.require_active_learning_account(p_user_id);

  select *
  into existing_session
  from public.placement_sessions
  where user_id = p_user_id
    and idempotency_key = p_idempotency_key
  for update;

  if existing_session.placement_session_id is not null then
    if existing_session.placement_question_set_id <> p_placement_question_set_id then
      raise exception using
        errcode = '22023',
        message = 'Placement idempotency key was reused for another question set.';
    end if;

    return query
    select
      existing_session.placement_session_id,
      true,
      existing_session.session_status;
    return;
  end if;

  perform private.require_visible_placement_question_set(p_placement_question_set_id);

  select *
  into question_set_record
  from public.placement_question_sets
  where placement_question_set_id = p_placement_question_set_id;

  insert into public.placement_sessions (
    user_id,
    idempotency_key,
    placement_question_set_id,
    language_code,
    objective_key,
    placement_version
  )
  values (
    p_user_id,
    p_idempotency_key,
    p_placement_question_set_id,
    question_set_record.language_code,
    question_set_record.objective_key,
    question_set_record.placement_version
  )
  returning * into inserted_session;

  return query
  select
    inserted_session.placement_session_id,
    false,
    inserted_session.session_status;
end;
$function$;

create function private.record_placement_answer(
  p_user_id uuid,
  p_placement_session_id uuid,
  p_placement_question_id uuid,
  p_attempt_number integer,
  p_idempotency_key uuid,
  p_device_id uuid,
  p_device_sequence bigint,
  p_payload_hash text,
  p_answer_payload jsonb,
  p_response_time_ms integer,
  p_client_recorded_at timestamptz
)
returns table (
  placement_answer_id uuid,
  idempotent_replay boolean
)
language plpgsql
security definer
set search_path = pg_catalog, private, public
as $function$
declare
  existing_answer public.placement_answers%rowtype;
  existing_device_answer public.placement_answers%rowtype;
  inserted_answer public.placement_answers%rowtype;
  normalized_hash text;
  session_record public.placement_sessions%rowtype;
begin
  if p_user_id is null
    or p_placement_session_id is null
    or p_placement_question_id is null
    or p_attempt_number is null
    or p_attempt_number not between 1 and 10
    or p_idempotency_key is null
    or p_device_id is null
    or p_device_sequence is null
    or p_device_sequence <= 0
    or p_payload_hash is null
    or p_payload_hash !~* '^[0-9a-f]{64}$'
    or p_answer_payload is null
    or jsonb_typeof(p_answer_payload) <> 'object'
    or pg_column_size(p_answer_payload) > 65536
    or p_response_time_ms is not null
      and p_response_time_ms not between 0 and 7200000 then
    raise exception using
      errcode = '22023',
      message = 'Placement answer input is invalid.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 7202)
  );
  perform private.require_active_learning_account(p_user_id);
  normalized_hash := lower(p_payload_hash);

  select *
  into session_record
  from public.placement_sessions
  where placement_session_id = p_placement_session_id
    and user_id = p_user_id;

  if session_record.placement_session_id is null then
    raise exception using
      errcode = '23514',
      message = 'Placement answers require an owned session.';
  end if;

  select *
  into existing_answer
  from public.placement_answers
  where placement_session_id = p_placement_session_id
    and idempotency_key = p_idempotency_key
  for update;

  if existing_answer.placement_answer_id is not null then
    if existing_answer.placement_question_id <> p_placement_question_id
      or existing_answer.attempt_number <> p_attempt_number
      or existing_answer.device_id <> p_device_id
      or existing_answer.device_sequence <> p_device_sequence
      or existing_answer.payload_hash <> normalized_hash
      or existing_answer.answer_payload <> p_answer_payload
      or existing_answer.response_time_ms is distinct from p_response_time_ms
      or existing_answer.client_recorded_at is distinct from p_client_recorded_at then
      raise exception using
        errcode = '22023',
        message = 'Placement answer idempotency key was reused with another payload.';
    end if;

    return query
    select existing_answer.placement_answer_id, true;
    return;
  end if;

  perform private.require_visible_placement_question_set(
    session_record.placement_question_set_id
  );

  select *
  into session_record
  from public.placement_sessions
  where placement_session_id = p_placement_session_id
    and user_id = p_user_id
  for update;

  if session_record.placement_session_id is null
    or session_record.session_status <> 'draft' then
    raise exception using
      errcode = '23514',
      message = 'New placement answers require an owned draft session.';
  end if;

  select *
  into existing_device_answer
  from public.placement_answers
  where placement_session_id = p_placement_session_id
    and device_id = p_device_id
    and device_sequence = p_device_sequence
  for update;

  if existing_device_answer.placement_answer_id is not null then
    raise exception using
      errcode = '22023',
      message = 'Device sequence was already used for another placement answer.';
  end if;

  if not exists (
    select 1
    from public.placement_questions
    where placement_question_set_id = session_record.placement_question_set_id
      and placement_question_id = p_placement_question_id
      and status = 'published'
  ) then
    raise exception using
      errcode = 'P0002',
      message = 'Placement question is not available in this session.';
  end if;

  insert into public.placement_answers (
    user_id,
    placement_session_id,
    placement_question_set_id,
    placement_question_id,
    attempt_number,
    idempotency_key,
    device_id,
    device_sequence,
    payload_hash,
    answer_payload,
    response_time_ms,
    client_recorded_at
  )
  values (
    p_user_id,
    p_placement_session_id,
    session_record.placement_question_set_id,
    p_placement_question_id,
    p_attempt_number,
    p_idempotency_key,
    p_device_id,
    p_device_sequence,
    normalized_hash,
    p_answer_payload,
    p_response_time_ms,
    p_client_recorded_at
  )
  returning * into inserted_answer;

  return query
  select inserted_answer.placement_answer_id, false;
end;
$function$;

create function private.submit_placement_session(
  p_user_id uuid,
  p_placement_session_id uuid
)
returns public.placement_sessions
language plpgsql
security definer
set search_path = pg_catalog, private, public
as $function$
declare
  session_record public.placement_sessions%rowtype;
begin
  if p_user_id is null or p_placement_session_id is null then
    raise exception using
      errcode = '22023',
      message = 'Placement submission input is invalid.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 7202)
  );
  perform private.require_active_learning_account(p_user_id);

  select *
  into session_record
  from public.placement_sessions
  where placement_session_id = p_placement_session_id
    and user_id = p_user_id;

  if session_record.placement_session_id is null then
    raise exception using
      errcode = 'P0002',
      message = 'Placement session is not available to this learner.';
  end if;

  if session_record.session_status in ('submitted', 'scored') then
    return session_record;
  end if;

  if session_record.session_status <> 'draft' then
    raise exception using
      errcode = '23514',
      message = 'Only a draft placement session may be submitted.';
  end if;

  perform private.require_visible_placement_question_set(
    session_record.placement_question_set_id
  );

  select *
  into session_record
  from public.placement_sessions
  where placement_session_id = p_placement_session_id
    and user_id = p_user_id
  for update;

  if session_record.placement_session_id is null then
    raise exception using
      errcode = 'P0002',
      message = 'Placement session is not available to this learner.';
  end if;

  if session_record.session_status in ('submitted', 'scored') then
    return session_record;
  end if;

  if session_record.session_status <> 'draft' then
    raise exception using
      errcode = '23514',
      message = 'Only a draft placement session may be submitted.';
  end if;

  if not exists (
    select 1
    from public.placement_answers
    where placement_session_id = p_placement_session_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'A placement session requires at least one answer before submission.';
  end if;

  update public.placement_sessions
  set
    session_status = 'submitted',
    submitted_at = pg_catalog.clock_timestamp()
  where placement_session_id = p_placement_session_id
  returning * into session_record;

  return session_record;
end;
$function$;

create function private.score_placement_session(
  p_placement_session_id uuid,
  p_recommended_level_code text,
  p_confidence numeric,
  p_score_summary jsonb
)
returns public.placement_sessions
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  operation_now timestamptz;
  session_record public.placement_sessions%rowtype;
begin
  if p_placement_session_id is null
    or p_recommended_level_code is null
    or char_length(btrim(p_recommended_level_code)) not between 1 and 32
    or p_confidence is null
    or p_confidence < 0
    or p_confidence > 1
    or p_confidence <> round(p_confidence, 3)
    or p_score_summary is null
    or jsonb_typeof(p_score_summary) <> 'object'
    or pg_column_size(p_score_summary) > 60000 then
    raise exception using
      errcode = '22023',
      message = 'Placement score input is invalid.';
  end if;

  select *
  into session_record
  from public.placement_sessions
  where placement_session_id = p_placement_session_id;

  if session_record.placement_session_id is null then
    raise exception using
      errcode = 'P0002',
      message = 'Placement session was not found.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(session_record.user_id::text, 7202)
  );

  select *
  into session_record
  from public.placement_sessions
  where placement_session_id = p_placement_session_id
  for update;

  if session_record.placement_session_id is null then
    raise exception using
      errcode = 'P0002',
      message = 'Placement session was not found.';
  end if;

  perform private.require_active_learning_account(session_record.user_id);

  if session_record.session_status = 'scored' then
    if session_record.recommended_level_code = btrim(p_recommended_level_code)
      and session_record.confidence = p_confidence
      and session_record.score_summary = p_score_summary then
      return session_record;
    end if;

    raise exception using
      errcode = '22023',
      message = 'Placement session was already scored with a different result.';
  end if;

  if session_record.session_status <> 'submitted' then
    raise exception using
      errcode = '23514',
      message = 'Only submitted placement sessions may be scored.';
  end if;

  if not exists (
    select 1
    from public.level_definitions
    where language_code = session_record.language_code
      and level_code = btrim(p_recommended_level_code)
  ) then
    raise exception using
      errcode = '22023',
      message = 'Recommended placement level does not belong to the session language.';
  end if;

  operation_now := pg_catalog.clock_timestamp();

  update public.placement_sessions
  set
    session_status = 'scored',
    recommended_level_code = btrim(p_recommended_level_code),
    confidence = p_confidence,
    score_summary = p_score_summary,
    scored_at = operation_now,
    completed_at = operation_now
  where placement_session_id = p_placement_session_id
  returning * into session_record;

  insert into public.learner_proficiency_snapshots (
    user_id,
    placement_session_id,
    language_code,
    level_code,
    objective_key,
    evidence_source,
    confidence,
    evidence,
    created_at
  )
  values (
    session_record.user_id,
    session_record.placement_session_id,
    session_record.language_code,
    session_record.recommended_level_code,
    session_record.objective_key,
    'placement',
    session_record.confidence,
    jsonb_build_object(
      'placementSessionId',
      session_record.placement_session_id,
      'scoreSummary',
      session_record.score_summary,
      'claim',
      'internal-placement-recommendation'
    ),
    operation_now
  )
  on conflict (placement_session_id)
    where placement_session_id is not null
    do nothing;

  return session_record;
end;
$function$;

-- The worker receives the answer key only after a learner has submitted a
-- session. Learner roles cannot call this function or select scoring_rubric.
create function private.get_placement_scoring_input(p_placement_session_id uuid)
returns table (
  placement_session_id uuid,
  language_code text,
  objective_key text,
  placement_version text,
  placement_question_id uuid,
  question_type text,
  scoring_rubric jsonb,
  answer_payload jsonb,
  attempt_number integer
)
language plpgsql
security definer
set search_path = pg_catalog, private, public
as $function$
declare
  session_record public.placement_sessions%rowtype;
  session_user_id uuid;
begin
  if p_placement_session_id is null then
    raise exception using
      errcode = '22023',
      message = 'Placement scoring input requires a session identifier.';
  end if;

  select sessions.user_id
  into session_user_id
  from public.placement_sessions as sessions
  where sessions.placement_session_id = p_placement_session_id;

  if session_user_id is null then
    raise exception using
      errcode = 'P0002',
      message = 'Placement session was not found.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(session_user_id::text, 7202)
  );

  select *
  into session_record
  from public.placement_sessions as sessions
  where sessions.placement_session_id = p_placement_session_id
  for update;

  if session_record.placement_session_id is null then
    raise exception using
      errcode = 'P0002',
      message = 'Placement session was not found.';
  end if;

  perform private.require_active_learning_account(session_record.user_id);

  if session_record.session_status <> 'submitted' then
    raise exception using
      errcode = '23514',
      message = 'Only submitted placement sessions may be prepared for scoring.';
  end if;

  return query
  select
    session_record.placement_session_id,
    session_record.language_code,
    session_record.objective_key,
    session_record.placement_version,
    questions.placement_question_id,
    questions.question_type,
    questions.scoring_rubric,
    answers.answer_payload,
    answers.attempt_number
  from public.placement_answers as answers
  join public.placement_questions as questions
    on questions.placement_question_set_id = answers.placement_question_set_id
    and questions.placement_question_id = answers.placement_question_id
  where answers.placement_session_id = session_record.placement_session_id
  order by questions.sequence, answers.attempt_number;
end;
$function$;

create function private.enroll_learner_in_release(
  p_user_id uuid,
  p_content_release_id text
)
returns public.learner_enrollments
language plpgsql
security definer
set search_path = pg_catalog, private, public
as $function$
declare
  enrollment_record public.learner_enrollments%rowtype;
  release_path_id uuid;
begin
  if p_user_id is null
    or p_content_release_id is null
    or p_content_release_id !~ '^[a-z0-9][a-z0-9-]{1,118}$' then
    raise exception using
      errcode = '22023',
      message = 'Enrollment input is invalid.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 7201)
  );
  perform private.require_active_learning_account(p_user_id);
  release_path_id := private.require_visible_learning_release(p_content_release_id);

  select *
  into enrollment_record
  from public.learner_enrollments
  where user_id = p_user_id
    and path_id = release_path_id
    and content_release_id = p_content_release_id
  for update;

  if enrollment_record.enrollment_id is not null then
    if enrollment_record.enrollment_state = 'active' then
      return enrollment_record;
    end if;

    raise exception using
      errcode = '23514',
      message = 'An inactive enrollment requires an explicit lifecycle transition.';
  end if;

  insert into public.learner_enrollments (
    user_id,
    path_id,
    content_release_id
  )
  values (
    p_user_id,
    release_path_id,
    p_content_release_id
  )
  returning * into enrollment_record;

  return enrollment_record;
end;
$function$;

create function private.initialize_review_item(
  p_user_id uuid,
  p_content_release_id text,
  p_activity_id text,
  p_source_item_key text
)
returns public.review_items
language plpgsql
security definer
set search_path = pg_catalog, private, public
as $function$
declare
  item_record public.review_items%rowtype;
  release_path_id uuid;
begin
  if p_user_id is null
    or p_content_release_id is null
    or p_activity_id is null
    or p_source_item_key is null
    or p_source_item_key !~ '^[a-z0-9][a-z0-9-]{1,118}$' then
    raise exception using
      errcode = '22023',
      message = 'Review item input is invalid.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 7204)
  );
  perform private.require_active_learning_account(p_user_id);
  release_path_id := private.require_visible_learning_release(p_content_release_id);
  perform private.require_active_release_enrollment(
    p_user_id,
    p_content_release_id,
    release_path_id
  );

  if not exists (
    select 1
    from public.activities
    where content_release_id = p_content_release_id
      and activity_id = p_activity_id
      and status = 'published'
  ) then
    raise exception using
      errcode = 'P0002',
      message = 'Review source activity is not available.';
  end if;

  insert into public.review_items (
    user_id,
    content_release_id,
    activity_id,
    source_item_key
  )
  values (
    p_user_id,
    p_content_release_id,
    p_activity_id,
    p_source_item_key
  )
  on conflict (user_id, content_release_id, activity_id, source_item_key)
    do update set source_item_key = excluded.source_item_key
  returning * into item_record;

  return item_record;
end;
$function$;

create or replace function private.prevent_mutation_of_used_content_provenance()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(old.provenance_id::text, 7306)
  );

  if exists (
    select 1
    from public.content_releases
    where provenance_id = old.provenance_id
      and release_status in ('published', 'archived')
  )
    or exists (
      select 1
      from public.content_units
      where provenance_id = old.provenance_id
        and status in ('published', 'archived')
    )
    or exists (
      select 1
      from public.lessons
      where provenance_id = old.provenance_id
        and status in ('published', 'archived')
    )
    or exists (
      select 1
      from public.activities
      where provenance_id = old.provenance_id
        and status in ('published', 'archived')
    )
    or exists (
      select 1
      from public.placement_question_sets
      where provenance_id = old.provenance_id
        and status in ('published', 'archived')
    )
    or exists (
      select 1
      from public.placement_questions
      where provenance_id = old.provenance_id
        and status in ('published', 'archived')
    ) then
    raise exception using
      errcode = '23514',
      message = 'Provenance attached to published content is immutable.';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$function$;

create function private.archive_learning_state_for_content_release()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  if old.release_status = 'published' and new.release_status = 'archived' then
    update public.review_items
    set
      state = 'suspended',
      updated_at = pg_catalog.clock_timestamp()
    where content_release_id = new.content_release_id
      and state <> 'suspended';

    update public.learner_enrollments
    set enrollment_state = 'archived'
    where content_release_id = new.content_release_id
      and enrollment_state in ('active', 'paused');
  end if;

  return new;
end;
$function$;

create function private.purge_learner_learning_data(
  p_request_id uuid,
  p_expected_transition_version bigint,
  p_worker_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, private, public
as $function$
declare
  activity_attempt_count integer;
  activity_completion_count integer;
  enrollment_count integer;
  event_cursor_count integer;
  lesson_progress_count integer;
  placement_answer_count integer;
  placement_session_count integer;
  proficiency_snapshot_count integer;
  purge_counts jsonb;
  purge_receipt private.learning_data_purge_receipts%rowtype;
  request_record public.data_subject_requests%rowtype;
  review_event_count integer;
  review_item_count integer;
  subject_user_id uuid;
begin
  if p_request_id is null
    or p_expected_transition_version is null
    or p_expected_transition_version < 1
    or p_worker_id is null then
    raise exception using
      errcode = '22023',
      message = 'Learning data purge input is invalid.';
  end if;

  select *
  into purge_receipt
  from private.learning_data_purge_receipts
  where request_id = p_request_id;

  if purge_receipt.request_id is not null then
    return purge_receipt.purge_counts;
  end if;

  select user_id
  into subject_user_id
  from public.data_subject_requests
  where request_id = p_request_id;

  if subject_user_id is null then
    raise exception using
      errcode = 'P0002',
      message = 'Deletion request was not found.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(subject_user_id::text, 7201)
  );
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(subject_user_id::text, 7202)
  );
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(subject_user_id::text, 7203)
  );
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(subject_user_id::text, 7204)
  );

  select *
  into purge_receipt
  from private.learning_data_purge_receipts
  where request_id = p_request_id;

  if purge_receipt.request_id is not null then
    return purge_receipt.purge_counts;
  end if;

  select *
  into request_record
  from public.data_subject_requests
  where request_id = p_request_id
  for update;

  if request_record.request_id is null
    or request_record.user_id <> subject_user_id
    or request_record.request_kind <> 'deletion'
    or request_record.status <> 'processing'
    or request_record.transition_version <> p_expected_transition_version
    or request_record.worker_claimed_by is distinct from p_worker_id
    or request_record.lease_expires_at <= pg_catalog.clock_timestamp() then
    raise exception using
      errcode = 'P0001',
      message = 'Deletion request is not authorized for learning data purge.';
  end if;

  perform 1
  from public.profiles
  where user_id = subject_user_id
    and account_state = 'pending_deletion'
    and revoked_at is not null
    and role_epoch = request_record.freeze_role_epoch
  for update;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'Learner account is not frozen for the authorized deletion request.';
  end if;

  insert into private.learning_data_purge_operations (
    request_id,
    user_id,
    worker_id,
    transaction_id
  )
  values (
    p_request_id,
    subject_user_id,
    p_worker_id,
    pg_catalog.txid_current()
  );

  delete from public.review_events where user_id = subject_user_id;
  get diagnostics review_event_count = row_count;

  delete from private.learner_event_cursors where user_id = subject_user_id;
  get diagnostics event_cursor_count = row_count;

  delete from public.review_items where user_id = subject_user_id;
  get diagnostics review_item_count = row_count;

  delete from public.learner_activity_completions where user_id = subject_user_id;
  get diagnostics activity_completion_count = row_count;

  delete from public.learner_lesson_progress where user_id = subject_user_id;
  get diagnostics lesson_progress_count = row_count;

  delete from public.learner_activity_attempts where user_id = subject_user_id;
  get diagnostics activity_attempt_count = row_count;

  delete from public.placement_answers where user_id = subject_user_id;
  get diagnostics placement_answer_count = row_count;

  delete from public.learner_proficiency_snapshots where user_id = subject_user_id;
  get diagnostics proficiency_snapshot_count = row_count;

  delete from public.placement_sessions where user_id = subject_user_id;
  get diagnostics placement_session_count = row_count;

  delete from public.learner_enrollments where user_id = subject_user_id;
  get diagnostics enrollment_count = row_count;

  purge_counts := jsonb_build_object(
    'activityAttempts',
    activity_attempt_count,
    'activityCompletions',
    activity_completion_count,
    'enrollments',
    enrollment_count,
    'eventCursors',
    event_cursor_count,
    'lessonProgress',
    lesson_progress_count,
    'placementAnswers',
    placement_answer_count,
    'placementSessions',
    placement_session_count,
    'proficiencySnapshots',
    proficiency_snapshot_count,
    'reviewEvents',
    review_event_count,
    'reviewItems',
    review_item_count
  );

  insert into private.learning_data_purge_receipts (
    request_id,
    user_id,
    worker_id,
    purge_counts
  )
  values (
    p_request_id,
    subject_user_id,
    p_worker_id,
    purge_counts
  );

  delete from private.learning_data_purge_operations
  where request_id = p_request_id;

  return purge_counts;
end;
$function$;

create function private.require_learning_data_purge_before_deletion_completion()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, private
as $function$
begin
  if old.request_kind = 'deletion'
    and old.status <> 'completed'
    and new.status = 'completed'
    and not exists (
      select 1
      from private.learning_data_purge_receipts
      where request_id = new.request_id
        and user_id = new.user_id
    ) then
    raise exception using
      errcode = '23514',
      message = 'Deletion completion requires a learning data purge receipt.';
  end if;

  return new;
end;
$function$;

create function private.recompute_lesson_progress(
  p_user_id uuid,
  p_content_release_id text,
  p_lesson_id text,
  p_last_activity_at timestamptz
)
returns public.learner_lesson_progress
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  completed_count integer;
  total_count integer;
  next_state text;
  progress_record public.learner_lesson_progress%rowtype;
begin
  select count(*)
  into total_count
  from public.activities
  where content_release_id = p_content_release_id
    and lesson_id = p_lesson_id
    and status = 'published';

  if total_count = 0 then
    raise exception using
      errcode = '23514',
      message = 'A learner lesson cannot progress without published activities.';
  end if;

  select count(*)
  into completed_count
  from public.learner_activity_completions
  join public.activities
    on activities.activity_id = learner_activity_completions.activity_id
    and activities.content_release_id = learner_activity_completions.content_release_id
  where learner_activity_completions.user_id = p_user_id
    and learner_activity_completions.content_release_id = p_content_release_id
    and activities.lesson_id = p_lesson_id;

  next_state := case
    when completed_count >= total_count then 'completed'
    when completed_count > 0 then 'in_progress'
    else 'not_started'
  end;

  insert into public.learner_lesson_progress (
    user_id,
    content_release_id,
    lesson_id,
    completed_activity_count,
    total_activity_count,
    progress_state,
    last_activity_at,
    completed_at
  )
  values (
    p_user_id,
    p_content_release_id,
    p_lesson_id,
    completed_count,
    total_count,
    next_state,
    p_last_activity_at,
    case when next_state = 'completed' then p_last_activity_at else null end
  )
  on conflict (user_id, lesson_id) do update
  set
    completed_activity_count = excluded.completed_activity_count,
    total_activity_count = excluded.total_activity_count,
    progress_state = excluded.progress_state,
    last_activity_at = case
      when public.learner_lesson_progress.last_activity_at is null then excluded.last_activity_at
      when excluded.last_activity_at is null then public.learner_lesson_progress.last_activity_at
      else greatest(public.learner_lesson_progress.last_activity_at, excluded.last_activity_at)
    end,
    completed_at = case
      when excluded.progress_state = 'completed'
        then coalesce(public.learner_lesson_progress.completed_at, excluded.completed_at)
      else null
    end,
    updated_at = clock_timestamp()
  returning * into progress_record;

  return progress_record;
end;
$function$;

create function private.submit_activity_attempt(
  p_user_id uuid,
  p_content_release_id text,
  p_activity_id text,
  p_device_id uuid,
  p_device_sequence bigint,
  p_idempotency_key uuid,
  p_payload_hash text,
  p_response_payload jsonb,
  p_completion_state text,
  p_score numeric,
  p_evaluation_version text,
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
  existing_attempt public.learner_activity_attempts%rowtype;
  existing_device_attempt public.learner_activity_attempts%rowtype;
  inserted_attempt public.learner_activity_attempts%rowtype;
  activity_record public.activities%rowtype;
  active_enrollment_id uuid;
  release_path_id uuid;
  normalized_hash text;
  operation_now timestamptz;
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
    or p_completion_state is null
    or p_completion_state not in ('submitted', 'completed', 'needs_review')
    or p_score is not null and (p_score < 0 or p_score > 1)
    or p_evaluation_version is null
    or char_length(btrim(p_evaluation_version)) not between 1 and 64
    or p_client_timezone is null
    or not exists (select 1 from pg_catalog.pg_timezone_names where name = p_client_timezone) then
    raise exception using
      errcode = '22023',
      message = 'Activity attempt input is invalid.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 7203)
  );

  perform private.require_active_learning_account(p_user_id);

  operation_now := pg_catalog.clock_timestamp();
  normalized_hash := lower(p_payload_hash);

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
      or existing_attempt.completion_state <> p_completion_state
      or existing_attempt.score is distinct from p_score
      or existing_attempt.evaluation_version <> btrim(p_evaluation_version)
      or existing_attempt.reviewed_at_client is distinct from p_reviewed_at_client
      or existing_attempt.client_timezone <> p_client_timezone then
      raise exception using
        errcode = '22023',
        message = 'Activity idempotency key was reused with a different payload.';
    end if;

    select *
    into activity_record
    from public.activities
    where activity_id = existing_attempt.activity_id
      and content_release_id = existing_attempt.content_release_id;

    return query
    select
      existing_attempt.attempt_id,
      true,
      activity_record.lesson_id,
      existing_attempt.completion_state,
      coalesce((
        select lesson_progress.progress_state
        from public.learner_lesson_progress as lesson_progress
        where lesson_progress.user_id = p_user_id
          and lesson_progress.lesson_id = activity_record.lesson_id
      ), 'not_started'),
      coalesce((
        select lesson_progress.completed_activity_count
        from public.learner_lesson_progress as lesson_progress
        where lesson_progress.user_id = p_user_id
          and lesson_progress.lesson_id = activity_record.lesson_id
      ), 0),
      coalesce((
        select lesson_progress.total_activity_count
        from public.learner_lesson_progress as lesson_progress
        where lesson_progress.user_id = p_user_id
          and lesson_progress.lesson_id = activity_record.lesson_id
      ), 0);
    return;
  end if;

  release_path_id := private.require_visible_learning_release(p_content_release_id);
  active_enrollment_id := private.require_active_release_enrollment(
    p_user_id,
    p_content_release_id,
    release_path_id
  );

  select *
  into existing_device_attempt
  from public.learner_activity_attempts
  where user_id = p_user_id
    and device_id = p_device_id
    and device_sequence = p_device_sequence
  for update;

  if existing_device_attempt.attempt_id is not null then
    raise exception using
      errcode = '22023',
      message = 'Device sequence was already used for another activity attempt.';
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

  insert into public.learner_activity_attempts (
    user_id,
    content_release_id,
    activity_id,
    device_id,
    device_sequence,
    idempotency_key,
    payload_hash,
    response_payload,
    completion_state,
    score,
    evaluation_version,
    reviewed_at_client,
    client_timezone,
    completed_at
  )
  values (
    p_user_id,
    p_content_release_id,
    p_activity_id,
    p_device_id,
    p_device_sequence,
    p_idempotency_key,
    normalized_hash,
    p_response_payload,
    p_completion_state,
    p_score,
    btrim(p_evaluation_version),
    p_reviewed_at_client,
    p_client_timezone,
    case when p_completion_state = 'completed' then operation_now else null end
  )
  returning * into inserted_attempt;

  if p_completion_state = 'completed' then
    insert into public.learner_activity_completions (
      user_id,
      content_release_id,
      activity_id,
      first_attempt_id,
      completed_at
    )
    values (
      p_user_id,
      p_content_release_id,
      p_activity_id,
      inserted_attempt.attempt_id,
      operation_now
    )
    on conflict (user_id, activity_id) do nothing;

    perform private.recompute_lesson_progress(
      p_user_id,
      p_content_release_id,
      activity_record.lesson_id,
      operation_now
    );
  end if;

  update public.learner_enrollments
  set last_activity_at = operation_now
  where enrollment_id = active_enrollment_id;

  return query
  select
    inserted_attempt.attempt_id,
    false,
    activity_record.lesson_id,
    inserted_attempt.completion_state,
    coalesce((
      select lesson_progress.progress_state
      from public.learner_lesson_progress as lesson_progress
      where lesson_progress.user_id = p_user_id
        and lesson_progress.lesson_id = activity_record.lesson_id
    ), 'not_started'),
    coalesce((
      select lesson_progress.completed_activity_count
      from public.learner_lesson_progress as lesson_progress
      where lesson_progress.user_id = p_user_id
        and lesson_progress.lesson_id = activity_record.lesson_id
    ), 0),
    coalesce((
      select lesson_progress.total_activity_count
      from public.learner_lesson_progress as lesson_progress
      where lesson_progress.user_id = p_user_id
        and lesson_progress.lesson_id = activity_record.lesson_id
    ), 0);
end;
$function$;

create function private.submit_review_event(
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

create trigger enforce_placement_question_set_lifecycle_before_write
before insert or update or delete on public.placement_question_sets
for each row execute function private.enforce_placement_question_set_lifecycle();

create trigger enforce_placement_question_lifecycle_before_write
before insert or update or delete on public.placement_questions
for each row execute function private.enforce_placement_question_lifecycle();

create trigger enforce_placement_session_lifecycle_before_update
before update on public.placement_sessions
for each row execute function private.enforce_placement_session_lifecycle();

create trigger abandon_draft_placement_sessions_after_question_set_archive
after update on public.placement_question_sets
for each row execute function private.abandon_draft_placement_sessions_for_archived_question_set();

create trigger enforce_learner_enrollment_lifecycle_before_update
before update on public.learner_enrollments
for each row execute function private.enforce_learner_enrollment_lifecycle();

create trigger enforce_review_item_identity_before_update
before update on public.review_items
for each row execute function private.enforce_review_item_identity();

create trigger archive_learning_state_after_content_release
after update of release_status on public.content_releases
for each row execute function private.archive_learning_state_for_content_release();

create trigger require_learning_data_purge_before_deletion_completion
before update on public.data_subject_requests
for each row execute function private.require_learning_data_purge_before_deletion_completion();

create trigger prevent_placement_answer_update
before update on public.placement_answers
for each row execute function private.prevent_learner_history_mutation();

create trigger prevent_placement_answer_delete
before delete on public.placement_answers
for each row execute function private.prevent_learner_history_mutation();

create trigger prevent_placement_session_delete
before delete on public.placement_sessions
for each row execute function private.prevent_learner_history_mutation();

create trigger prevent_learner_enrollment_delete
before delete on public.learner_enrollments
for each row execute function private.prevent_learner_history_mutation();

create trigger prevent_learner_lesson_progress_delete
before delete on public.learner_lesson_progress
for each row execute function private.prevent_learner_history_mutation();

create trigger prevent_review_item_delete
before delete on public.review_items
for each row execute function private.prevent_learner_history_mutation();

create trigger prevent_activity_attempt_update
before update on public.learner_activity_attempts
for each row execute function private.prevent_learner_history_mutation();

create trigger prevent_activity_attempt_delete
before delete on public.learner_activity_attempts
for each row execute function private.prevent_learner_history_mutation();

create trigger prevent_activity_completion_update
before update on public.learner_activity_completions
for each row execute function private.prevent_learner_history_mutation();

create trigger prevent_activity_completion_delete
before delete on public.learner_activity_completions
for each row execute function private.prevent_learner_history_mutation();

create trigger prevent_proficiency_snapshot_update
before update on public.learner_proficiency_snapshots
for each row execute function private.prevent_learner_history_mutation();

create trigger prevent_proficiency_snapshot_delete
before delete on public.learner_proficiency_snapshots
for each row execute function private.prevent_learner_history_mutation();

create trigger prevent_review_event_update
before update on public.review_events
for each row execute function private.prevent_learner_history_mutation();

create trigger prevent_review_event_delete
before delete on public.review_events
for each row execute function private.prevent_learner_history_mutation();

alter table public.learner_enrollments enable row level security;
alter table public.placement_question_sets enable row level security;
alter table public.placement_questions enable row level security;
alter table public.placement_sessions enable row level security;
alter table public.placement_answers enable row level security;
alter table public.learner_activity_attempts enable row level security;
alter table public.learner_activity_completions enable row level security;
alter table public.learner_lesson_progress enable row level security;
alter table public.learner_proficiency_snapshots enable row level security;
alter table public.review_items enable row level security;
alter table public.review_events enable row level security;
alter table private.learner_event_cursors enable row level security;
alter table private.learning_data_purge_operations enable row level security;
alter table private.learning_data_purge_receipts enable row level security;

revoke all on table public.learner_enrollments from public, anon, authenticated, service_role;
revoke all on table public.placement_question_sets from public, anon, authenticated, service_role;
revoke all on table public.placement_questions from public, anon, authenticated, service_role;
revoke all on table public.placement_sessions from public, anon, authenticated, service_role;
revoke all on table public.placement_answers from public, anon, authenticated, service_role;
revoke all on table public.learner_activity_attempts from public, anon, authenticated, service_role;
revoke all on table public.learner_activity_completions from public, anon, authenticated, service_role;
revoke all on table public.learner_lesson_progress from public, anon, authenticated, service_role;
revoke all on table public.learner_proficiency_snapshots from public, anon, authenticated, service_role;
revoke all on table public.review_items from public, anon, authenticated, service_role;
revoke all on table public.review_events from public, anon, authenticated, service_role;
revoke all on table private.learner_event_cursors from public, anon, authenticated, service_role;
revoke all on table private.learning_data_purge_operations
  from public, anon, authenticated, service_role;
revoke all on table private.learning_data_purge_receipts
  from public, anon, authenticated, service_role;

grant select on table public.learner_enrollments to authenticated;
grant select on table public.placement_question_sets to authenticated;
-- Learners need prompts but must never receive answer keys or rubrics. Keep
-- the table RLS policy for row visibility and use column privileges for the
-- learner-safe projection.
grant select (
  placement_question_id,
  placement_question_set_id,
  question_key,
  sequence,
  question_type,
  prompt_payload
) on table public.placement_questions to authenticated;
grant select on table public.placement_sessions to authenticated;
grant select on table public.placement_answers to authenticated;
grant select on table public.learner_activity_attempts to authenticated;
grant select on table public.learner_activity_completions to authenticated;
grant select on table public.learner_lesson_progress to authenticated;
grant select on table public.learner_proficiency_snapshots to authenticated;
grant select on table public.review_items to authenticated;
grant select on table public.review_events to authenticated;

create policy "internal security definer: manage learner enrollments"
on public.learner_enrollments
for all
to app_security_definer
using (true)
with check (true);

create policy "internal security definer: manage placement question sets"
on public.placement_question_sets
for all
to app_security_definer
using (true)
with check (true);

create policy "internal security definer: manage placement questions"
on public.placement_questions
for all
to app_security_definer
using (true)
with check (true);

create policy "internal security definer: manage placement sessions"
on public.placement_sessions
for all
to app_security_definer
using (true)
with check (true);

create policy "internal security definer: manage placement answers"
on public.placement_answers
for all
to app_security_definer
using (true)
with check (true);

create policy "internal security definer: manage learner activity attempts"
on public.learner_activity_attempts
for all
to app_security_definer
using (true)
with check (true);

create policy "internal security definer: manage learner activity completions"
on public.learner_activity_completions
for all
to app_security_definer
using (true)
with check (true);

create policy "internal security definer: manage learner lesson progress"
on public.learner_lesson_progress
for all
to app_security_definer
using (true)
with check (true);

create policy "internal security definer: manage learner proficiency snapshots"
on public.learner_proficiency_snapshots
for all
to app_security_definer
using (true)
with check (true);

create policy "internal security definer: manage review items"
on public.review_items
for all
to app_security_definer
using (true)
with check (true);

create policy "internal security definer: manage review events"
on public.review_events
for all
to app_security_definer
using (true)
with check (true);

create policy "internal security definer: manage learner event cursors"
on private.learner_event_cursors
for all
to app_security_definer
using (true)
with check (true);

create policy "internal: manage learning purge operations"
on private.learning_data_purge_operations
for all
to app_security_definer
using (true)
with check (true);

create policy "internal security definer: manage learning data purge receipts"
on private.learning_data_purge_receipts
for all
to app_security_definer
using (true)
with check (true);

create policy "learner enrollments: select own active records"
on public.learner_enrollments
for select
to authenticated
using (
  user_id = (select auth.uid())
  and private.is_active_account((select auth.uid()))
);

create policy "placement question sets: select published active catalog"
on public.placement_question_sets
for select
to authenticated
using (
  private.is_active_account((select auth.uid()))
  and status = 'published'
  and private.is_visible_language_pack(language_code)
);

create policy "placement questions: select published active catalog"
on public.placement_questions
for select
to authenticated
using (
  private.is_active_account((select auth.uid()))
  and status = 'published'
  and exists (
    select 1
    from public.placement_question_sets
    where placement_question_sets.placement_question_set_id =
      placement_questions.placement_question_set_id
      and placement_question_sets.status = 'published'
      and private.is_visible_language_pack(placement_question_sets.language_code)
  )
);

create policy "placement sessions: select own active records"
on public.placement_sessions
for select
to authenticated
using (
  user_id = (select auth.uid())
  and private.is_active_account((select auth.uid()))
);

create policy "placement answers: select own active records"
on public.placement_answers
for select
to authenticated
using (
  user_id = (select auth.uid())
  and private.is_active_account((select auth.uid()))
);

create policy "activity attempts: select own active records"
on public.learner_activity_attempts
for select
to authenticated
using (
  user_id = (select auth.uid())
  and private.is_active_account((select auth.uid()))
);

create policy "activity completions: select own active records"
on public.learner_activity_completions
for select
to authenticated
using (
  user_id = (select auth.uid())
  and private.is_active_account((select auth.uid()))
);

create policy "lesson progress: select own active records"
on public.learner_lesson_progress
for select
to authenticated
using (
  user_id = (select auth.uid())
  and private.is_active_account((select auth.uid()))
);

create policy "proficiency snapshots: select own active records"
on public.learner_proficiency_snapshots
for select
to authenticated
using (
  user_id = (select auth.uid())
  and private.is_active_account((select auth.uid()))
);

create policy "review items: select own active records"
on public.review_items
for select
to authenticated
using (
  user_id = (select auth.uid())
  and private.is_active_account((select auth.uid()))
);

create policy "review events: select own active records"
on public.review_events
for select
to authenticated
using (
  user_id = (select auth.uid())
  and private.is_active_account((select auth.uid()))
);

grant usage on schema private, public, extensions to app_security_definer;
grant select, insert, update, delete on table public.learner_enrollments to app_security_definer;
grant select, insert, update, delete on table public.placement_question_sets to app_security_definer;
grant select, insert, update, delete on table public.placement_questions to app_security_definer;
grant select, insert, update, delete on table public.placement_sessions to app_security_definer;
grant select, insert, update, delete on table public.placement_answers to app_security_definer;
grant select, insert, update, delete on table public.learner_activity_attempts to app_security_definer;
grant select, insert, update, delete on table public.learner_activity_completions to app_security_definer;
grant select, insert, update, delete on table public.learner_lesson_progress to app_security_definer;
grant select, insert, update, delete on table public.learner_proficiency_snapshots to app_security_definer;
grant select, insert, update, delete on table public.review_items to app_security_definer;
grant select, insert, update, delete on table public.review_events to app_security_definer;
grant select, insert, update, delete on table private.learner_event_cursors to app_security_definer;
grant select, insert, delete on table private.learning_data_purge_operations
  to app_security_definer;
grant select, insert on table private.learning_data_purge_receipts
  to app_security_definer;
grant execute on function private.recompute_lesson_progress(uuid, text, text, timestamptz)
  to app_security_definer;

grant create on schema private to app_security_definer;
grant app_security_definer to postgres;
alter function private.require_active_learning_account(uuid)
  owner to app_security_definer;
alter function private.require_visible_learning_release(text)
  owner to app_security_definer;
alter function private.require_active_release_enrollment(uuid, text, uuid)
  owner to app_security_definer;
alter function private.enforce_learner_enrollment_lifecycle()
  owner to app_security_definer;
alter function private.enforce_review_item_identity()
  owner to app_security_definer;
alter function private.lock_placement_question_set(uuid)
  owner to app_security_definer;
alter function private.enforce_placement_question_set_lifecycle()
  owner to app_security_definer;
alter function private.enforce_placement_question_lifecycle()
  owner to app_security_definer;
alter function private.enforce_placement_session_lifecycle()
  owner to app_security_definer;
alter function private.abandon_draft_placement_sessions_for_archived_question_set()
  owner to app_security_definer;
alter function private.require_visible_placement_question_set(uuid)
  owner to app_security_definer;
alter function private.start_placement_session(uuid, uuid, uuid)
  owner to app_security_definer;
alter function private.record_placement_answer(
  uuid, uuid, uuid, integer, uuid, uuid, bigint, text, jsonb, integer, timestamptz
) owner to app_security_definer;
alter function private.submit_placement_session(uuid, uuid)
  owner to app_security_definer;
alter function private.score_placement_session(uuid, text, numeric, jsonb)
  owner to app_security_definer;
alter function private.get_placement_scoring_input(uuid)
  owner to app_security_definer;
alter function private.enroll_learner_in_release(uuid, text)
  owner to app_security_definer;
alter function private.initialize_review_item(uuid, text, text, text)
  owner to app_security_definer;
alter function private.archive_learning_state_for_content_release()
  owner to app_security_definer;
alter function private.purge_learner_learning_data(uuid, bigint, uuid)
  owner to app_security_definer;
alter function private.require_learning_data_purge_before_deletion_completion()
  owner to app_security_definer;
alter function private.recompute_lesson_progress(uuid, text, text, timestamptz)
  owner to app_security_definer;
alter function private.submit_activity_attempt(
  uuid, text, text, uuid, bigint, uuid, text, jsonb, text, numeric, text, timestamptz, text
) owner to app_security_definer;
alter function private.submit_review_event(
  uuid, uuid, uuid, uuid, bigint, text, text, timestamptz, text
) owner to app_security_definer;
revoke create on schema private from app_security_definer;

grant usage on schema private to app_learning_api_executor, service_role;
grant execute on function private.start_placement_session(uuid, uuid, uuid)
  to app_learning_api_executor;
grant execute on function private.record_placement_answer(
  uuid, uuid, uuid, integer, uuid, uuid, bigint, text, jsonb, integer, timestamptz
) to app_learning_api_executor;
grant execute on function private.submit_placement_session(uuid, uuid)
  to app_learning_api_executor;
grant execute on function private.enroll_learner_in_release(uuid, text)
  to app_learning_api_executor;
grant execute on function private.initialize_review_item(uuid, text, text, text)
  to app_learning_api_executor;
grant execute on function private.submit_activity_attempt(
  uuid, text, text, uuid, bigint, uuid, text, jsonb, text, numeric, text, timestamptz, text
) to app_learning_api_executor;
grant execute on function private.submit_review_event(
  uuid, uuid, uuid, uuid, bigint, text, text, timestamptz, text
) to app_learning_api_executor;

grant execute on function private.score_placement_session(uuid, text, numeric, jsonb)
  to service_role;
grant execute on function private.get_placement_scoring_input(uuid)
  to service_role;
grant execute on function private.purge_learner_learning_data(uuid, bigint, uuid)
  to service_role;

revoke all on function private.prevent_learner_history_mutation() from public, anon, authenticated;
revoke all on function private.require_active_learning_account(uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.require_visible_learning_release(text)
  from public, anon, authenticated, service_role;
revoke all on function private.require_active_release_enrollment(uuid, text, uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.enforce_learner_enrollment_lifecycle()
  from public, anon, authenticated, service_role;
revoke all on function private.enforce_review_item_identity()
  from public, anon, authenticated, service_role;
revoke all on function private.lock_placement_question_set(uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.enforce_placement_question_set_lifecycle()
  from public, anon, authenticated, service_role;
revoke all on function private.enforce_placement_question_lifecycle()
  from public, anon, authenticated, service_role;
revoke all on function private.enforce_placement_session_lifecycle()
  from public, anon, authenticated, service_role;
revoke all on function private.abandon_draft_placement_sessions_for_archived_question_set()
  from public, anon, authenticated, service_role;
revoke all on function private.require_visible_placement_question_set(uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.start_placement_session(uuid, uuid, uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.record_placement_answer(
  uuid, uuid, uuid, integer, uuid, uuid, bigint, text, jsonb, integer, timestamptz
) from public, anon, authenticated, service_role;
revoke all on function private.submit_placement_session(uuid, uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.enroll_learner_in_release(uuid, text)
  from public, anon, authenticated, service_role;
revoke all on function private.initialize_review_item(uuid, text, text, text)
  from public, anon, authenticated, service_role;
revoke all on function private.recompute_lesson_progress(uuid, text, text, timestamptz)
  from public, anon, authenticated, service_role;
revoke all on function private.submit_activity_attempt(
  uuid, text, text, uuid, bigint, uuid, text, jsonb, text, numeric, text, timestamptz, text
) from public, anon, authenticated, service_role;
revoke all on function private.submit_review_event(
  uuid, uuid, uuid, uuid, bigint, text, text, timestamptz, text
) from public, anon, authenticated, service_role;
revoke all on function private.archive_learning_state_for_content_release()
  from public, anon, authenticated, service_role;
revoke all on function private.require_learning_data_purge_before_deletion_completion()
  from public, anon, authenticated, service_role;
revoke all on function private.score_placement_session(uuid, text, numeric, jsonb)
  from public, anon, authenticated;
revoke all on function private.get_placement_scoring_input(uuid)
  from public, anon, authenticated;
revoke all on function private.purge_learner_learning_data(uuid, bigint, uuid)
  from public, anon, authenticated;
