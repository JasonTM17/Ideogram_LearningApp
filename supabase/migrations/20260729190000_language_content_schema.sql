-- Versioned language content catalog for the Vietnamese-first learning product.
--
-- Content is intentionally modeled as immutable once a release is published.
-- A future editorial import service may create drafts, but learner clients can
-- read only reviewed Japanese content from an active, published release.

create table public.language_packs (
  language_code text primary key
    check (language_code in ('ja', 'zh', 'ko')),
  display_name_vietnamese text not null
    check (char_length(display_name_vietnamese) between 1 and 120),
  availability_state text not null default 'hidden'
    check (availability_state in ('hidden', 'active', 'retired')),
  primary_script_kinds text[] not null
    check (cardinality(primary_script_kinds) between 1 and 4),
  romanization_scheme text not null
    check (char_length(romanization_scheme) between 1 and 120),
  segmentation_scheme text not null
    check (char_length(segmentation_scheme) between 1 and 120),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);

create table public.learning_objectives (
  objective_key text primary key
    check (objective_key in ('exam', 'communication', 'work', 'travel')),
  display_name_vietnamese text not null
    check (char_length(display_name_vietnamese) between 1 and 120),
  created_at timestamptz not null default clock_timestamp()
);

create table public.level_definitions (
  language_code text not null references public.language_packs (language_code) on delete restrict,
  level_code text not null check (char_length(level_code) between 1 and 32),
  exam_framework text not null check (char_length(exam_framework) between 1 and 32),
  exam_grouping text,
  cefr_band text,
  learner_label_vietnamese text not null
    check (char_length(learner_label_vietnamese) between 1 and 160),
  created_at timestamptz not null default clock_timestamp(),
  primary key (language_code, level_code),
  check (
    (language_code = 'ja' and level_code in ('N5', 'N4', 'N3', 'N2', 'N1') and exam_framework = 'JLPT')
    or (language_code = 'zh' and level_code in ('HSK_1', 'HSK_2', 'HSK_3', 'HSK_4', 'HSK_5', 'HSK_6') and exam_framework = 'HSK')
    or (language_code = 'ko' and level_code in ('TOPIK_1', 'TOPIK_2', 'TOPIK_3', 'TOPIK_4', 'TOPIK_5', 'TOPIK_6') and exam_framework = 'TOPIK')
  )
);

