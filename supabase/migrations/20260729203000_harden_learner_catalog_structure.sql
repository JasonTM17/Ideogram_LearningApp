-- Learner catalog records must cross one explicit public boundary. RLS alone
-- cannot prevent the Supabase Data API from exposing newly added source-table
-- columns, so public clients receive a fixed allowlist RPC instead.

grant create on schema private, public to app_security_definer;

create or replace function private.project_learner_catalog_text(p_value jsonb)
returns jsonb
language sql
immutable
set search_path = pg_catalog
as $function$
  select case
    when jsonb_typeof(p_value) = 'string' then p_value
    else 'null'::jsonb
  end;
$function$;

create or replace function private.project_learner_catalog_example(p_example jsonb)
returns jsonb
language sql
immutable
strict
set search_path = pg_catalog, private
as $function$
  select case
    when jsonb_typeof(p_example) = 'object' then jsonb_build_object(
      'translationVietnamese',
        private.project_learner_catalog_text(p_example -> 'translationVietnamese'),
      'value', private.project_learner_catalog_text(p_example -> 'value')
    )
    else 'null'::jsonb
  end;
$function$;

create or replace function private.project_learner_catalog_examples(p_examples jsonb)
returns jsonb
language sql
immutable
strict
set search_path = pg_catalog, private
as $function$
  select coalesce(
    jsonb_agg(
      private.project_learner_catalog_example(example.value)
      order by example.ordinality
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(
    case
      when jsonb_typeof(p_examples) = 'array' then p_examples
      else '[]'::jsonb
    end
  ) with ordinality as example(value, ordinality);
$function$;

create or replace function private.project_learner_catalog_options(p_options jsonb)
returns jsonb
language sql
immutable
strict
set search_path = pg_catalog, private
as $function$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'optionId', private.project_learner_catalog_text(option.value -> 'optionId'),
        'text', private.project_learner_catalog_text(option.value -> 'text')
      )
      order by option.ordinality
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(
    case
      when jsonb_typeof(p_options) = 'array' then p_options
      else '[]'::jsonb
    end
  ) with ordinality as option(value, ordinality);
$function$;

create or replace function private.project_learner_catalog_questions(p_questions jsonb)
returns jsonb
language sql
immutable
strict
set search_path = pg_catalog, private
as $function$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'questionId', private.project_learner_catalog_text(question.value -> 'questionId'),
        'prompt', private.project_learner_catalog_text(question.value -> 'prompt'),
        'options', private.project_learner_catalog_options(question.value -> 'options')
      )
      order by question.ordinality
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(
    case
      when jsonb_typeof(p_questions) = 'array' then p_questions
      else '[]'::jsonb
    end
  ) with ordinality as question(value, ordinality);
$function$;

create or replace function private.project_learner_catalog_vocabulary_entries(p_entries jsonb)
returns jsonb
language sql
immutable
strict
set search_path = pg_catalog, private
as $function$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'term', private.project_learner_catalog_text(entry.value -> 'term'),
        'reading', private.project_learner_catalog_text(entry.value -> 'reading'),
        'meaningVietnamese',
          private.project_learner_catalog_text(entry.value -> 'meaningVietnamese'),
        'example', private.project_learner_catalog_example(entry.value -> 'example')
      )
      order by entry.ordinality
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(
    case
      when jsonb_typeof(p_entries) = 'array' then p_entries
      else '[]'::jsonb
    end
  ) with ordinality as entry(value, ordinality);
$function$;

