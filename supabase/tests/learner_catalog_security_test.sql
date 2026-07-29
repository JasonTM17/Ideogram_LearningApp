begin;

select plan(36);

insert into private.registration_approvals (
  email_digest,
  approval_token_digest,
  adult_policy_version,
  policy_document_digest,
  adult_attested_at,
  expires_at
)
values (
  private.hash_email('catalog-security@example.test'),
  private.hash_secret('catalog-security-approval'),
  'adult-beta-v1',
  repeat('c', 64),
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
values (
  '41000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'catalog-security@example.test',
  clock_timestamp(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"registration_approval_token":"catalog-security-approval"}'::jsonb,
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
  '42000000-0000-0000-0000-000000000001',
  'original',
  'Original learner catalog security test corpus.',
  'ideogram-original-catalog-security-test-v1',
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
  'ja-n5-catalog-security-v1',
  path_id,
  'v1.0.0',
  'Nhật ngữ N5 — kiểm thử catalog an toàn',
  'draft',
  '42000000-0000-0000-0000-000000000001'
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
  'ja-n5-catalog-security-u1',
  'ja-n5-catalog-security-v1',
  1,
  'Bắt đầu',
  'published',
  '42000000-0000-0000-0000-000000000001'
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
  'ja-n5-catalog-security-u1-l1',
  'ja-n5-catalog-security-v1',
  'ja-n5-catalog-security-u1',
  1,
  'An toàn dữ liệu đáp án',
  'Bài học kiểm thử phân tách prompt và dữ liệu chấm.',
  15,
  'published',
  '42000000-0000-0000-0000-000000000001'
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
values
  (
    'ja-n5-catalog-security-objective',
    'ja-n5-catalog-security-v1',
    'ja-n5-catalog-security-u1-l1',
    1,
    'objective_quiz',
    'kana_kanji',
    'Câu hỏi trắc nghiệm',
    'Chọn đáp án đúng.',
    2,
    '{
      "questions": [
        {
          "questionId": "question-1",
          "prompt": "Chọn lời chào phù hợp.",
          "explanationVietnamese": "secret-explanation-marker",
          "options": [
            {"optionId": "option-a", "text": "こんにちは", "isCorrect": true},
            {"optionId": "option-b", "text": "ありがとう", "isCorrect": false}
          ]
        }
      ],
      "internalScoringKey": "secret-internal-marker"
    }'::jsonb,
    'published',
    '42000000-0000-0000-0000-000000000001'
  ),
  (
    'ja-n5-catalog-security-listening',
    'ja-n5-catalog-security-v1',
    'ja-n5-catalog-security-u1-l1',
    2,
    'listening',
    'kana_kanji',
    'Nghe câu chào',
    'Nghe và chọn đáp án.',
    3,
    '{
      "audioAssetPath": "audio/hello.mp3",
      "audioProductionStatus": "recorded",
      "audioSha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "transcript": "こんにちは",
      "transcriptVietnamese": "secret-translation-marker",
      "questions": [
        {
          "questionId": "question-2",
          "prompt": "Người nói đang chào thế nào?",
          "explanationVietnamese": "secret-listening-explanation-marker",
          "options": [
            {"optionId": "option-a", "text": "Chào buổi sáng", "isCorrect": true},
            {"optionId": "option-b", "text": "Cảm ơn", "isCorrect": false}
          ]
        }
      ]
    }'::jsonb,
    'published',
    '42000000-0000-0000-0000-000000000001'
  ),
  (
    'ja-n5-catalog-security-retrieval',
    'ja-n5-catalog-security-v1',
    'ja-n5-catalog-security-u1-l1',
    3,
    'retrieval',
    'kana_kanji',
    'Nhớ lại từ vựng',
    'Trả lời bằng tiếng Nhật.',
    2,
    '{
      "prompt": "わたし",
      "promptVietnamese": "Nghĩa là gì?",
      "acceptedAnswers": ["tôi", "mình", "secret-answer-marker"]
    }'::jsonb,
    'published',
    '42000000-0000-0000-0000-000000000001'
  ),
  (
    'ja-n5-catalog-security-reading',
    'ja-n5-catalog-security-v1',
    'ja-n5-catalog-security-u1-l1',
    4,
    'reading',
    'kana_kanji',
    'Đọc hiểu',
    'Đọc và chọn đáp án.',
    3,
    '{
      "text": "私は学生です。",
      "translationVietnamese": "secret-reading-translation-marker",
      "questions": [
        {
          "questionId": "question-3",
          "prompt": "Người nói là ai?",
          "explanationVietnamese": "secret-reading-explanation-marker",
          "options": [
            {"optionId": "option-a", "text": "Học sinh", "isCorrect": true},
            {"optionId": "option-b", "text": "Giáo viên", "isCorrect": false}
          ]
        }
      ]
    }'::jsonb,
    'published',
    '42000000-0000-0000-0000-000000000001'
  ),
  (
    'ja-n5-catalog-security-speaking',
    'ja-n5-catalog-security-v1',
    'ja-n5-catalog-security-u1-l1',
    5,
    'speaking',
    'kana_kanji',
    'Nói lời chào',
    'Thực hành nói.',
    3,
    '{
      "scenarioVietnamese": "Chào một bạn cùng lớp.",
      "targetPrompt": "こんにちは。",
      "rubricVietnamese": "secret-speaking-rubric-marker"
    }'::jsonb,
    'published',
    '42000000-0000-0000-0000-000000000001'
  ),
  (
    'ja-n5-catalog-security-writing',
    'ja-n5-catalog-security-v1',
    'ja-n5-catalog-security-u1-l1',
    6,
    'writing',
    'kana_kanji',
    'Viết lời chào',
    'Thực hành viết.',
    3,
    '{
      "scenarioVietnamese": "Viết cho một bạn cùng lớp.",
      "targetPrompt": "こんにちは。",
      "rubricVietnamese": "secret-writing-rubric-marker"
    }'::jsonb,
    'published',
    '42000000-0000-0000-0000-000000000001'
  ),
  (
    'ja-n5-catalog-security-grammar',
    'ja-n5-catalog-security-v1',
    'ja-n5-catalog-security-u1-l1',
    7,
    'grammar',
    'kana_kanji',
    'Mẫu câu',
    'Đọc ví dụ.',
    2,
    '{
      "grammarPoint": "A は B です",
      "explanationVietnamese": "Câu khẳng định cơ bản.",
      "examples": [{
        "value": "私は学生です。",
        "translationVietnamese": "Tôi là học sinh.",
        "editorialAnswerNote": "secret-grammar-example-marker"
      }],
      "unapprovedEditorialNote": "secret-editorial-marker"
    }'::jsonb,
    'published',
    '42000000-0000-0000-0000-000000000001'
  ),
  (
    'ja-n5-catalog-security-vocabulary',
    'ja-n5-catalog-security-v1',
    'ja-n5-catalog-security-u1-l1',
    8,
    'vocabulary',
    'kana_kanji',
    'Từ vựng lời chào',
    'Ghi nhớ từ mới.',
    2,
    '{
      "entries": [{
        "term": "学生",
        "reading": "がくせい",
        "meaningVietnamese": "học sinh",
        "example": {
          "value": "私は学生です。",
          "translationVietnamese": "Tôi là học sinh.",
          "editorialAnswerNote": "secret-vocabulary-example-marker"
        },
        "internalDifficulty": "secret-vocabulary-entry-marker"
      }]
    }'::jsonb,
    'published',
    '42000000-0000-0000-0000-000000000001'
  );