create table public.learning_paths (
  path_id uuid primary key default extensions.gen_random_uuid(),
  language_code text not null,
  level_code text not null,
  objective_key text not null references public.learning_objectives (objective_key) on delete restrict,
  title_vietnamese text not null check (char_length(title_vietnamese) between 1 and 240),
  description_vietnamese text not null check (char_length(description_vietnamese) between 1 and 2_000),
  path_status text not null default 'draft'
    check (path_status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique (language_code, level_code, objective_key),
  foreign key (language_code, level_code)
    references public.level_definitions (language_code, level_code) on delete restrict
);

create table public.content_provenance (
  provenance_id uuid primary key default extensions.gen_random_uuid(),
  source_kind text not null check (source_kind in ('original', 'licensed', 'public_domain')),
  source_reference text not null check (char_length(source_reference) between 1 and 500),
  license_reference text not null check (char_length(license_reference) between 1 and 300),
  author_name text not null check (char_length(author_name) between 1 and 160),
  reviewer_name text check (char_length(reviewer_name) between 1 and 160),
  adaptation_allowed boolean not null,
  embedding_allowed boolean not null,
  redistribution_allowed boolean not null,
  ai_provider_processing_allowed boolean not null,
  recorded_at timestamptz not null default clock_timestamp()
);

create table public.content_releases (
  content_release_id text primary key
    check (content_release_id ~ '^[a-z0-9][a-z0-9-]{1,118}$'),
  path_id uuid not null references public.learning_paths (path_id) on delete restrict,
  version text not null check (version ~ '^v[0-9]+\.[0-9]+\.[0-9]+$'),
  title_vietnamese text not null check (char_length(title_vietnamese) between 1 and 240),
  release_status text not null default 'draft'
    check (release_status in ('draft', 'review', 'published', 'archived')),
  provenance_id uuid not null references public.content_provenance (provenance_id) on delete restrict,
  published_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique (path_id, content_release_id),
  unique (path_id, version),
  check (release_status <> 'published' or published_at is not null),
  check (release_status in ('published', 'archived') or published_at is null)
);

create table public.content_units (
  unit_id text primary key check (unit_id ~ '^[a-z0-9][a-z0-9-]{1,118}$'),
  content_release_id text not null
    references public.content_releases (content_release_id) on delete restrict,
  sequence integer not null check (sequence between 1 and 100),
  title_vietnamese text not null check (char_length(title_vietnamese) between 1 and 240),
  status text not null default 'draft'
    check (status in ('draft', 'reviewed', 'published', 'archived')),
  provenance_id uuid not null references public.content_provenance (provenance_id) on delete restrict,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique (content_release_id, unit_id),
  unique (content_release_id, sequence)
);

create table public.lessons (
  lesson_id text primary key check (lesson_id ~ '^[a-z0-9][a-z0-9-]{1,118}$'),
  content_release_id text not null,
  unit_id text not null,
  sequence integer not null check (sequence between 1 and 200),
  title_vietnamese text not null check (char_length(title_vietnamese) between 1 and 240),
  summary_vietnamese text not null check (char_length(summary_vietnamese) between 1 and 2_000),
  estimated_minutes integer not null check (estimated_minutes between 5 and 90),
  status text not null default 'draft'
    check (status in ('draft', 'reviewed', 'published', 'archived')),
  provenance_id uuid not null references public.content_provenance (provenance_id) on delete restrict,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  foreign key (content_release_id, unit_id)
    references public.content_units (content_release_id, unit_id) on delete restrict,
  unique (content_release_id, lesson_id),
  unique (content_release_id, unit_id, sequence)
);

create table public.activities (
  activity_id text primary key check (activity_id ~ '^[a-z0-9][a-z0-9-]{1,118}$'),
  content_release_id text not null,
  lesson_id text not null,
  sequence integer not null check (sequence between 1 and 50),
  activity_type text not null
    check (activity_type in ('reading', 'listening', 'vocabulary', 'grammar', 'retrieval', 'objective_quiz', 'speaking', 'writing')),
  target_script text not null
    check (target_script in ('kana_kanji', 'hanzi_simplified', 'hangul', 'latin', 'mixed')),
  title_vietnamese text not null check (char_length(title_vietnamese) between 1 and 240),
  instructions_vietnamese text not null check (char_length(instructions_vietnamese) between 1 and 2_000),
  estimated_minutes integer not null check (estimated_minutes between 1 and 45),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  accessibility_metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(accessibility_metadata) = 'object'),
  status text not null default 'draft'
    check (status in ('draft', 'reviewed', 'published', 'archived')),
  provenance_id uuid not null references public.content_provenance (provenance_id) on delete restrict,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  foreign key (content_release_id, lesson_id)
    references public.lessons (content_release_id, lesson_id) on delete restrict,
  unique (content_release_id, activity_id),
  unique (content_release_id, lesson_id, sequence)
);

create index content_releases_path_status_idx
  on public.content_releases (path_id, release_status, published_at desc);
create index content_releases_provenance_idx
  on public.content_releases (provenance_id);
create index content_units_release_sequence_idx
  on public.content_units (content_release_id, sequence);
create index content_units_provenance_idx
  on public.content_units (provenance_id);
create index lessons_release_unit_sequence_idx
  on public.lessons (content_release_id, unit_id, sequence);
create index lessons_provenance_idx
  on public.lessons (provenance_id);
create index activities_release_lesson_sequence_idx
  on public.activities (content_release_id, lesson_id, sequence);
create index activities_provenance_idx
  on public.activities (provenance_id);