create or replace function private.project_learner_catalog_payload(
  p_activity_type text,
  p_payload jsonb
)
returns jsonb
language plpgsql
immutable
strict
set search_path = pg_catalog, private
as $function$
begin
  case p_activity_type
    when 'grammar' then
      return jsonb_build_object(
        'examples', private.project_learner_catalog_examples(p_payload -> 'examples'),
        'explanationVietnamese',
          private.project_learner_catalog_text(p_payload -> 'explanationVietnamese'),
        'grammarPoint', private.project_learner_catalog_text(p_payload -> 'grammarPoint')
      );
    when 'listening' then
      return jsonb_build_object(
        'audioAssetPath', private.project_learner_catalog_text(p_payload -> 'audioAssetPath'),
        'audioProductionStatus',
          private.project_learner_catalog_text(p_payload -> 'audioProductionStatus'),
        'questions', private.project_learner_catalog_questions(p_payload -> 'questions'),
        'transcript', private.project_learner_catalog_text(p_payload -> 'transcript')
      );
    when 'objective_quiz' then
      return jsonb_build_object(
        'questions', private.project_learner_catalog_questions(p_payload -> 'questions')
      );
    when 'reading' then
      return jsonb_build_object(
        'questions', private.project_learner_catalog_questions(p_payload -> 'questions'),
        'text', private.project_learner_catalog_text(p_payload -> 'text')
      );
    when 'retrieval' then
      return jsonb_build_object(
        'prompt', private.project_learner_catalog_text(p_payload -> 'prompt'),
        'promptVietnamese', private.project_learner_catalog_text(p_payload -> 'promptVietnamese')
      );
    when 'speaking', 'writing' then
      return jsonb_build_object(
        'scenarioVietnamese',
          private.project_learner_catalog_text(p_payload -> 'scenarioVietnamese'),
        'targetPrompt', private.project_learner_catalog_text(p_payload -> 'targetPrompt')
      );
    when 'vocabulary' then
      return jsonb_build_object(
        'entries', private.project_learner_catalog_vocabulary_entries(p_payload -> 'entries')
      );
    else
      raise exception using
        errcode = '22023',
        message = 'Unsupported learner activity type.';
  end case;
end;
$function$;

create function private.learner_catalog_utf16_length(p_value text)
returns integer
language sql
immutable
strict
set search_path = pg_catalog
as $function$
  select coalesce(
    sum(
      case
        when ascii(substring(p_value from character_position for 1)) > 65535 then 2
        else 1
      end
    ),
    0
  )::integer
  from generate_series(1, char_length(p_value)) as character_position;
$function$;