update public.content_releases
set release_status = 'published'
where content_release_id = 'ja-n5-catalog-security-v1';

insert into public.content_releases (
  content_release_id,
  path_id,
  version,
  title_vietnamese,
  release_status,
  provenance_id
)
select
  fixture.content_release_id,
  learning_paths.path_id,
  fixture.version,
  fixture.title_vietnamese,
  'draft',
  '42000000-0000-0000-0000-000000000001'
from public.learning_paths
cross join (
  values
    (
      'ja-n5-catalog-empty-unit-v1',
      'v1.0.1',
      'Kiểm thử đơn vị trống'
    ),
    (
      'ja-n5-catalog-empty-lesson-v1',
      'v1.0.2',
      'Kiểm thử bài học trống'
    ),
    (
      'ja-n5-catalog-invalid-payload-v1',
      'v1.0.3',
      'Kiểm thử payload không hợp lệ'
    )
) as fixture(content_release_id, version, title_vietnamese)
where learning_paths.language_code = 'ja'
  and learning_paths.level_code = 'N5'
  and learning_paths.objective_key = 'exam';

insert into public.content_units (
  unit_id,
  content_release_id,
  sequence,
  title_vietnamese,
  status,
  provenance_id
)
values
  (
    'ja-n5-catalog-empty-unit-u1',
    'ja-n5-catalog-empty-unit-v1',
    1,
    'Đơn vị đầy đủ',
    'published',
    '42000000-0000-0000-0000-000000000001'
  ),
  (
    'ja-n5-catalog-empty-unit-u2',
    'ja-n5-catalog-empty-unit-v1',
    2,
    'Đơn vị trống',
    'published',
    '42000000-0000-0000-0000-000000000001'
  ),
  (
    'ja-n5-catalog-empty-lesson-u1',
    'ja-n5-catalog-empty-lesson-v1',
    1,
    'Đơn vị có bài học trống',
    'published',
    '42000000-0000-0000-0000-000000000001'
  ),
  (
    'ja-n5-catalog-invalid-payload-u1',
    'ja-n5-catalog-invalid-payload-v1',
    1,
    'Đơn vị kiểm thử payload',
    'published',
    '42000000-0000-0000-0000-000000000001'
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
values
  (
    'ja-n5-catalog-empty-unit-u1-l1',
    'ja-n5-catalog-empty-unit-v1',
    'ja-n5-catalog-empty-unit-u1',
    1,
    'Bài học đầy đủ',
    'Nhánh đối chứng có hoạt động.',
    5,
    'published',
    '42000000-0000-0000-0000-000000000001'
  ),
  (
    'ja-n5-catalog-empty-lesson-u1-l1',
    'ja-n5-catalog-empty-lesson-v1',
    'ja-n5-catalog-empty-lesson-u1',
    1,
    'Bài học đầy đủ',
    'Nhánh đối chứng có hoạt động.',
    5,
    'published',
    '42000000-0000-0000-0000-000000000001'
  ),
  (
    'ja-n5-catalog-empty-lesson-u1-l2',
    'ja-n5-catalog-empty-lesson-v1',
    'ja-n5-catalog-empty-lesson-u1',
    2,
    'Bài học trống',
    'Bài học không có hoạt động.',
    5,
    'published',
    '42000000-0000-0000-0000-000000000001'
  ),
  (
    'ja-n5-catalog-invalid-payload-u1-l1',
    'ja-n5-catalog-invalid-payload-v1',
    'ja-n5-catalog-invalid-payload-u1',
    1,
    'Bài học kiểm thử payload',
    'Bài học nhận payload biên.',
    5,
    'published',
    '42000000-0000-0000-0000-000000000001'
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
values
  (
    'ja-n5-catalog-empty-unit-u1-l1-a1',
    'ja-n5-catalog-empty-unit-v1',
    'ja-n5-catalog-empty-unit-u1-l1',
    1,
    'retrieval',
    'kana_kanji',
    'Hoạt động đối chứng',
    'Trả lời.',
    1,
    '{"prompt":"私","promptVietnamese":"Nghĩa là gì?","acceptedAnswers":["tôi"]}'::jsonb,
    'published',
    '42000000-0000-0000-0000-000000000001'
  ),
  (
    'ja-n5-catalog-empty-lesson-u1-l1-a1',
    'ja-n5-catalog-empty-lesson-v1',
    'ja-n5-catalog-empty-lesson-u1-l1',
    1,
    'retrieval',
    'kana_kanji',
    'Hoạt động đối chứng',
    'Trả lời.',
    1,
    '{"prompt":"私","promptVietnamese":"Nghĩa là gì?","acceptedAnswers":["tôi"]}'::jsonb,
    'published',
    '42000000-0000-0000-0000-000000000001'
  );

select throws_ok(
  $$
    update public.content_releases
    set release_status = 'published'
    where content_release_id = 'ja-n5-catalog-empty-unit-v1'
  $$,
  '23514',
  'Published content units require at least one published lesson.',
  'a release cannot publish when any published unit has zero published lessons'
);
select throws_ok(
  $$
    update public.content_releases
    set release_status = 'published'
    where content_release_id = 'ja-n5-catalog-empty-lesson-v1'
  $$,
  '23514',
  'Published lessons require at least one published activity.',
  'a release cannot publish when any published lesson has zero published activities'
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
      'ja-n5-catalog-invalid-payload-u1-l1-a1',
      'ja-n5-catalog-invalid-payload-v1',
      'ja-n5-catalog-invalid-payload-u1-l1',
      1,
      'objective_quiz',
      'kana_kanji',
      'Payload phình nở',
      'Chọn đáp án.',
      1,
      jsonb_build_object(
        'questions',
        (select jsonb_agg(1) from generate_series(1, 20000))
      ),
      'published',
      '42000000-0000-0000-0000-000000000001'
    )
  $$,
  '23514',
  'Published activities require a valid bounded learner payload.',
  'publication rejects a compact malformed question array before projection expands it'
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
      'ja-n5-catalog-invalid-payload-u1-l1-a2',
      'ja-n5-catalog-invalid-payload-v1',
      'ja-n5-catalog-invalid-payload-u1-l1',
      2,
      'retrieval',
      'kana_kanji',
      'Payload thiếu trường',
      'Trả lời.',
      1,
      '{"prompt":"私"}'::jsonb,
      'published',
      '42000000-0000-0000-0000-000000000001'
    )
  $$,
  '23514',
  'Published activities require a valid bounded learner payload.',
  'publication rejects a payload with a missing required primitive field'
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
      'ja-n5-catalog-invalid-payload-u1-l1-a3',
      'ja-n5-catalog-invalid-payload-v1',
      'ja-n5-catalog-invalid-payload-u1-l1',
      3,
      'retrieval',
      'kana_kanji',
      'Payload UTF-16',
      'Trả lời.',
      1,
      jsonb_build_object(
        'prompt',
        repeat('😀', 1001),
        'promptVietnamese',
        'Giới hạn UTF-16'
      ),
      'published',
      '42000000-0000-0000-0000-000000000001'
    )
  $$,
  '23514',
  'Published activities require a valid bounded learner payload.',
  'publication measures non-BMP strings with the same UTF-16 length as Zod'
);