create index learning_paths_objective_idx
  on public.learning_paths (objective_key);

insert into public.language_packs (
  language_code,
  display_name_vietnamese,
  availability_state,
  primary_script_kinds,
  romanization_scheme,
  segmentation_scheme
)
values
  ('ja', 'Tiếng Nhật', 'active', array['kana_kanji', 'latin'], 'Hepburn', 'morpheme'),
  ('zh', 'Tiếng Trung', 'hidden', array['hanzi_simplified', 'latin'], 'Hanyu Pinyin with tones', 'word'),
  ('ko', 'Tiếng Hàn', 'hidden', array['hangul', 'latin'], 'Revised Romanization', 'eojeol')
on conflict (language_code) do update
set
  display_name_vietnamese = excluded.display_name_vietnamese,
  availability_state = excluded.availability_state,
  primary_script_kinds = excluded.primary_script_kinds,
  romanization_scheme = excluded.romanization_scheme,
  segmentation_scheme = excluded.segmentation_scheme,
  updated_at = clock_timestamp();

insert into public.learning_objectives (objective_key, display_name_vietnamese)
values
  ('exam', 'Luyện thi có định hướng'),
  ('communication', 'Giao tiếp hằng ngày'),
  ('work', 'Tiếng Nhật cho công việc'),
  ('travel', 'Du lịch và tình huống thực tế')
on conflict (objective_key) do update
set display_name_vietnamese = excluded.display_name_vietnamese;

insert into public.level_definitions (
  language_code,
  level_code,
  exam_framework,
  exam_grouping,
  cefr_band,
  learner_label_vietnamese
)
values
  ('ja', 'N5', 'JLPT', null, 'A1', 'Nhật ngữ nền tảng — N5'),
  ('ja', 'N4', 'JLPT', null, 'A2', 'Nhật ngữ sơ trung cấp — N4'),
  ('ja', 'N3', 'JLPT', null, 'B1', 'Nhật ngữ trung cấp — N3'),
  ('ja', 'N2', 'JLPT', null, 'B2', 'Nhật ngữ trung cao cấp — N2'),
  ('ja', 'N1', 'JLPT', null, 'C1', 'Nhật ngữ cao cấp — N1'),
  ('zh', 'HSK_1', 'HSK', null, 'A1', 'Hán ngữ nền tảng — HSK 1'),
  ('zh', 'HSK_2', 'HSK', null, 'A1', 'Hán ngữ nền tảng — HSK 2'),
  ('zh', 'HSK_3', 'HSK', null, 'A2', 'Hán ngữ sơ trung cấp — HSK 3'),
  ('zh', 'HSK_4', 'HSK', null, 'B1', 'Hán ngữ trung cấp — HSK 4'),
  ('zh', 'HSK_5', 'HSK', null, 'B2', 'Hán ngữ trung cao cấp — HSK 5'),
  ('zh', 'HSK_6', 'HSK', null, 'C1', 'Hán ngữ cao cấp — HSK 6'),
  ('ko', 'TOPIK_1', 'TOPIK', 'TOPIK I', 'A1', 'Hàn ngữ nền tảng — TOPIK 1'),
  ('ko', 'TOPIK_2', 'TOPIK', 'TOPIK I', 'A2', 'Hàn ngữ sơ cấp — TOPIK 2'),
  ('ko', 'TOPIK_3', 'TOPIK', 'TOPIK II', 'B1', 'Hàn ngữ trung cấp — TOPIK 3'),
  ('ko', 'TOPIK_4', 'TOPIK', 'TOPIK II', 'B2', 'Hàn ngữ trung cao cấp — TOPIK 4'),
  ('ko', 'TOPIK_5', 'TOPIK', 'TOPIK II', 'C1', 'Hàn ngữ cao cấp — TOPIK 5'),
  ('ko', 'TOPIK_6', 'TOPIK', 'TOPIK II', 'C1', 'Hàn ngữ thành thạo — TOPIK 6')
