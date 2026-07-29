begin;

select plan(25);

select is(
  (
    select count(*)
    from pg_class
    where oid in (
      'public.language_packs'::regclass,
      'public.learning_paths'::regclass,
      'public.content_releases'::regclass,
      'public.activities'::regclass,
      'public.learner_enrollments'::regclass,
      'public.placement_question_sets'::regclass,
      'public.placement_questions'::regclass,
      'public.placement_sessions'::regclass,
      'public.placement_answers'::regclass,
      'public.learner_activity_attempts'::regclass,
      'public.learner_activity_completions'::regclass,
      'public.learner_lesson_progress'::regclass,
      'public.learner_proficiency_snapshots'::regclass,
      'public.review_items'::regclass,
      'public.review_events'::regclass,
      'private.learner_event_cursors'::regclass,
      'private.learning_data_purge_operations'::regclass,
      'private.learning_data_purge_receipts'::regclass
    )
      and relrowsecurity
  ),
  18::bigint,
  'learning catalog and learner records have row-level security enabled'
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
    private.hash_email('learning-a@example.test'),
    private.hash_secret('learning-approval-a'),
    'adult-beta-v1',
    repeat('a', 64),
    clock_timestamp(),
    clock_timestamp() + interval '15 minutes'
  ),
  (
    private.hash_email('learning-b@example.test'),
    private.hash_secret('learning-approval-b'),
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
    '10000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'learning-a@example.test',
    clock_timestamp(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"registration_approval_token":"learning-approval-a"}'::jsonb,
    clock_timestamp(),
    clock_timestamp()
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'learning-b@example.test',
    clock_timestamp(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"registration_approval_token":"learning-approval-b"}'::jsonb,
    clock_timestamp(),
    clock_timestamp()
  );

insert into public.content_provenance (
  provenance_id,
  source_kind,
  source_reference,
  license_reference,
  author_name,
  reviewer_name,
  adaptation_allowed,
  embedding_allowed,
  redistribution_allowed,
  ai_provider_processing_allowed
)
values (
  '20000000-0000-0000-0000-000000000001',
  'original',
  'Original test corpus authored for Ideogram Learning.',
  'ideogram-original-test-v1',
  'Learning Content Team',
  'Vietnamese Pedagogy Reviewer',
  true,
  true,
  true,
  true
);

update public.learning_paths
set path_status = 'published'
where language_code = 'ja'
  and level_code = 'N5'
  and objective_key = 'exam';

insert into public.content_releases (
  content_release_id,
  path_id,
  version,
  title_vietnamese,
  release_status,
  provenance_id
)
select
  'ja-n5-rls-test-v1',
  path_id,
  'v1.0.0',
  'Nhật ngữ N5 — kiểm thử RLS',
  'draft',
  '20000000-0000-0000-0000-000000000001'
from public.learning_paths
where language_code = 'ja'
  and level_code = 'N5'
  and objective_key = 'exam';

insert into public.content_units (
  unit_id,
  content_release_id,
  sequence,
  title_vietnamese,
  status,
  provenance_id
)
values (
  'ja-n5-rls-u1',
  'ja-n5-rls-test-v1',
  1,
  'Bắt đầu',
  'published',
  '20000000-0000-0000-0000-000000000001'
);

insert into public.lessons (
  lesson_id,
  content_release_id,
  unit_id,
  sequence,
  title_vietnamese,
  summary_vietnamese,
  estimated_minutes,
  status,
  provenance_id
)
values (
  'ja-n5-rls-u1-l1',
  'ja-n5-rls-test-v1',
  'ja-n5-rls-u1',
  1,
  'Chào hỏi',
  'Bài học kiểm thử RLS.',
  10,
  'published',
  '20000000-0000-0000-0000-000000000001'
);