select ok(
  not has_table_privilege('authenticated', 'public.language_packs', 'select'),
  'authenticated clients have no direct SELECT privilege on raw language packs'
);
select ok(
  not has_table_privilege('authenticated', 'public.learning_objectives', 'select'),
  'authenticated clients have no direct SELECT privilege on raw learning objectives'
);
select ok(
  not has_table_privilege('authenticated', 'public.level_definitions', 'select'),
  'authenticated clients have no direct SELECT privilege on raw level definitions'
);
select ok(
  not has_table_privilege('authenticated', 'public.learning_paths', 'select'),
  'authenticated clients have no direct SELECT privilege on raw learning paths'
);
select ok(
  not has_table_privilege('authenticated', 'public.content_releases', 'select'),
  'authenticated clients have no direct SELECT privilege on raw content releases'
);
select ok(
  not has_table_privilege('authenticated', 'public.content_units', 'select'),
  'authenticated clients have no direct SELECT privilege on raw content units'
);
select ok(
  not has_table_privilege('authenticated', 'public.lessons', 'select'),
  'authenticated clients have no direct SELECT privilege on raw lessons'
);
select ok(
  not has_table_privilege('authenticated', 'public.activities', 'select'),
  'authenticated clients have no direct SELECT privilege on raw activities'
);
select ok(
  to_regprocedure('public.get_learner_catalog_activities()') is null,
  'the formerly public activity RPC is removed from the Data API boundary'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.get_learner_catalog_data()',
    'execute'
  ),
  'authenticated clients receive only the safe aggregate learner catalog RPC'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'private.project_learner_catalog_payload(text,jsonb)',
    'execute'
  ),
  'authenticated clients cannot invoke the payload projector directly'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'private.get_learner_catalog_activities()',
    'execute'
  ),
  'authenticated clients cannot invoke the private activity reader directly'
);
select ok(
  not exists (
    select 1
    from (
      values ('anon'), ('authenticated'), ('service_role')
    ) as api_role(role_name)
    cross join (
      values
        ('private.learner_catalog_utf16_length(text)'),
        ('private.is_learner_catalog_bounded_string(jsonb,integer,integer)'),
        ('private.is_valid_learner_catalog_example(jsonb)'),
        ('private.are_valid_learner_catalog_questions(jsonb,integer)'),
        ('private.require_learner_catalog_activity_payload(text,jsonb)'),
        ('private.enforce_learner_catalog_activity_payload()'),
        ('private.require_learner_catalog_release_structure(text)'),
        ('private.enforce_learner_catalog_release_structure()'),
        ('private.enforce_learner_catalog_response_budget(jsonb)')
    ) as private_function(signature)
    where has_function_privilege(
      api_role.role_name,
      private_function.signature,
      'execute'
    )
  ),
  'learner validation and budget helpers are not callable by API roles'
);