on conflict (language_code, level_code) do update
set
  exam_framework = excluded.exam_framework,
  exam_grouping = excluded.exam_grouping,
  cefr_band = excluded.cefr_band,
  learner_label_vietnamese = excluded.learner_label_vietnamese;

insert into public.learning_paths (
  language_code,
  level_code,
  objective_key,
  title_vietnamese,
  description_vietnamese
)
select
  levels.language_code,
  levels.level_code,
  objectives.objective_key,
  language_packs.display_name_vietnamese || ' ' || levels.level_code || ' — ' || objectives.display_name_vietnamese,
  'Lộ trình tham chiếu nội bộ; điểm số trong sản phẩm không phải kết quả chứng chỉ chính thức.'
from public.level_definitions as levels
join public.language_packs as language_packs
  on language_packs.language_code = levels.language_code
cross join public.learning_objectives as objectives
on conflict (language_code, level_code, objective_key) do nothing;

create function private.touch_learning_content_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $function$
begin
  new.updated_at := pg_catalog.clock_timestamp();
  return new;
end;
$function$;

-- PostgreSQL acquires a root row lock before running its BEFORE trigger. All
-- callers therefore take this row lock before the matching advisory lock so
-- learner operations cannot deadlock with a release publication or archive.
create function private.lock_content_release(p_content_release_id text)
returns public.content_releases
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  release_record public.content_releases%rowtype;
begin
  select *
  into release_record
  from public.content_releases
  where content_release_id = p_content_release_id
  for update;

  if release_record.content_release_id is null then
    raise exception using
      errcode = 'P0002',
      message = 'Content release was not found.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_content_release_id, 7305)
  );

  return release_record;
end;
$function$;

create function private.require_reviewed_content_provenance(
  p_provenance_id uuid,
  p_entity_label text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  provenance_record public.content_provenance%rowtype;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_provenance_id::text, 7306)
  );

  select *
  into provenance_record
  from public.content_provenance
  where provenance_id = p_provenance_id;

  if provenance_record.provenance_id is null
    or provenance_record.reviewer_name is null
    or not provenance_record.adaptation_allowed
    or not provenance_record.embedding_allowed
    or not provenance_record.redistribution_allowed
    or not provenance_record.ai_provider_processing_allowed then
    raise exception using
      errcode = '23514',
      message = 'Published ' || p_entity_label || ' requires reviewed provenance with all declared product rights.';
  end if;
end;
$function$;

create function private.enforce_content_item_publication()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, private
as $function$
begin
  perform private.lock_content_release(new.content_release_id);

  if new.status = 'published' then
    perform private.require_reviewed_content_provenance(new.provenance_id, tg_table_name);
  end if;

  return new;
end;
$function$;