insert into public.activities (
  activity_id,
  content_release_id,
  lesson_id,
  sequence,
  activity_type,
  target_script,
  title_vietnamese,
  instructions_vietnamese,
  estimated_minutes,
  payload,
  status,
  provenance_id
)
values (
  'ja-n5-rls-u1-l1-vocab',
  'ja-n5-rls-test-v1',
  'ja-n5-rls-u1-l1',
  1,
  'vocabulary',
  'kana_kanji',
  'Từ vựng chào hỏi',
  'Đọc và trả lời.',
  5,
  '{
    "entries": [
      {
        "term": "私",
        "reading": "わたし",
        "meaningVietnamese": "tôi",
        "example": {
          "value": "私は学生です。",
          "translationVietnamese": "Tôi là học sinh."
        }
      }
    ]
  }'::jsonb,
  'published',
  '20000000-0000-0000-0000-000000000001'
);

update public.content_releases
set release_status = 'published'
where content_release_id = 'ja-n5-rls-test-v1';

insert into public.learner_enrollments (
  enrollment_id,
  user_id,
  path_id,
  content_release_id
)
select
  '30000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  path_id,
  'ja-n5-rls-test-v1'
from public.learning_paths
where language_code = 'ja'
  and level_code = 'N5'
  and objective_key = 'exam';

select throws_ok(
  $$
    insert into public.learner_enrollments (
      user_id,
      path_id,
      content_release_id
    )
    select
      '10000000-0000-0000-0000-000000000001',
      path_id,
      'ja-n5-rls-test-v1'
    from public.learning_paths
    where language_code = 'ja'
      and level_code = 'N4'
      and objective_key = 'exam'
  $$,
  '23503',
  null,
  'an enrollment cannot pair a path with a release from another path'
);

insert into public.learner_enrollments (
  enrollment_id,
  user_id,
  path_id,
  content_release_id
)
select
  '30000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000002',
  path_id,
  'ja-n5-rls-test-v1'
from public.learning_paths
where language_code = 'ja'
  and level_code = 'N5'
  and objective_key = 'exam';