create function private.is_learner_catalog_bounded_string(
  p_value jsonb,
  p_minimum_length integer,
  p_maximum_length integer
)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $function$
  select coalesce(
    jsonb_typeof(p_value) = 'string'
      and private.learner_catalog_utf16_length(p_value #>> '{}')
        between p_minimum_length and p_maximum_length,
    false
  );
$function$;

create function private.is_valid_learner_catalog_example(p_example jsonb)
returns boolean
language sql
immutable
set search_path = pg_catalog, private
as $function$
  select coalesce(
    jsonb_typeof(p_example) = 'object'
      and private.is_learner_catalog_bounded_string(p_example -> 'value', 1, 1000)
      and private.is_learner_catalog_bounded_string(
        p_example -> 'translationVietnamese',
        1,
        1000
      ),
    false
  );
$function$;

create function private.are_valid_learner_catalog_questions(
  p_questions jsonb,
  p_maximum_questions integer
)
returns boolean
language plpgsql
immutable
set search_path = pg_catalog, private
as $function$
declare
  option_record record;
  question_record record;
begin
  if jsonb_typeof(p_questions) is distinct from 'array' then
    return false;
  end if;

  if jsonb_array_length(p_questions) not between 1 and p_maximum_questions then
    return false;
  end if;

  for question_record in
    select question.value
    from jsonb_array_elements(p_questions) as question(value)
  loop
    if jsonb_typeof(question_record.value) is distinct from 'object'
      or not private.is_learner_catalog_bounded_string(
        question_record.value -> 'questionId',
        2,
        80
      )
      or (question_record.value ->> 'questionId')
        !~ '^[a-z0-9-]{2,80}$'
      or not private.is_learner_catalog_bounded_string(
        question_record.value -> 'prompt',
        1,
        2000
      )
      or jsonb_typeof(question_record.value -> 'options') is distinct from 'array' then
      return false;
    end if;

    if jsonb_array_length(question_record.value -> 'options') not between 2 and 6 then
      return false;
    end if;

    for option_record in
      select option.value
      from jsonb_array_elements(question_record.value -> 'options') as option(value)
    loop
      if jsonb_typeof(option_record.value) is distinct from 'object'
        or not private.is_learner_catalog_bounded_string(
          option_record.value -> 'optionId',
          2,
          80
        )
        or (option_record.value ->> 'optionId')
          !~ '^[a-z0-9-]{2,80}$'
        or not private.is_learner_catalog_bounded_string(
          option_record.value -> 'text',
          1,
          500
        ) then
        return false;
      end if;
    end loop;
  end loop;

  return true;
end;
$function$;

create function private.require_learner_catalog_activity_payload(
  p_activity_type text,
  p_payload jsonb
)
returns void
language plpgsql
immutable
strict
set search_path = pg_catalog, private
as $function$
declare
  entry_record record;
  example_record record;
begin
  if jsonb_typeof(p_payload) is distinct from 'object' then
    raise exception using
      errcode = '23514',
      message = 'Published activities require a valid bounded learner payload.';
  end if;

  case p_activity_type
    when 'grammar' then
      if not private.is_learner_catalog_bounded_string(
        p_payload -> 'explanationVietnamese',
        1,
        4000
      )
        or not private.is_learner_catalog_bounded_string(
          p_payload -> 'grammarPoint',
          1,
          200
        )
        or jsonb_typeof(p_payload -> 'examples') is distinct from 'array' then
        raise exception using
          errcode = '23514',
          message = 'Published activities require a valid bounded learner payload.';
      end if;

      if jsonb_array_length(p_payload -> 'examples') not between 1 and 8 then
        raise exception using
          errcode = '23514',
          message = 'Published activities require a valid bounded learner payload.';
      end if;

      for example_record in
        select example.value
        from jsonb_array_elements(p_payload -> 'examples') as example(value)
      loop
        if not private.is_valid_learner_catalog_example(example_record.value) then
          raise exception using
            errcode = '23514',
            message = 'Published activities require a valid bounded learner payload.';
        end if;
      end loop;

    when 'listening' then
      if not private.is_learner_catalog_bounded_string(
        p_payload -> 'audioAssetPath',
        1,
        500
      )
        or jsonb_typeof(p_payload -> 'audioProductionStatus') is distinct from 'string'
        or (p_payload ->> 'audioProductionStatus') not in ('planned', 'recorded')
        or not private.is_learner_catalog_bounded_string(
          p_payload -> 'transcript',
          1,
          12000
        )
        or not private.are_valid_learner_catalog_questions(
          p_payload -> 'questions',
          12
        )
        then
        raise exception using
          errcode = '23514',
          message = 'Published activities require a valid bounded learner payload.';
      end if;

    when 'objective_quiz' then
      if not private.are_valid_learner_catalog_questions(
        p_payload -> 'questions',
        20
      ) then
        raise exception using
          errcode = '23514',
          message = 'Published activities require a valid bounded learner payload.';
      end if;

    when 'reading' then
      if not private.is_learner_catalog_bounded_string(p_payload -> 'text', 1, 12000)
        or not private.are_valid_learner_catalog_questions(
          p_payload -> 'questions',
          12
        ) then
        raise exception using
          errcode = '23514',
          message = 'Published activities require a valid bounded learner payload.';
      end if;

    when 'retrieval' then
      if not private.is_learner_catalog_bounded_string(p_payload -> 'prompt', 1, 2000)
        or not private.is_learner_catalog_bounded_string(
          p_payload -> 'promptVietnamese',
          1,
          2000
        ) then
        raise exception using
          errcode = '23514',
          message = 'Published activities require a valid bounded learner payload.';
      end if;

    when 'speaking', 'writing' then
      if not private.is_learner_catalog_bounded_string(
        p_payload -> 'scenarioVietnamese',
        1,
        2000
      )
        or not private.is_learner_catalog_bounded_string(
          p_payload -> 'targetPrompt',
          1,
          2000
        ) then
        raise exception using
          errcode = '23514',
          message = 'Published activities require a valid bounded learner payload.';
      end if;

    when 'vocabulary' then
      if jsonb_typeof(p_payload -> 'entries') is distinct from 'array' then
        raise exception using
          errcode = '23514',
          message = 'Published activities require a valid bounded learner payload.';
      end if;

      if jsonb_array_length(p_payload -> 'entries') not between 1 and 40 then
        raise exception using
          errcode = '23514',
          message = 'Published activities require a valid bounded learner payload.';
      end if;

      for entry_record in
        select entry.value
        from jsonb_array_elements(p_payload -> 'entries') as entry(value)
      loop
        if jsonb_typeof(entry_record.value) is distinct from 'object'
          or not private.is_learner_catalog_bounded_string(
            entry_record.value -> 'term',
            1,
            500
          )
          or not private.is_learner_catalog_bounded_string(
            entry_record.value -> 'reading',
            1,
            500
          )
          or not private.is_learner_catalog_bounded_string(
            entry_record.value -> 'meaningVietnamese',
            1,
            1000
          )
          or not private.is_valid_learner_catalog_example(
            entry_record.value -> 'example'
          ) then
          raise exception using
            errcode = '23514',
            message = 'Published activities require a valid bounded learner payload.';
        end if;
      end loop;

    else
      raise exception using
        errcode = '23514',
        message = 'Published activities require a valid bounded learner payload.';
  end case;
end;
$function$;

create function private.enforce_learner_catalog_activity_payload()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, private
as $function$
begin
  if new.status = 'published' then
    perform private.require_learner_catalog_activity_payload(
      new.activity_type,
      new.payload
    );
  end if;

  return new;
end;
$function$;

create trigger enforce_learner_catalog_activity_payload_before_write
before insert or update on public.activities
for each row execute function private.enforce_learner_catalog_activity_payload();

create function private.require_learner_catalog_release_structure(
  p_content_release_id text
)
returns void
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $function$
begin
  if exists (
    select 1
    from public.content_units
    where content_units.content_release_id = p_content_release_id
      and content_units.status = 'published'
      and not exists (
        select 1
        from public.lessons
        where lessons.content_release_id = content_units.content_release_id
          and lessons.unit_id = content_units.unit_id
          and lessons.status = 'published'
      )
  ) then
    raise exception using
      errcode = '23514',
      message = 'Published content units require at least one published lesson.';
  end if;

  if exists (
    select 1
    from public.lessons
    where lessons.content_release_id = p_content_release_id
      and lessons.status = 'published'
      and not exists (
        select 1
        from public.activities
        where activities.content_release_id = lessons.content_release_id
          and activities.lesson_id = lessons.lesson_id
          and activities.status = 'published'
      )
  ) then
    raise exception using
      errcode = '23514',
      message = 'Published lessons require at least one published activity.';
  end if;

  perform private.require_learner_catalog_activity_payload(
    activities.activity_type,
    activities.payload
  )
  from public.activities
  where activities.content_release_id = p_content_release_id
    and activities.status = 'published';
end;
$function$;

create function private.enforce_learner_catalog_release_structure()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, private
as $function$
begin
  if new.release_status = 'published' then
    perform private.require_learner_catalog_release_structure(
      new.content_release_id
    );
  end if;

  return new;
end;
$function$;

create trigger enforce_learner_catalog_release_structure_before_write
before insert or update on public.content_releases
for each row execute function private.enforce_learner_catalog_release_structure();

-- Triggers protect future writes. Explicitly validate every existing published
-- activity plus each visible tree so legacy rows cannot survive migration.
do $migration_validation$
declare
  published_activity record;
  published_release_id text;
begin
  for published_activity in
    select activities.activity_type, activities.payload
    from public.activities
    where activities.status = 'published'
  loop
    perform private.require_learner_catalog_activity_payload(
      published_activity.activity_type,
      published_activity.payload
    );
  end loop;

  for published_release_id in
    select content_releases.content_release_id
    from public.content_releases
    where content_releases.release_status = 'published'
  loop
    perform private.require_learner_catalog_release_structure(
      published_release_id
    );
  end loop;
end;
$migration_validation$;

-- The current aggregate endpoint is a bounded pilot surface. Keep a single
-- request from materializing an unbounded corpus while lesson-level reads are
-- introduced before wider multi-language content release.
create function private.assert_learner_catalog_budget()
returns boolean
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, private
as $function$
declare
  visible_activity_count bigint;
  visible_activity_payload_bytes bigint;
  visible_lesson_count bigint;
  visible_release_count bigint;
  visible_unit_count bigint;
begin
  select
    count(*),
    coalesce(sum(octet_length(activities.payload::text)), 0)
  into visible_activity_count, visible_activity_payload_bytes
  from public.activities
  join public.lessons
    on lessons.content_release_id = activities.content_release_id
    and lessons.lesson_id = activities.lesson_id
  join public.content_units
    on content_units.content_release_id = lessons.content_release_id
    and content_units.unit_id = lessons.unit_id
  join public.content_releases
    on content_releases.content_release_id = activities.content_release_id
  join public.learning_paths
    on learning_paths.path_id = content_releases.path_id
  join public.language_packs
    on language_packs.language_code = learning_paths.language_code
  where activities.status = 'published'
    and lessons.status = 'published'
    and content_units.status = 'published'
    and content_releases.release_status = 'published'
    and learning_paths.path_status = 'published'
    and language_packs.availability_state = 'active';

  select count(*) into visible_release_count
  from public.content_releases
  join public.learning_paths
    on learning_paths.path_id = content_releases.path_id
  join public.language_packs
    on language_packs.language_code = learning_paths.language_code
  where content_releases.release_status = 'published'
    and learning_paths.path_status = 'published'
    and language_packs.availability_state = 'active';

  select count(*) into visible_unit_count
  from public.content_units
  join public.content_releases
    on content_releases.content_release_id = content_units.content_release_id
  join public.learning_paths
    on learning_paths.path_id = content_releases.path_id
  join public.language_packs
    on language_packs.language_code = learning_paths.language_code
  where content_units.status = 'published'
    and content_releases.release_status = 'published'
    and learning_paths.path_status = 'published'
    and language_packs.availability_state = 'active';

  select count(*) into visible_lesson_count
  from public.lessons
  join public.content_units
    on content_units.content_release_id = lessons.content_release_id
    and content_units.unit_id = lessons.unit_id
  join public.content_releases
    on content_releases.content_release_id = lessons.content_release_id
  join public.learning_paths
    on learning_paths.path_id = content_releases.path_id
  join public.language_packs
    on language_packs.language_code = learning_paths.language_code
  where lessons.status = 'published'
    and content_units.status = 'published'
    and content_releases.release_status = 'published'
    and learning_paths.path_status = 'published'
    and language_packs.availability_state = 'active';

  if visible_release_count > 36
    or visible_unit_count > 360
    or visible_lesson_count > 600
    or visible_activity_count > 600
    or visible_activity_payload_bytes > 393216 then
    raise exception using
      errcode = '54000',
      message = 'Learner catalog exceeds the aggregate endpoint budget.';
  end if;

  return true;
end;
$function$;

create function private.enforce_learner_catalog_response_budget(p_response jsonb)
returns jsonb
language plpgsql
immutable
strict
set search_path = pg_catalog
as $function$
begin
  if octet_length(p_response::text) > 524288 then
    raise exception using
      errcode = '54000',
      message = 'Learner catalog response exceeds the 512 KiB endpoint budget.';
  end if;

  return p_response;
end;
$function$;

create function private.get_learner_catalog_activities()
returns table (
  activity_id text,
  content_release_id text,
  lesson_id text,
  sequence integer,
  activity_type text,
  target_script text,
  title_vietnamese text,
  instructions_vietnamese text,
  estimated_minutes integer,
  payload jsonb
)
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $function$
  select
    activities.activity_id,
    activities.content_release_id,
    activities.lesson_id,
    activities.sequence,
    activities.activity_type,
    activities.target_script,
    activities.title_vietnamese,
    activities.instructions_vietnamese,
    activities.estimated_minutes,
    private.project_learner_catalog_payload(
      activities.activity_type,
      activities.payload
    ) as payload
  from public.activities
  join public.lessons
    on lessons.content_release_id = activities.content_release_id
    and lessons.lesson_id = activities.lesson_id
  join public.content_units
    on content_units.content_release_id = lessons.content_release_id
    and content_units.unit_id = lessons.unit_id
  where private.is_active_account(
    nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  )
    and activities.status = 'published'
    and lessons.status = 'published'
    and content_units.status = 'published'
    and private.is_visible_content_release(activities.content_release_id);
$function$;

create function public.get_learner_catalog_data()
returns jsonb
language sql
volatile
security definer
set search_path = pg_catalog, public, private
as $function$
  with active_account as (
    select private.is_active_account(
      nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    ) as is_active
  ),
  visible_releases as (
    select
      content_releases.content_release_id,
      content_releases.path_id,
      content_releases.version,
      content_releases.title_vietnamese,
      content_releases.release_status,
      content_releases.published_at,
      learning_paths.language_code,
      learning_paths.level_code,
      learning_paths.objective_key,
      learning_paths.path_status
    from public.content_releases
    join public.learning_paths
      on learning_paths.path_id = content_releases.path_id
    join public.language_packs
      on language_packs.language_code = learning_paths.language_code
    where content_releases.release_status = 'published'
      and learning_paths.path_status = 'published'
      and language_packs.availability_state = 'active'
  ),
  visible_paths as (
    select distinct
      visible_releases.path_id,
      visible_releases.language_code,
      visible_releases.level_code,
      visible_releases.objective_key,
      visible_releases.path_status
    from visible_releases
  )
  select case
    when (select is_active from active_account) then (
      select private.enforce_learner_catalog_response_budget(
        jsonb_build_object(
      'language_packs', coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'language_code', language_packs.language_code,
              'display_name_vietnamese', language_packs.display_name_vietnamese,
              'availability_state', language_packs.availability_state
            )
            order by language_packs.language_code
          )
          from public.language_packs
          where language_packs.availability_state = 'active'
        ),
        '[]'::jsonb
      ),
      'paths', coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'path_id', visible_paths.path_id,
              'language_code', visible_paths.language_code,
              'level_code', visible_paths.level_code,
              'objective_key', visible_paths.objective_key,
              'path_status', visible_paths.path_status
            )
            order by
              visible_paths.language_code,
              visible_paths.level_code,
              visible_paths.objective_key,
              visible_paths.path_id
          )
          from visible_paths
        ),
        '[]'::jsonb
      ),
      'releases', coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'content_release_id', visible_releases.content_release_id,
              'path_id', visible_releases.path_id,
              'version', visible_releases.version,
              'title_vietnamese', visible_releases.title_vietnamese,
              'release_status', visible_releases.release_status,
              'published_at', visible_releases.published_at
            )
            order by
              visible_releases.path_id,
              visible_releases.published_at desc,
              visible_releases.version desc,
              visible_releases.content_release_id
          )
          from visible_releases
        ),
        '[]'::jsonb
      ),
      'units', coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'unit_id', content_units.unit_id,
              'content_release_id', content_units.content_release_id,
              'sequence', content_units.sequence,
              'title_vietnamese', content_units.title_vietnamese,
              'status', content_units.status
            )
            order by content_units.content_release_id, content_units.sequence, content_units.unit_id
          )
          from public.content_units
          join visible_releases
            on visible_releases.content_release_id = content_units.content_release_id
          where content_units.status = 'published'
        ),
        '[]'::jsonb
      ),
      'lessons', coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'lesson_id', lessons.lesson_id,
              'content_release_id', lessons.content_release_id,
              'unit_id', lessons.unit_id,
              'sequence', lessons.sequence,
              'title_vietnamese', lessons.title_vietnamese,
              'summary_vietnamese', lessons.summary_vietnamese,
              'estimated_minutes', lessons.estimated_minutes,
              'status', lessons.status
            )
            order by lessons.content_release_id, lessons.unit_id, lessons.sequence, lessons.lesson_id
          )
          from public.lessons
          join visible_releases
            on visible_releases.content_release_id = lessons.content_release_id
          join public.content_units
            on content_units.content_release_id = lessons.content_release_id
            and content_units.unit_id = lessons.unit_id
          where lessons.status = 'published'
            and content_units.status = 'published'
        ),
        '[]'::jsonb
      ),
      'activities', coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'activity_id', activities.activity_id,
              'content_release_id', activities.content_release_id,
              'lesson_id', activities.lesson_id,
              'sequence', activities.sequence,
              'activity_type', activities.activity_type,
              'target_script', activities.target_script,
              'title_vietnamese', activities.title_vietnamese,
              'instructions_vietnamese', activities.instructions_vietnamese,
              'estimated_minutes', activities.estimated_minutes,
              'payload', activities.payload
            )
            order by activities.content_release_id, activities.lesson_id, activities.sequence, activities.activity_id
          )
          from private.get_learner_catalog_activities() as activities
        ),
        '[]'::jsonb
      )
      )
      )
      where private.assert_learner_catalog_budget()
    )
    else jsonb_build_object(
      'language_packs', '[]'::jsonb,
      'paths', '[]'::jsonb,
      'releases', '[]'::jsonb,
      'units', '[]'::jsonb,
      'lessons', '[]'::jsonb,
      'activities', '[]'::jsonb
    )
  end;