create function private.enforce_content_release_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, private, public
as $function$
declare
  language_availability text;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.content_release_id, 7305)
  );

  if tg_op = 'UPDATE' then
    if new.content_release_id <> old.content_release_id
      or new.path_id <> old.path_id
      or new.version <> old.version then
      raise exception using
        errcode = '42501',
        message = 'Content release identity is immutable.';
    end if;

    if old.release_status = 'archived' and new.release_status <> 'archived' then
      raise exception using
        errcode = '23514',
        message = 'Archived content releases cannot be reopened.';
    end if;

    if old.release_status = 'published'
      and new.release_status not in ('published', 'archived') then
      raise exception using
        errcode = '23514',
        message = 'Published content releases may only remain published or be archived.';
    end if;

    if old.release_status in ('published', 'archived')
      and (
        new.title_vietnamese <> old.title_vietnamese
        or new.provenance_id <> old.provenance_id
        or new.published_at is distinct from old.published_at
      ) then
      raise exception using
        errcode = '23514',
        message = 'Published content release metadata is immutable.';
    end if;
  end if;

  if new.release_status = 'published' then
    select language_packs.availability_state
    into language_availability
    from public.learning_paths
    join public.language_packs
      on language_packs.language_code = learning_paths.language_code
    where learning_paths.path_id = new.path_id;

    if language_availability is distinct from 'active' then
      raise exception using
        errcode = '23514',
        message = 'Only an active language pack may publish a content release.';
    end if;

    perform private.require_reviewed_content_provenance(new.provenance_id, 'content release');

    if not exists (
      select 1
      from public.content_units
      where content_release_id = new.content_release_id
    )
      or not exists (
        select 1
        from public.lessons
        where content_release_id = new.content_release_id
      )
      or not exists (
        select 1
        from public.activities
        where content_release_id = new.content_release_id
      )
      or exists (
        select 1
        from public.content_units
        where content_release_id = new.content_release_id
          and status <> 'published'
      )
      or exists (
        select 1
        from public.lessons
        where content_release_id = new.content_release_id
          and status <> 'published'
      )
      or exists (
        select 1
        from public.activities
        where content_release_id = new.content_release_id
          and status <> 'published'
      ) then
      raise exception using
        errcode = '23514',
        message = 'Published content releases require a complete reviewed and published content tree.';
    end if;

    new.published_at := coalesce(new.published_at, pg_catalog.clock_timestamp());
  elsif new.release_status = 'archived' then
    if new.published_at is null then
      raise exception using
        errcode = '23514',
        message = 'Archived content releases must retain their publication timestamp.';
    end if;
  elsif new.published_at is not null then
    raise exception using
      errcode = '23514',
      message = 'Only published or archived content releases may have a publication timestamp.';
  end if;

  new.updated_at := pg_catalog.clock_timestamp();
  return new;
end;
$function$;

create function private.prevent_mutation_of_immutable_content()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  immutable_release_id text;
  release_record public.content_releases%rowtype;
begin
  if tg_op = 'DELETE' then
    immutable_release_id := old.content_release_id;
  else
    immutable_release_id := new.content_release_id;
  end if;

  release_record := private.lock_content_release(immutable_release_id);

  if tg_op <> 'INSERT' and old.status in ('published', 'archived') then
    raise exception using
      errcode = '23514',
      message = 'Published or archived content items are immutable.';
  end if;

  if release_record.release_status in ('published', 'archived') then
    raise exception using
      errcode = '23514',
      message = 'Content in a published or archived release is immutable.';
  end if;

  return coalesce(new, old);
end;
$function$;

create function private.prevent_mutation_of_used_content_provenance()
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