select is(
  (
    select release_status
    from public.content_releases
    where content_release_id = 'ja-n5-rls-test-v1'
  ),
  'published',
  'a complete reviewed content tree can be published'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
set local role authenticated;

select is(
  (select count(*) from public.language_packs),
  1::bigint,
  'an active learner sees only active language packs'
);
select is(
  (
    select count(*)
    from public.language_packs
    where language_code in ('zh', 'ko')
  ),
  0::bigint,
  'hidden Chinese and Korean packs fail closed'
);
select is(
  (
    select count(*)
    from public.level_definitions
    where language_code = 'ja'
  ),
  5::bigint,
  'the Japanese level family is visible to an active learner'
);
select is(
  (
    select count(*)
    from public.content_releases
    where content_release_id = 'ja-n5-rls-test-v1'
  ),
  1::bigint,
  'an active learner can read the published Japanese release'
);
select is(
  (
    select count(*)
    from public.learning_paths
    where language_code = 'ja'
      and level_code = 'N5'
      and objective_key = 'exam'
  ),
  1::bigint,
  'an active learner can read a path only after its release is published'
);
select throws_ok(
  $$
    select count(*)
    from public.activities
    where content_release_id = 'ja-n5-rls-test-v1'
  $$,
  '42501',
  null,
  'an active learner cannot read raw activity payloads directly'
);
select is(
  (select count(*) from public.learner_enrollments),
  1::bigint,
  'learner A can read only their enrollment'
);
select is(
  (
    select count(*)
    from public.learner_enrollments
    where user_id = '10000000-0000-0000-0000-000000000002'
  ),
  0::bigint,
  'learner A cannot read learner B enrollment'
);
select throws_ok(
  $$
    insert into public.learner_enrollments (
      user_id,
      path_id,
      content_release_id
    )
    select
      '10000000-0000-0000-0000-000000000001',
      path_id,
      'ja-n5-rls-test-v1'
    from public.learning_paths
    where language_code = 'ja'
      and level_code = 'N5'
      and objective_key = 'exam'
  $$,
  '42501',
  null,
  'learner clients cannot directly create enrollment state'
);
select throws_ok(
  $$select count(*) from public.content_provenance$$,
  '42501',
  null,
  'learner clients cannot read internal source provenance records directly'
);
select throws_ok(
  $$
    insert into public.review_items (
      user_id,
      content_release_id,
      activity_id,
      source_item_key
    )
    values (
      '10000000-0000-0000-0000-000000000001',
      'ja-n5-rls-test-v1',
      'ja-n5-rls-u1-l1-vocab',
      'forged-review-item'
    )
  $$,
  '42501',
  null,
  'learner clients cannot directly create review schedule items'
);

reset role;
reset "request.jwt.claim.sub";

select ok(
  not has_function_privilege(
    'authenticated',
    'private.submit_review_event(uuid,uuid,uuid,uuid,bigint,text,text,timestamp with time zone,text)',
    'execute'
  ),
  'the private review transaction is not executable by browser or mobile roles'
);
select ok(
  has_function_privilege(
    'app_learning_api_executor',
    'private.submit_activity_attempt(uuid,text,text,uuid,bigint,uuid,text,jsonb,text,numeric,text,timestamp with time zone,text)',
    'execute'
  )
  and has_function_privilege(
    'app_learning_api_executor',
    'private.submit_review_event(uuid,uuid,uuid,uuid,bigint,text,text,timestamp with time zone,text)',
    'execute'
  ),
  'the restricted API executor can invoke only the private learning transactions'
);
select ok(
  not has_table_privilege(
    'app_learning_api_executor',
    'public.review_items',
    'select'
  )
  and not has_table_privilege(
    'app_learning_api_executor',
    'public.learner_activity_attempts',
    'insert'
  ),
  'the API executor has no direct learner-table privileges'
);
select ok(
  not has_function_privilege(
    'service_role',
    'private.submit_review_event(uuid,uuid,uuid,uuid,bigint,text,text,timestamp with time zone,text)',
    'execute'
  )
  and has_function_privilege(
    'service_role',
    'private.purge_learner_learning_data(uuid,bigint,uuid)',
    'execute'
  ),
  'the worker role can purge authorized deletions but cannot submit learner reviews'
);
select ok(
  (
    select not rolcanlogin and not rolbypassrls
    from pg_roles
    where rolname = 'app_learning_api_executor'
  ),
  'the API executor role cannot log in or bypass row-level security'
);
select throws_ok(
  $$
    delete from public.learner_enrollments
    where enrollment_id = '30000000-0000-0000-0000-000000000001'
  $$,
  '42501',
  'Learner event history is append-only.',
  'enrollment history can be removed only through the authorized privacy purge'
);
select throws_ok(
  $$
    update public.activities
    set title_vietnamese = 'Đã sửa trái phép'
    where activity_id = 'ja-n5-rls-u1-l1-vocab'
  $$,
  '23514',
  'Published or archived content items are immutable.',
  'published content cannot be changed in place'
);
select throws_ok(
  $$
    insert into public.activities (
      activity_id,
      content_release_id,
      lesson_id,
      sequence,
      activity_type,
      target_script,
      title_vietnamese,
      instructions_vietnamese,
      estimated_minutes,
      payload,
      status,
      provenance_id
    )
    values (
      'ja-n5-rls-u1-l1-late',
      'ja-n5-rls-test-v1',
      'ja-n5-rls-u1-l1',
      2,
      'vocabulary',
      'kana_kanji',
      'Nội dung chèn muộn',
      'Không được phép.',
      5,
      '{"entries":[]}'::jsonb,
      'draft',
      '20000000-0000-0000-0000-000000000001'
    )
  $$,
  '23514',
  'Content in a published or archived release is immutable.',
  'a published release cannot receive a late draft child item'
);
select throws_ok(
  $$
    update public.content_provenance
    set author_name = 'Đã sửa trái phép'
    where provenance_id = '20000000-0000-0000-0000-000000000001'
  $$,
  '23514',
  'Provenance attached to published content is immutable.',
  'published content provenance cannot be rewritten in place'
);

update public.profiles
set account_state = 'frozen', revoked_at = clock_timestamp()
where user_id = '10000000-0000-0000-0000-000000000001';

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
set local role authenticated;

select is(
  (select count(*) from public.content_releases),
  0::bigint,
  'a frozen account loses direct catalog access'
);
select is(
  (select count(*) from public.learner_enrollments),
  0::bigint,
  'a frozen account loses direct learning-progress access'
);

reset role;
reset "request.jwt.claim.sub";

select * from finish();
rollback;