$function$;

alter function private.project_learner_catalog_text(jsonb) owner to app_security_definer;
alter function private.project_learner_catalog_example(jsonb) owner to app_security_definer;
alter function private.project_learner_catalog_examples(jsonb) owner to app_security_definer;
alter function private.project_learner_catalog_options(jsonb) owner to app_security_definer;
alter function private.project_learner_catalog_questions(jsonb) owner to app_security_definer;
alter function private.project_learner_catalog_vocabulary_entries(jsonb) owner to app_security_definer;
alter function private.project_learner_catalog_payload(text, jsonb) owner to app_security_definer;
alter function private.learner_catalog_utf16_length(text)
  owner to app_security_definer;
alter function private.is_learner_catalog_bounded_string(jsonb, integer, integer)
  owner to app_security_definer;
alter function private.is_valid_learner_catalog_example(jsonb)
  owner to app_security_definer;
alter function private.are_valid_learner_catalog_questions(jsonb, integer)
  owner to app_security_definer;
alter function private.require_learner_catalog_activity_payload(text, jsonb)
  owner to app_security_definer;
alter function private.enforce_learner_catalog_activity_payload()
  owner to app_security_definer;
alter function private.require_learner_catalog_release_structure(text)
  owner to app_security_definer;
alter function private.enforce_learner_catalog_release_structure()
  owner to app_security_definer;