create function private.is_visible_language_pack(p_language_code text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select exists (
    select 1
    from public.language_packs
    where language_code = p_language_code
      and availability_state = 'active'
  );
$function$;

create function private.is_visible_learning_path(p_path_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select exists (
    select 1
    from public.learning_paths
    join public.language_packs
      on language_packs.language_code = learning_paths.language_code
    join public.content_releases
      on content_releases.path_id = learning_paths.path_id
    where learning_paths.path_id = p_path_id
      and learning_paths.path_status = 'published'
      and language_packs.availability_state = 'active'
      and content_releases.release_status = 'published'
  );
$function$;

create function private.is_visible_content_release(p_content_release_id text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select exists (
    select 1
    from public.content_releases
    join public.learning_paths
      on learning_paths.path_id = content_releases.path_id
    join public.language_packs
      on language_packs.language_code = learning_paths.language_code
    where content_releases.content_release_id = p_content_release_id
      and content_releases.release_status = 'published'
      and learning_paths.path_status = 'published'
      and language_packs.availability_state = 'active'
  );
$function$;

create trigger touch_language_pack_before_update
before update on public.language_packs
for each row execute function private.touch_learning_content_updated_at();

create trigger touch_learning_path_before_update
before update on public.learning_paths
for each row execute function private.touch_learning_content_updated_at();

create trigger touch_content_unit_before_update
before update on public.content_units
for each row execute function private.touch_learning_content_updated_at();

create trigger touch_lesson_before_update
before update on public.lessons
for each row execute function private.touch_learning_content_updated_at();

create trigger touch_activity_before_update
before update on public.activities
for each row execute function private.touch_learning_content_updated_at();

create trigger enforce_content_release_lifecycle_before_write
before insert or update on public.content_releases
for each row execute function private.enforce_content_release_lifecycle();

create trigger enforce_content_unit_publication_before_write
before insert or update on public.content_units
for each row execute function private.enforce_content_item_publication();

create trigger enforce_lesson_publication_before_write
before insert or update on public.lessons
for each row execute function private.enforce_content_item_publication();

create trigger enforce_activity_publication_before_write
before insert or update on public.activities
for each row execute function private.enforce_content_item_publication();

create trigger prevent_immutable_content_unit_mutation
before insert or update or delete on public.content_units
for each row execute function private.prevent_mutation_of_immutable_content();

create trigger prevent_immutable_lesson_mutation
before insert or update or delete on public.lessons
for each row execute function private.prevent_mutation_of_immutable_content();

create trigger prevent_immutable_activity_mutation
before insert or update or delete on public.activities
for each row execute function private.prevent_mutation_of_immutable_content();

create trigger prevent_used_content_provenance_update
before update on public.content_provenance
for each row execute function private.prevent_mutation_of_used_content_provenance();

create trigger prevent_used_content_provenance_delete
before delete on public.content_provenance
for each row execute function private.prevent_mutation_of_used_content_provenance();

alter table public.language_packs enable row level security;
alter table public.learning_objectives enable row level security;
alter table public.level_definitions enable row level security;
alter table public.learning_paths enable row level security;
alter table public.content_provenance enable row level security;
alter table public.content_releases enable row level security;
alter table public.content_units enable row level security;
alter table public.lessons enable row level security;
alter table public.activities enable row level security;

revoke all on table public.language_packs from public, anon, authenticated, service_role;
revoke all on table public.learning_objectives from public, anon, authenticated, service_role;
revoke all on table public.level_definitions from public, anon, authenticated, service_role;
revoke all on table public.learning_paths from public, anon, authenticated, service_role;
revoke all on table public.content_provenance from public, anon, authenticated, service_role;
revoke all on table public.content_releases from public, anon, authenticated, service_role;
revoke all on table public.content_units from public, anon, authenticated, service_role;
revoke all on table public.lessons from public, anon, authenticated, service_role;
revoke all on table public.activities from public, anon, authenticated, service_role;

grant select on table public.language_packs to authenticated;
grant select on table public.learning_objectives to authenticated;
grant select on table public.level_definitions to authenticated;
grant select on table public.learning_paths to authenticated;
grant select on table public.content_releases to authenticated;
grant select on table public.content_units to authenticated;
grant select on table public.lessons to authenticated;
grant select on table public.activities to authenticated;

create policy "internal security definer: manage language packs"
on public.language_packs
for all
to app_security_definer
using (true)
with check (true);

create policy "internal security definer: manage learning objectives"
on public.learning_objectives
for all
to app_security_definer
using (true)
with check (true);

create policy "internal security definer: manage level definitions"
on public.level_definitions
for all
to app_security_definer
using (true)
with check (true);

create policy "internal security definer: manage learning paths"
on public.learning_paths
for all
to app_security_definer
using (true)
with check (true);

create policy "internal security definer: manage content provenance"
on public.content_provenance
for all
to app_security_definer
using (true)
with check (true);

create policy "internal security definer: manage content releases"
on public.content_releases
for all
to app_security_definer
using (true)
with check (true);

create policy "internal security definer: manage content units"
on public.content_units
for all
to app_security_definer
using (true)
with check (true);

create policy "internal security definer: manage lessons"
on public.lessons
for all
to app_security_definer
using (true)
with check (true);

create policy "internal security definer: manage activities"
on public.activities
for all
to app_security_definer
using (true)
with check (true);

create policy "language packs: select active catalog"
on public.language_packs
for select
to authenticated
using (
  private.is_active_account((select auth.uid()))
  and availability_state = 'active'
);

create policy "learning objectives: select active catalog"
on public.learning_objectives
for select
to authenticated
using (private.is_active_account((select auth.uid())));

create policy "level definitions: select active language catalog"
on public.level_definitions
for select
to authenticated
using (
  private.is_active_account((select auth.uid()))
  and private.is_visible_language_pack(language_code)
);

create policy "learning paths: select published active catalog"
on public.learning_paths
for select
to authenticated
using (
  private.is_active_account((select auth.uid()))
  and private.is_visible_learning_path(path_id)
);

create policy "content releases: select published active catalog"
on public.content_releases
for select
to authenticated
using (
  private.is_active_account((select auth.uid()))
  and private.is_visible_content_release(content_release_id)
);

create policy "content units: select published active catalog"
on public.content_units
for select
to authenticated
using (
  private.is_active_account((select auth.uid()))
  and private.is_visible_content_release(content_release_id)
  and status = 'published'
);

create policy "lessons: select published active catalog"
on public.lessons
for select
to authenticated
using (
  private.is_active_account((select auth.uid()))
  and private.is_visible_content_release(content_release_id)
  and status = 'published'
);

create policy "activities: select published active catalog"
on public.activities
for select
to authenticated
using (
  private.is_active_account((select auth.uid()))
  and private.is_visible_content_release(content_release_id)
  and status = 'published'
);

grant usage on schema private, public, extensions to app_security_definer;
grant select, insert, update, delete on table public.language_packs to app_security_definer;
grant select, insert, update, delete on table public.learning_objectives to app_security_definer;
grant select, insert, update, delete on table public.level_definitions to app_security_definer;
grant select, insert, update, delete on table public.learning_paths to app_security_definer;
grant select, insert, update, delete on table public.content_provenance to app_security_definer;
grant select, insert, update, delete on table public.content_releases to app_security_definer;
grant select, insert, update, delete on table public.content_units to app_security_definer;
grant select, insert, update, delete on table public.lessons to app_security_definer;
grant select, insert, update, delete on table public.activities to app_security_definer;

grant execute on function private.is_visible_language_pack(text) to authenticated, service_role;
grant execute on function private.is_visible_learning_path(uuid) to authenticated, service_role;
grant execute on function private.is_visible_content_release(text) to authenticated, service_role;

grant create on schema private to app_security_definer;
grant app_security_definer to postgres;
alter function private.lock_content_release(text) owner to app_security_definer;
alter function private.require_reviewed_content_provenance(uuid, text) owner to app_security_definer;
alter function private.enforce_content_item_publication() owner to app_security_definer;
alter function private.enforce_content_release_lifecycle() owner to app_security_definer;
alter function private.prevent_mutation_of_immutable_content() owner to app_security_definer;
alter function private.prevent_mutation_of_used_content_provenance() owner to app_security_definer;
alter function private.is_visible_language_pack(text) owner to app_security_definer;
alter function private.is_visible_learning_path(uuid) owner to app_security_definer;
alter function private.is_visible_content_release(text) owner to app_security_definer;
revoke create on schema private from app_security_definer;

revoke all on function private.touch_learning_content_updated_at() from public, anon, authenticated;
revoke all on function private.lock_content_release(text) from public, anon, authenticated, service_role;
revoke all on function private.require_reviewed_content_provenance(uuid, text) from public, anon, authenticated;
revoke all on function private.enforce_content_item_publication() from public, anon, authenticated;
revoke all on function private.enforce_content_release_lifecycle() from public, anon, authenticated;
revoke all on function private.prevent_mutation_of_immutable_content() from public, anon, authenticated;
revoke all on function private.prevent_mutation_of_used_content_provenance() from public, anon, authenticated;
revoke all on function private.is_visible_language_pack(text) from public, anon;
revoke all on function private.is_visible_learning_path(uuid) from public, anon;
revoke all on function private.is_visible_content_release(text) from public, anon;
