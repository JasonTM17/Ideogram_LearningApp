begin;

select plan(38);

select ok(
  (
    select count(*)
    from pg_class
    where oid in (
      'public.placement_question_sets'::regclass,
      'public.placement_questions'::regclass
    )
      and relrowsecurity
  ) = 2,
  'placement catalogs are protected by row-level security'
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
    private.hash_email('placement-a@example.test'),
    private.hash_secret('placement-approval-a'),
    'adult-beta-v1',
    repeat('a', 64),
    clock_timestamp(),
    clock_timestamp() + interval '15 minutes'
  ),
  (
    private.hash_email('placement-b@example.test'),
    private.hash_secret('placement-approval-b'),
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
    '12000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'placement-a@example.test',
    clock_timestamp(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"registration_approval_token":"placement-approval-a"}'::jsonb,
    clock_timestamp(),
    clock_timestamp()
  ),
  (
    '12000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'placement-b@example.test',
    clock_timestamp(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"registration_approval_token":"placement-approval-b"}'::jsonb,
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
  '22000000-0000-0000-0000-000000000001',
  'original',
  'Original placement question authored for local lifecycle tests.',
  'ideogram-original-placement-test-v1',
  'Learning Content Team',
  'Vietnamese Pedagogy Reviewer',
  true,
  true,
  true,
  true
);

insert into public.placement_question_sets (
  placement_question_set_id,
  language_code,
  objective_key,
  placement_version,
  title_vietnamese,
  provenance_id
)
values
  (
    '32000000-0000-0000-0000-000000000001',
    'ja',
    'exam',
    'v1.0.0',
    'Xếp lớp tiếng Nhật N5',
    '22000000-0000-0000-0000-000000000001'
  ),
  (
    '32000000-0000-0000-0000-000000000002',
    'zh',
    'exam',
    'v1.0.0',
    'Xếp lớp tiếng Trung chưa phát hành',
    '22000000-0000-0000-0000-000000000001'
  );

insert into public.placement_questions (
  placement_question_id,
  placement_question_set_id,
  question_key,
  sequence,
  question_type,
  prompt_payload,
  scoring_rubric,
  status,
  provenance_id
)
values
  (
    '42000000-0000-0000-0000-000000000001',
    '32000000-0000-0000-0000-000000000001',
    'ja-greeting-meaning',
    1,
    'vocabulary',
    '{
      "promptVietnamese": "「こんにちは」 có nghĩa gần nhất là gì?",
      "choices": ["Xin chào", "Tạm biệt", "Cảm ơn"]
    }'::jsonb,
    '{"correctChoice": 0, "skill": "vocabulary"}'::jsonb,
    'published',
    '22000000-0000-0000-0000-000000000001'
  ),
  (
    '42000000-0000-0000-0000-000000000002',
    '32000000-0000-0000-0000-000000000002',
    'zh-greeting-meaning',
    1,
    'vocabulary',
    '{
      "promptVietnamese": "「你好」 có nghĩa gần nhất là gì?",
      "choices": ["Xin chào", "Tạm biệt", "Cảm ơn"]
    }'::jsonb,
    '{"correctChoice": 0, "skill": "vocabulary"}'::jsonb,
    'published',
    '22000000-0000-0000-0000-000000000001'
  );

select lives_ok(
  $$
    update public.placement_question_sets
    set status = 'published'
    where placement_question_set_id = '32000000-0000-0000-0000-000000000001'
  $$,
  'a reviewed Japanese question bank can be published'
);
select is(
  (
    select status
    from public.placement_question_sets
    where placement_question_set_id = '32000000-0000-0000-0000-000000000001'
  ),
  'published',
  'the Japanese placement set records its published state'
);

select set_config('request.jwt.claim.sub', '12000000-0000-0000-0000-000000000001', true);
set local role authenticated;

