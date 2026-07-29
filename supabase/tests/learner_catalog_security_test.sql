begin;

select plan(15);

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
      "examples": [{"value": "私は学生です。", "translationVietnamese": "Tôi là học sinh."}],
      "unapprovedEditorialNote": "secret-editorial-marker"
    }'::jsonb,
    'published',
    '42000000-0000-0000-0000-000000000001'
  );

update public.content_releases
set release_status = 'published'
where content_release_id = 'ja-n5-catalog-security-v1';

select ok(
  not has_table_privilege('authenticated', 'public.activities', 'select'),
  'authenticated clients have no direct SELECT privilege on raw activities'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.get_learner_catalog_activities()',
    'execute'
  ),
  'authenticated clients receive only the safe learner catalog RPC'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'private.project_learner_catalog_payload(text,jsonb)',
    'execute'
  ),
  'authenticated clients cannot invoke the payload projector directly'
);

select set_config('request.jwt.claim.sub', '41000000-0000-0000-0000-000000000001', true);
set local role authenticated;

select throws_ok(
  $$select payload from public.activities$$,
  '42501',
  null,
  'an active learner cannot select raw answer-bearing payloads'
);
select is(
  (select count(*) from public.get_learner_catalog_activities()),
  7::bigint,
  'an active learner can read every published safe activity prompt through the RPC'
);
select is(
  (
    select payload -> 'questions' -> 0 -> 'options' -> 0 ->> 'text'
    from public.get_learner_catalog_activities()
    where activity_id = 'ja-n5-catalog-security-objective'
  ),
  'こんにちは',
  'the safe view preserves learner-visible objective options'
);
select ok(
  not exists (
    select 1
    from public.get_learner_catalog_activities()
    where payload::text ~ 'secret-(explanation|internal|translation|answer|speaking|writing|editorial)-marker'
  ),
  'the safe view excludes every seeded answer, rubric, translation, and editorial marker'
);
select ok(
  not exists (
    select 1
    from public.get_learner_catalog_activities()
    where payload ? 'acceptedAnswers'
      or payload ? 'rubricVietnamese'
      or payload ? 'audioSha256'
      or payload ? 'transcriptVietnamese'
      or payload ? 'translationVietnamese'
      or payload ? 'unapprovedEditorialNote'
  ),
  'the safe view allowlists top-level payload fields instead of subtracting known keys'
);
select ok(
  not exists (
    select 1
    from public.get_learner_catalog_activities()
    where (payload -> 'questions')::text like '%isCorrect%'
      or (payload -> 'questions')::text like '%explanationVietnamese%'
  ),
  'the safe view removes correctness and explanations from nested questions'
);
select is(
  (
    select payload ->> 'promptVietnamese'
    from public.get_learner_catalog_activities()
    where activity_id = 'ja-n5-catalog-security-retrieval'
  ),
  'Nghĩa là gì?',
  'the safe view preserves a learner-visible retrieval prompt'
);
select is(
  (
    select payload ->> 'targetPrompt'
    from public.get_learner_catalog_activities()
    where activity_id = 'ja-n5-catalog-security-speaking'
  ),
  'こんにちは。',
  'the safe view preserves a learner-visible speaking prompt'
);
select is(
  (
    select payload ->> 'audioAssetPath'
    from public.get_learner_catalog_activities()
    where activity_id = 'ja-n5-catalog-security-listening'
  ),
  'audio/hello.mp3',
  'the safe view preserves a learner-visible audio reference'
);
select ok(
  not exists (
    select 1
    from public.get_learner_catalog_activities() as activity
    where to_jsonb(activity) ? 'status'
      or to_jsonb(activity) ? 'provenance_id'
      or to_jsonb(activity) ? 'accessibility_metadata'
      or to_jsonb(activity) ? 'created_at'
  ),
  'the safe RPC excludes internal activity state and provenance columns'
);

reset role;
reset "request.jwt.claim.sub";
set local role anon;

select throws_ok(
  $$select * from public.get_learner_catalog_activities()$$,
  '42501',
  null,
  'anonymous clients cannot call the safe learner catalog RPC'
);

reset role;

update public.profiles
set account_state = 'frozen', revoked_at = clock_timestamp()
where user_id = '41000000-0000-0000-0000-000000000001';

select set_config('request.jwt.claim.sub', '41000000-0000-0000-0000-000000000001', true);
set local role authenticated;

select is(
  (select count(*) from public.get_learner_catalog_activities()),
  0::bigint,
  'a frozen learner loses safe catalog access'
);

reset role;
reset "request.jwt.claim.sub";

select * from finish();
rollback;