select set_config('request.jwt.claim.sub', '41000000-0000-0000-0000-000000000001', true);
set local role authenticated;

select throws_ok(
  $$select payload from public.activities$$,
  '42501',
  null,
  'an active learner cannot select raw answer-bearing payloads'
);
select throws_ok(
  $$select language_code from public.language_packs$$,
  '42501',
  null,
  'an active learner cannot select raw catalog structure'
);
select is(
  jsonb_array_length(public.get_learner_catalog_data() -> 'activities'),
  8,
  'an active learner can read every published safe activity prompt through the aggregate RPC'
);
select ok(
  jsonb_array_length(public.get_learner_catalog_data() -> 'paths') > 0,
  'the safe aggregate RPC preserves learner-visible catalog structure'
);
select ok(
  not exists (
    select 1
    from jsonb_array_elements(public.get_learner_catalog_data() -> 'paths') as path(value)
    where not exists (
      select 1
      from jsonb_array_elements(public.get_learner_catalog_data() -> 'releases') as release(value)
      where release.value ->> 'path_id' = path.value ->> 'path_id'
    )
  ),
  'every learner-visible path has at least one learner-visible release'
);
select ok(
  not (
    public.get_learner_catalog_data()::text
    ~ 'secret-[a-z-]+-marker'
  ),
  'the safe RPC deep-projects every seeded answer, rubric, translation, and editorial marker'
);
select ok(
  not exists (
    select 1
    from jsonb_array_elements(public.get_learner_catalog_data() -> 'activities') as activity(value)
    cross join lateral jsonb_array_elements(
      coalesce(activity.value -> 'payload' -> 'questions', '[]'::jsonb)
    ) as question(value)
    where question.value ? 'explanationVietnamese'
      or (question.value -> 'options')::text like '%isCorrect%'
  ),
  'the safe RPC removes correctness and explanations from nested questions'
);
select is(
  (
    select activity.value -> 'payload' -> 'questions' -> 0 -> 'options' -> 0 ->> 'text'
    from jsonb_array_elements(public.get_learner_catalog_data() -> 'activities') as activity(value)
    where activity.value ->> 'activity_id' = 'ja-n5-catalog-security-objective'
  ),
  'こんにちは',
  'the safe RPC preserves learner-visible objective options'
);
select is(
  (
    select activity.value -> 'payload' -> 'examples' -> 0 ->> 'value'
    from jsonb_array_elements(public.get_learner_catalog_data() -> 'activities') as activity(value)
    where activity.value ->> 'activity_id' = 'ja-n5-catalog-security-grammar'
  ),
  '私は学生です。',
  'the safe RPC preserves an allowlisted grammar example'
);
select is(
  (
    select activity.value -> 'payload' -> 'entries' -> 0 ->> 'term'
    from jsonb_array_elements(public.get_learner_catalog_data() -> 'activities') as activity(value)
    where activity.value ->> 'activity_id' = 'ja-n5-catalog-security-vocabulary'
  ),
  '学生',
  'the safe RPC preserves an allowlisted vocabulary entry'
);
select ok(
  not exists (
    select 1
    from jsonb_array_elements(public.get_learner_catalog_data() -> 'activities') as activity(value)
    where activity.value ? 'status'
      or activity.value ? 'provenance_id'
      or activity.value ? 'accessibility_metadata'
      or activity.value ? 'created_at'
  ),
  'the safe RPC excludes internal activity state and provenance columns'
);
select ok(
  not exists (
    select 1
    from jsonb_array_elements(public.get_learner_catalog_data() -> 'releases') as release(value)
    where release.value ? 'provenance_id'
      or release.value ? 'created_at'
      or release.value ? 'updated_at'
  ),
  'the safe RPC excludes internal release provenance and timestamp columns'
);
select ok(
  not exists (
    select 1
    from jsonb_array_elements(public.get_learner_catalog_data() -> 'units') as unit(value)
    where unit.value ? 'provenance_id'
      or unit.value ? 'created_at'
      or unit.value ? 'updated_at'
  ),
  'the safe RPC excludes internal unit provenance and timestamp columns'
);
select ok(
  not exists (
    select 1
    from jsonb_array_elements(public.get_learner_catalog_data() -> 'lessons') as lesson(value)
    where lesson.value ? 'provenance_id'
      or lesson.value ? 'created_at'
      or lesson.value ? 'updated_at'
  ),
  'the safe RPC excludes internal lesson provenance and timestamp columns'
);