select is(
  (
    select count(*)
    from public.placement_question_sets
    where placement_question_set_id = '32000000-0000-0000-0000-000000000001'
  ),
  1::bigint,
  'an active learner sees the published Japanese test placement set'
);
select is(
  (
    select count(*)
    from public.placement_questions
    where placement_question_set_id = '32000000-0000-0000-0000-000000000001'
  ),
  1::bigint,
  'an active learner sees the test question from its published visible set'
);
select lives_ok(
  $$
    select prompt_payload
    from public.placement_questions
    where placement_question_id = '42000000-0000-0000-0000-000000000001'
  $$,
  'an active learner can read the placement prompt projection'
);
select lives_ok(
  $$
    select placement_question_set_id, status
    from public.placement_questions
    where placement_question_id = '42000000-0000-0000-0000-000000000001'
  $$,
  'an active learner can project the safe relation columns required by PostgREST'
);
select throws_ok(
  $$
    select scoring_rubric
    from public.placement_questions
    where placement_question_id = '42000000-0000-0000-0000-000000000001'
  $$,
  '42501',
  null,
  'an active learner cannot read placement answer keys or scoring rubrics'
);
select throws_ok(
  $$
    select to_jsonb(placement_questions)
    from public.placement_questions
    where placement_question_id = '42000000-0000-0000-0000-000000000001'
  $$,
  '42501',
  null,
  'a whole-row JSON projection cannot bypass placement rubric column privileges'
);
select throws_ok(
  $$
    select *
    from private.get_placement_scoring_input(
      '00000000-0000-0000-0000-000000000000'
    )
  $$,
  '42501',
  null,
  'an active learner cannot invoke the worker-only scoring reader'
);
select throws_ok(
  $$ select * from public.claim_placement_scoring_job('82000000-0000-0000-0000-000000000001') $$,
  '42501',
  null,
  'an active learner cannot claim through the PostgREST worker RPC'
);
select throws_ok(
  $$
    select *
    from public.get_placement_scoring_input('00000000-0000-0000-0000-000000000000')
  $$,
  '42501',
  null,
  'an active learner cannot read scoring input through the PostgREST worker RPC'
);
select throws_ok(
  $$
    select *
    from public.complete_placement_scoring_job(
      '82000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000000',
      'N5',
      0.5,
      '{}'::jsonb
    )
  $$,
  '42501',
  null,
  'an active learner cannot complete through the PostgREST worker RPC'
);
select throws_ok(
  $$
    select public.fail_placement_scoring_job(
      '82000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000000',
      'unsupported_scoring_input'
    )
  $$,
  '42501',
  null,
  'an active learner cannot quarantine through the PostgREST worker RPC'
);

reset role;
reset "request.jwt.claim.sub";

select throws_ok(
  $$
    update public.placement_question_sets
    set status = 'published'
    where placement_question_set_id = '32000000-0000-0000-0000-000000000002'
  $$,
  '23514',
  'Only an active language pack may publish placement questions.',
  'a hidden Chinese pack cannot publish its placement set'
);

set local role app_learning_api_executor;
do $block$
begin
  perform private.start_placement_session(
    '12000000-0000-0000-0000-000000000001',
    '32000000-0000-0000-0000-000000000001',
    '52000000-0000-0000-0000-000000000001'
  );
end;
$block$;
reset role;

select ok(
  exists (
    select 1
    from public.placement_sessions
    where user_id = '12000000-0000-0000-0000-000000000001'
      and idempotency_key = '52000000-0000-0000-0000-000000000001'
  ),
  'the restricted API executor starts a placement session'
);
select set_config(
  'test.placement_session_id',
  (
    select placement_session_id::text
    from public.placement_sessions
    where idempotency_key = '52000000-0000-0000-0000-000000000001'
  ),
  true
);

set local role app_learning_api_executor;
do $block$
begin
  perform private.record_placement_answer(
    '12000000-0000-0000-0000-000000000001',
    current_setting('test.placement_session_id')::uuid,
    '42000000-0000-0000-0000-000000000001',
    1,
    '62000000-0000-0000-0000-000000000001',
    '72000000-0000-0000-0000-000000000001',
    1,
    repeat('a', 64),
    '{"selectedChoice":0}'::jsonb,
    850,
    '2026-07-29T12:00:00.000Z'::timestamptz
  );
end;
$block$;
reset role;