alter function private.assert_learner_catalog_budget() owner to app_security_definer;
alter function private.enforce_learner_catalog_response_budget(jsonb)
  owner to app_security_definer;
alter function private.get_learner_catalog_activities() owner to app_security_definer;
alter function public.get_learner_catalog_data() owner to app_security_definer;

revoke all on function private.project_learner_catalog_text(jsonb)
  from public, anon, authenticated, service_role;
revoke all on function private.project_learner_catalog_example(jsonb)
  from public, anon, authenticated, service_role;
revoke all on function private.project_learner_catalog_examples(jsonb)
  from public, anon, authenticated, service_role;
revoke all on function private.project_learner_catalog_options(jsonb)
  from public, anon, authenticated, service_role;
revoke all on function private.project_learner_catalog_questions(jsonb)
  from public, anon, authenticated, service_role;
revoke all on function private.project_learner_catalog_vocabulary_entries(jsonb)
  from public, anon, authenticated, service_role;
revoke all on function private.project_learner_catalog_payload(text, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function private.learner_catalog_utf16_length(text)
  from public, anon, authenticated, service_role;
revoke all on function private.is_learner_catalog_bounded_string(jsonb, integer, integer)
  from public, anon, authenticated, service_role;
revoke all on function private.is_valid_learner_catalog_example(jsonb)
  from public, anon, authenticated, service_role;
revoke all on function private.are_valid_learner_catalog_questions(jsonb, integer)
  from public, anon, authenticated, service_role;
revoke all on function private.require_learner_catalog_activity_payload(text, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function private.enforce_learner_catalog_activity_payload()
  from public, anon, authenticated, service_role;
revoke all on function private.require_learner_catalog_release_structure(text)
  from public, anon, authenticated, service_role;
revoke all on function private.enforce_learner_catalog_release_structure()
  from public, anon, authenticated, service_role;
revoke all on function private.assert_learner_catalog_budget()
  from public, anon, authenticated, service_role;
revoke all on function private.enforce_learner_catalog_response_budget(jsonb)
  from public, anon, authenticated, service_role;
revoke all on function private.get_learner_catalog_activities()
  from public, anon, authenticated, service_role;
revoke all on function public.get_learner_catalog_data()
  from public, anon, authenticated, service_role;
grant execute on function public.get_learner_catalog_data() to authenticated;

drop function public.get_learner_catalog_activities();

revoke select on table public.language_packs from authenticated;
revoke select on table public.learning_objectives from authenticated;
revoke select on table public.level_definitions from authenticated;
revoke select on table public.learning_paths from authenticated;
revoke select on table public.content_releases from authenticated;
revoke select on table public.content_units from authenticated;
revoke select on table public.lessons from authenticated;
revoke select on table public.activities from authenticated;

revoke create on schema private, public from app_security_definer;