reset role;
reset "request.jwt.claim.sub";

insert into public.content_releases (
  content_release_id,
  path_id,
  version,
  title_vietnamese,
  release_status,
  provenance_id
)
select
  'ja-n5-catalog-expanded-response-v1',
  learning_paths.path_id,
  'v1.0.4',
  'Kiểm thử giới hạn phản hồi catalog',
  'draft',
  '42000000-0000-0000-0000-000000000001'
from public.learning_paths
where learning_paths.language_code = 'ja'
  and learning_paths.level_code = 'N5'
  and learning_paths.objective_key = 'exam';

insert into public.content_units (
  unit_id,
  content_release_id,
  sequence,
  title_vietnamese,
  status,
  provenance_id
)
values (
  'ja-n5-catalog-expanded-response-u1',
  'ja-n5-catalog-expanded-response-v1',
  1,
  'Đơn vị phản hồi lớn',
  'published',
  '42000000-0000-0000-0000-000000000001'
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
select
  format('ja-n5-catalog-expanded-response-u1-l%s', lesson_number),
  'ja-n5-catalog-expanded-response-v1',
  'ja-n5-catalog-expanded-response-u1',
  lesson_number,
  format('Bài học phản hồi lớn %s', lesson_number),
  'Bài học dùng để kiểm thử giới hạn phản hồi chính xác.',
  20,
  'published',
  '42000000-0000-0000-0000-000000000001'
from generate_series(1, 15) as lesson_number;

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
select
  format(
    'ja-n5-catalog-expanded-response-u1-l%s-a%s',
    lesson_number,
    activity_number
  ),
  'ja-n5-catalog-expanded-response-v1',
  format('ja-n5-catalog-expanded-response-u1-l%s', lesson_number),
  activity_number,
  'retrieval',
  'kana_kanji',
  format('Hoạt động phản hồi lớn %s-%s', lesson_number, activity_number),
  repeat('x', 2000),
  1,
  '{"prompt":"私","promptVietnamese":"Nghĩa là gì?","acceptedAnswers":["tôi"]}'::jsonb,
  'published',
  '42000000-0000-0000-0000-000000000001'
from generate_series(1, 15) as lesson_number
cross join generate_series(1, 20) as activity_number;

update public.content_releases
set release_status = 'published'
where content_release_id = 'ja-n5-catalog-expanded-response-v1';

select lives_ok(
  $$select private.assert_learner_catalog_budget()$$,
  'the count and raw-source preflight remains below its defensive budget'
);

select set_config('request.jwt.claim.sub', '41000000-0000-0000-0000-000000000001', true);
set local role authenticated;

select throws_ok(
  $$select public.get_learner_catalog_data()$$,
  '54000',
  'Learner catalog response exceeds the 512 KiB endpoint budget.',
  'the public RPC rejects a fully projected aggregate larger than 512 KiB'
);

reset role;
reset "request.jwt.claim.sub";
set local role anon;

select throws_ok(
  $$select public.get_learner_catalog_data()$$,
  '42501',
  null,
  'anonymous clients cannot call the safe aggregate learner catalog RPC'
);

reset role;

update public.profiles
set account_state = 'frozen', revoked_at = clock_timestamp()
where user_id = '41000000-0000-0000-0000-000000000001';

select set_config('request.jwt.claim.sub', '41000000-0000-0000-0000-000000000001', true);
set local role authenticated;

select is(
  public.get_learner_catalog_data(),
  jsonb_build_object(
    'language_packs', '[]'::jsonb,
    'paths', '[]'::jsonb,
    'releases', '[]'::jsonb,
    'units', '[]'::jsonb,
    'lessons', '[]'::jsonb,
    'activities', '[]'::jsonb
  ),
  'a frozen learner loses aggregate safe catalog access'
);

reset role;
reset "request.jwt.claim.sub";

select * from finish();
rollback;