select ok(
  exists (
    select 1
    from public.placement_answers
    where user_id = '12000000-0000-0000-0000-000000000001'
      and idempotency_key = '62000000-0000-0000-0000-000000000001'
  ),
  'the placement transaction records answer evidence'
);
select ok(
  (
    select idempotent_replay
    from private.record_placement_answer(
      '12000000-0000-0000-0000-000000000001',
      (
        select placement_session_id
        from public.placement_sessions
        where idempotency_key = '52000000-0000-0000-0000-000000000001'
      ),
      '42000000-0000-0000-0000-000000000001',
      1,
      '62000000-0000-0000-0000-000000000001',
      '72000000-0000-0000-0000-000000000001',
      1,
      repeat('a', 64),
      '{"selectedChoice":0}'::jsonb,
      850,
      '2026-07-29T12:00:00.000Z'::timestamptz
    )
  ),
  'an identical placement-answer retry returns the original receipt'
);
select throws_ok(
  $$
    select *
    from private.record_placement_answer(
      '12000000-0000-0000-0000-000000000001',
      (
        select placement_session_id
        from public.placement_sessions
        where idempotency_key = '52000000-0000-0000-0000-000000000001'
      ),
      '42000000-0000-0000-0000-000000000001',
      1,
      '62000000-0000-0000-0000-000000000001',
      '72000000-0000-0000-0000-000000000001',
      1,
      repeat('b', 64),
      '{"selectedChoice":1}'::jsonb,
      850,
      clock_timestamp()
    )
  $$,
  '22023',
  'Placement answer idempotency key was reused with another payload.',
  'a placement answer key cannot be reused with different evidence'
);
select throws_ok(
  $$
    select *
    from private.record_placement_answer(
      '12000000-0000-0000-0000-000000000001',
      (
        select placement_session_id
        from public.placement_sessions
        where idempotency_key = '52000000-0000-0000-0000-000000000001'
      ),
      '42000000-0000-0000-0000-000000000001',
      1,
      '62000000-0000-0000-0000-000000000001',
      '72000000-0000-0000-0000-000000000001',
      1,
      repeat('a', 64),
      '{"selectedChoice":1}'::jsonb,
      850,
      '2026-07-29T12:00:00.000Z'::timestamptz
    )
  $$,
  '22023',
  'Placement answer idempotency key was reused with another payload.',
  'a placement answer key cannot reuse an unchanged hash with changed evidence'
);

set local role app_learning_api_executor;
do $block$
begin
  perform private.submit_placement_session(
    '12000000-0000-0000-0000-000000000001',
    current_setting('test.placement_session_id')::uuid
  );
end;
$block$;
reset role;

select is(
  (
    select session_status
    from public.placement_sessions
    where idempotency_key = '52000000-0000-0000-0000-000000000001'
  ),
  'submitted',
  'a draft placement with evidence can be submitted'
);
select ok(
  (
    select idempotent_replay
    from private.record_placement_answer(
      '12000000-0000-0000-0000-000000000001',
      current_setting('test.placement_session_id')::uuid,
      '42000000-0000-0000-0000-000000000001',
      1,
      '62000000-0000-0000-0000-000000000001',
      '72000000-0000-0000-0000-000000000001',
      1,
      repeat('a', 64),
      '{"selectedChoice":0}'::jsonb,
      850,
      '2026-07-29T12:00:00.000Z'::timestamptz
    )
  ),
  'an offline answer retry remains idempotent after session submission'
);

set local role service_role;
select is(
  (
    select scoring_rubric ->> 'correctChoice'
    from private.get_placement_scoring_input(
      current_setting('test.placement_session_id')::uuid
    )
    limit 1
  ),
  '0',
  'only the trusted worker can read a submitted answer key for scoring'
);
select set_config(
  'test.placement_worker_id',
  '82000000-0000-0000-0000-000000000001',
  true
);
select is(
  (
    select placement_session_id::text
    from private.claim_placement_scoring_job(
      current_setting('test.placement_worker_id')::uuid
    )
  ),
  current_setting('test.placement_session_id'),
  'the trusted worker claims the submitted placement job'
);
select is(
  (
    select count(*)
    from private.claim_placement_scoring_job(
      current_setting('test.placement_worker_id')::uuid
    )
  ),
  0::bigint,
  'a claimed placement job remains unavailable until its lease completes'
);
do $block$
begin
  perform private.complete_placement_scoring_job(
    current_setting('test.placement_worker_id')::uuid,
    current_setting('test.placement_session_id')::uuid,
    'N5',
    0.875,
    '{"correct":1,"total":1,"scorer":"placement-v1"}'::jsonb
  );
end;
$block$;
reset role;

select is(
  (
    select session_status
    from public.placement_sessions
    where idempotency_key = '52000000-0000-0000-0000-000000000001'
  ),
  'scored',
  'the worker scores only a submitted placement session'
);
select is(
  (
    select recommended_level_code || ':' || confidence::text
    from public.placement_sessions
    where idempotency_key = '52000000-0000-0000-0000-000000000001'
  ),
  'N5:0.875',
  'placement produces an internal level recommendation with confidence'
);
select is(
  (
    select count(*)
    from public.learner_proficiency_snapshots
    where placement_session_id = (
      select placement_session_id
      from public.placement_sessions
      where idempotency_key = '52000000-0000-0000-0000-000000000001'
    )
  ),
  1::bigint,
  'a scored placement appends one auditable proficiency snapshot'
);
select lives_ok(
  $$
    select private.score_placement_session(
      (
        select placement_session_id
        from public.placement_sessions
        where idempotency_key = '52000000-0000-0000-0000-000000000001'
      ),
      'N5',
      0.875,
      '{"correct":1,"total":1,"scorer":"placement-v1"}'::jsonb
    )
  $$,
  'an identical worker score retry is idempotent'
);
select throws_ok(
  $$
    update public.placement_answers
    set answer_payload = '{"selectedChoice":1}'::jsonb
    where idempotency_key = '62000000-0000-0000-0000-000000000001'
  $$,
  '42501',
  'Learner event history is append-only.',
  'placement answer evidence is immutable'
);
select throws_ok(
  $$
    update public.placement_questions
    set prompt_payload = '{"promptVietnamese":"Đã sửa"}'::jsonb
    where placement_question_id = '42000000-0000-0000-0000-000000000001'
  $$,
  '23514',
  'Questions in a published or archived placement set are immutable.',
  'published placement questions cannot be rewritten'
);
select throws_ok(
  $$
    update public.content_provenance
    set author_name = 'Đã sửa trái phép'
    where provenance_id = '22000000-0000-0000-0000-000000000001'
  $$,
  '23514',
  'Provenance attached to published content is immutable.',
  'published placement provenance cannot be rewritten'
);

select set_config('request.jwt.claim.sub', '12000000-0000-0000-0000-000000000002', true);
set local role authenticated;

select is(
  (select count(*) from public.placement_sessions),
  0::bigint,
  'another learner cannot read the placement session'
);
select is(
  (select count(*) from public.placement_answers),
  0::bigint,
  'another learner cannot read placement answer evidence'
);

reset role;
reset "request.jwt.claim.sub";

set local role app_learning_api_executor;
select set_config(
  'test.archived_draft_session_id',
  (
    select placement_session_id::text
    from private.start_placement_session(
      '12000000-0000-0000-0000-000000000001',
      '32000000-0000-0000-0000-000000000001',
      '52000000-0000-0000-0000-000000000002'
    )
  ),
  true
);
reset role;

update public.placement_question_sets
set status = 'archived'
where placement_question_set_id = '32000000-0000-0000-0000-000000000001';

select set_config('request.jwt.claim.sub', '12000000-0000-0000-0000-000000000001', true);
set local role authenticated;

select is(
  (
    select count(*)
    from public.placement_question_sets
    where placement_question_set_id = '32000000-0000-0000-0000-000000000001'
  ),
  0::bigint,
  'an archived placement test bank disappears from the learner catalog'
);
select is(
  (select count(*) from public.placement_sessions where session_status = 'scored'),
  1::bigint,
  'archiving the bank preserves the learner placement result'
);
select is(
  (
    select session_status
    from public.placement_sessions
    where placement_session_id = current_setting('test.archived_draft_session_id')::uuid
  ),
  'abandoned',
  'archiving the bank atomically abandons unfinished draft sessions'
);

reset role;
reset "request.jwt.claim.sub";

select throws_ok(
  $$
    select *
    from private.start_placement_session(
      '12000000-0000-0000-0000-000000000001',
      '32000000-0000-0000-0000-000000000001',
      '52000000-0000-0000-0000-000000000099'
    )
  $$,
  '42501',
  'Placement requires a published question set for an active language.',
  'an archived placement bank cannot start a new session'
);

select * from finish();
rollback;
