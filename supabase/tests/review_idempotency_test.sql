begin;

select plan(41);

select ok(
  position(
    'pg_advisory_xact_lock' in pg_get_functiondef(
      'private.submit_activity_attempt(uuid,text,text,uuid,bigint,uuid,text,jsonb,text,numeric,text,timestamp with time zone,text)'::regprocedure
    )
  ) < position(
    'operation_now := pg_catalog.clock_timestamp()' in pg_get_functiondef(
      'private.submit_activity_attempt(uuid,text,text,uuid,bigint,uuid,text,jsonb,text,numeric,text,timestamp with time zone,text)'::regprocedure
    )
  ),
  'activity event time is captured after its per-learner serialization lock'
);
select ok(
  position(
    'pg_advisory_xact_lock' in pg_get_functiondef(
      'private.submit_review_event(uuid,uuid,uuid,uuid,bigint,text,text,timestamp with time zone,text)'::regprocedure
    )
  ) < position(
    'review_now := pg_catalog.clock_timestamp()' in pg_get_functiondef(
      'private.submit_review_event(uuid,uuid,uuid,uuid,bigint,text,text,timestamp with time zone,text)'::regprocedure
    )
  ),
  'review event time is captured after its per-learner serialization lock'
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
    private.hash_email('review-a@example.test'),
    private.hash_secret('review-approval-a'),
    'adult-beta-v1',
    repeat('c', 64),
    clock_timestamp(),
    clock_timestamp() + interval '15 minutes'
  ),
  (
    private.hash_email('review-b@example.test'),
    private.hash_secret('review-approval-b'),
    'adult-beta-v1',
    repeat('d', 64),
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
    '11000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'review-a@example.test',
    clock_timestamp(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"registration_approval_token":"review-approval-a"}'::jsonb,
    clock_timestamp(),
    clock_timestamp()
  ),
  (
    '11000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'review-b@example.test',
    clock_timestamp(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"registration_approval_token":"review-approval-b"}'::jsonb,
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
  '21000000-0000-0000-0000-000000000001',
  'original',
  'Original review protocol test corpus.',
  'ideogram-original-review-test-v1',
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
  'ja-n5-review-test-v1',
  path_id,
  'v1.0.0',
  'Nhật ngữ N5 — kiểm thử đồng bộ',
  'draft',
  '21000000-0000-0000-0000-000000000001'
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
  'ja-n5-review-u1',
  'ja-n5-review-test-v1',
  1,
  'Ôn tập',
  'published',
  '21000000-0000-0000-0000-000000000001'
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
  'ja-n5-review-u1-l1',
  'ja-n5-review-test-v1',
  'ja-n5-review-u1',
  1,
  'Ôn tập chào hỏi',
  'Bài học kiểm thử giao dịch.',
  10,
  'published',
  '21000000-0000-0000-0000-000000000001'
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
  'ja-n5-review-u1-l1-vocab',
  'ja-n5-review-test-v1',
  'ja-n5-review-u1-l1',
  1,
  'vocabulary',
  'kana_kanji',
  'Từ vựng ôn tập',
  'Trả lời hoạt động kiểm thử.',
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
  '21000000-0000-0000-0000-000000000001'
);

update public.content_releases
set release_status = 'published'
where content_release_id = 'ja-n5-review-test-v1';

insert into public.learner_enrollments (
  user_id,
  path_id,
  content_release_id
)
select
  learner.user_id,
  content_releases.path_id,
  content_releases.content_release_id
from (
  values
    ('11000000-0000-0000-0000-000000000001'::uuid),
    ('11000000-0000-0000-0000-000000000002'::uuid)
) as learner (user_id)
cross join public.content_releases
where content_releases.content_release_id = 'ja-n5-review-test-v1';

insert into public.review_items (
  item_id,
  user_id,
  content_release_id,
  activity_id,
  source_item_key
)
values
  (
    '41000000-0000-0000-0000-000000000001',
    '11000000-0000-0000-0000-000000000001',
    'ja-n5-review-test-v1',
    'ja-n5-review-u1-l1-vocab',
    'watashi'
  ),
  (
    '41000000-0000-0000-0000-000000000002',
    '11000000-0000-0000-0000-000000000001',
    'ja-n5-review-test-v1',
    'ja-n5-review-u1-l1-vocab',
    'desu'
  ),
  (
    '41000000-0000-0000-0000-000000000003',
    '11000000-0000-0000-0000-000000000002',
    'ja-n5-review-test-v1',
    'ja-n5-review-u1-l1-vocab',
    'other-learner'
  ),
  (
    '41000000-0000-0000-0000-000000000004',
    '11000000-0000-0000-0000-000000000001',
    'ja-n5-review-test-v1',
    'ja-n5-review-u1-l1-vocab',
    'relearning-sequence'
  );

set local role app_learning_api_executor;
do $block$
begin
  perform private.submit_review_event(
      '11000000-0000-0000-0000-000000000001',
      '41000000-0000-0000-0000-000000000001',
      '51000000-0000-0000-0000-000000000001',
      '61000000-0000-0000-0000-000000000001',
      1,
      repeat('a', 64),
      'good',
      '2026-03-08T06:55:00.000Z'::timestamptz,
      'Asia/Ho_Chi_Minh'
  );
end;
$block$;
reset role;

select ok(
  exists (
    select 1
    from public.review_events
    where idempotency_key = '51000000-0000-0000-0000-000000000001'
  ),
  'the restricted API executor accepts the first review transaction'
);
select is(
  (
    select next_interval_minutes
    from public.review_events
    where idempotency_key = '51000000-0000-0000-0000-000000000001'
  ),
  1440,
  'a first good grade creates a one-day interval'
);
select is(
  (
    select next_state
    from public.review_events
    where idempotency_key = '51000000-0000-0000-0000-000000000001'
  ),
  'review',
  'a first good grade moves the item into review state'
);
select is(
  (
    select server_receipt_sequence
    from public.review_events
    where idempotency_key = '51000000-0000-0000-0000-000000000001'
  ),
  1::bigint,
  'the first persisted review event receives the first server sequence'
);
select ok(
  (
    select idempotent_replay
    from private.submit_review_event(
      '11000000-0000-0000-0000-000000000001',
      '41000000-0000-0000-0000-000000000001',
      '51000000-0000-0000-0000-000000000001',
      '61000000-0000-0000-0000-000000000001',
      1,
      repeat('a', 64),
      'good',
      '2026-03-08T06:55:00.000Z'::timestamptz,
      'Asia/Ho_Chi_Minh'
    )
  ),
  'an identical idempotency key returns a replay receipt'
);
select is(
  (
    select count(*)
    from public.review_events
    where user_id = '11000000-0000-0000-0000-000000000001'
  ),
  1::bigint,
  'an idempotent replay does not append a duplicate review event'
);
select throws_ok(
  $$
    select *
    from private.submit_review_event(
      '11000000-0000-0000-0000-000000000001',
      '41000000-0000-0000-0000-000000000001',
      '51000000-0000-0000-0000-000000000001',
      '61000000-0000-0000-0000-000000000001',
      1,
      repeat('b', 64),
      'good',
      clock_timestamp(),
      'Asia/Ho_Chi_Minh'
    )
  $$,
  '22023',
  'Review idempotency key was reused with a different payload.',
  'a review key cannot be reused with a different payload hash'
);
select throws_ok(
  $$
    select *
    from private.submit_review_event(
      '11000000-0000-0000-0000-000000000001',
      '41000000-0000-0000-0000-000000000001',
      '51000000-0000-0000-0000-000000000001',
      '61000000-0000-0000-0000-000000000001',
      1,
      repeat('a', 64),
      'easy',
      '2026-03-08T06:55:00.000Z'::timestamptz,
      'Asia/Ho_Chi_Minh'
    )
  $$,
  '22023',
  'Review idempotency key was reused with a different payload.',
  'a review key cannot reuse an unchanged hash with another grade'
);
select throws_ok(
  $$
    select *
    from private.submit_review_event(
      '11000000-0000-0000-0000-000000000001',
      '41000000-0000-0000-0000-000000000001',
      '51000000-0000-0000-0000-000000000002',
      '61000000-0000-0000-0000-000000000001',
      1,
      repeat('c', 64),
      'good',
      clock_timestamp(),
      'Asia/Ho_Chi_Minh'
    )
  $$,
  '22023',
  'Device sequence was already used for another review event.',
  'a device sequence cannot create two distinct review events'
);
select lives_ok(
  $$
    select *
    from private.submit_review_event(
      '11000000-0000-0000-0000-000000000001',
      '41000000-0000-0000-0000-000000000001',
      '51000000-0000-0000-0000-000000000003',
      '61000000-0000-0000-0000-000000000001',
      2,
      repeat('d', 64),
      'hard',
      '2000-01-01T00:00:00.000Z'::timestamptz,
      'Asia/Ho_Chi_Minh'
    )
  $$,
  'a second device sequence is preserved as a distinct review event'
);
select is(
  (
    select server_receipt_sequence
    from public.review_events
    where idempotency_key = '51000000-0000-0000-0000-000000000003'
  ),
  2::bigint,
  'a later accepted event receives the next server receipt sequence'
);
select is(
  (
    select next_interval_minutes
    from public.review_events
    where idempotency_key = '51000000-0000-0000-0000-000000000003'
  ),
  1728,
  'hard grade advances the tested deterministic interval from one day'
);
select lives_ok(
  $$
    select *
    from private.submit_review_event(
      '11000000-0000-0000-0000-000000000001',
      '41000000-0000-0000-0000-000000000002',
      '51000000-0000-0000-0000-000000000004',
      '61000000-0000-0000-0000-000000000001',
      3,
      repeat('e', 64),
      'good',
      '2049-01-01T00:00:00.000Z'::timestamptz,
      'Asia/Ho_Chi_Minh'
    )
  $$,
  'a highly skewed client clock remains advisory rather than blocking the review'
);
select ok(
  (
    select next_due_at < clock_timestamp() + interval '2 days'
    from public.review_events
    where idempotency_key = '51000000-0000-0000-0000-000000000004'
  ),
  'the server clock, not the future client clock, sets the next due time'
);
update public.review_items
set interval_minutes = 5256000, ease_factor = 3.50
where item_id = '41000000-0000-0000-0000-000000000002';
select is(
  (
    select interval_minutes
    from private.submit_review_event(
      '11000000-0000-0000-0000-000000000001',
      '41000000-0000-0000-0000-000000000002',
      '51000000-0000-0000-0000-000000000007',
      '61000000-0000-0000-0000-000000000001',
      7,
      repeat('a', 64),
      'easy',
      clock_timestamp(),
      'Asia/Ho_Chi_Minh'
    )
  ),
  5256000,
  'the database scheduler caps a long-running easy chain before integer overflow'
);
select throws_ok(
  $$
    select *
    from private.submit_review_event(
      '11000000-0000-0000-0000-000000000001',
      '41000000-0000-0000-0000-000000000002',
      '51000000-0000-0000-0000-000000000005',
      '61000000-0000-0000-0000-000000000001',
      4,
      repeat('f', 64),
      'good',
      clock_timestamp(),
      'Not/A_Timezone'
    )
  $$,
  '22023',
  'Review submission input is invalid.',
  'review submission validates IANA timezone metadata'
);
select throws_ok(
  $$
    select *
    from private.submit_review_event(
      '11000000-0000-0000-0000-000000000001',
      '41000000-0000-0000-0000-000000000003',
      '51000000-0000-0000-0000-000000000006',
      '61000000-0000-0000-0000-000000000001',
      4,
      repeat('f', 64),
      'good',
      clock_timestamp(),
      'Asia/Ho_Chi_Minh'
    )
  $$,
  'P0002',
  'Review item is not available to this learner.',
  'a learner cannot submit a review event for another learner item'
);

update public.learner_enrollments
set
  enrollment_state = 'paused',
  paused_at = clock_timestamp()
where user_id = '11000000-0000-0000-0000-000000000002'
  and content_release_id = 'ja-n5-review-test-v1';
select throws_ok(
  $$
    select *
    from private.submit_review_event(
      '11000000-0000-0000-0000-000000000002',
      '41000000-0000-0000-0000-000000000003',
      '51000000-0000-0000-0000-000000000008',
      '61000000-0000-0000-0000-000000000002',
      1,
      repeat('8', 64),
      'good',
      clock_timestamp(),
      'Asia/Ho_Chi_Minh'
    )
  $$,
  '42501',
  'Learning operations require an active enrollment for the content release.',
  'a paused enrollment cannot mutate review state'
);

update public.account_roles
set
  revoked_at = clock_timestamp(),
  revocation_reason = 'review mutation authorization regression test'
where user_id = '11000000-0000-0000-0000-000000000002'
  and role = 'learner';
select throws_ok(
  $$
    select *
    from private.submit_review_event(
      '11000000-0000-0000-0000-000000000002',
      '41000000-0000-0000-0000-000000000003',
      '51000000-0000-0000-0000-000000000009',
      '61000000-0000-0000-0000-000000000002',
      2,
      repeat('9', 64),
      'good',
      clock_timestamp(),
      'Asia/Ho_Chi_Minh'
    )
  $$,
  '42501',
  'Only active learner accounts may mutate learning state.',
  'a revoked learner role cannot mutate review state'
);

do $block$
declare
  attempt integer;
begin
  for attempt in 10..13 loop
    perform private.submit_review_event(
      '11000000-0000-0000-0000-000000000001',
      '41000000-0000-0000-0000-000000000004',
      ('51000000-0000-0000-0000-' || lpad(attempt::text, 12, '0'))::uuid,
      '61000000-0000-0000-0000-000000000001',
      attempt,
      repeat('9', 64),
      'again',
      clock_timestamp(),
      'Asia/Ho_Chi_Minh'
    );
  end loop;

  perform private.submit_review_event(
    '11000000-0000-0000-0000-000000000001',
    '41000000-0000-0000-0000-000000000004',
    '51000000-0000-0000-0000-000000000014',
    '61000000-0000-0000-0000-000000000001',
    14,
    repeat('a', 64),
    'good',
    clock_timestamp(),
    'Asia/Ho_Chi_Minh'
  );
end;
$block$;

select is(
  (
    select interval_minutes
    from public.review_items
    where item_id = '41000000-0000-0000-0000-000000000004'
  ),
  20,
  'a good answer graduates a relearning item to a 20-minute interval'
);
select is(
  (
    select ease_factor
    from public.review_items
    where item_id = '41000000-0000-0000-0000-000000000004'
  ),
  1.55::numeric,
  'repeated lapses and graduation keep deterministic cent precision'
);
select is(
  (
    select state
    from public.review_items
    where item_id = '41000000-0000-0000-0000-000000000004'
  ),
  'learning',
  'relearning graduation returns the item to the learning step'
);
select throws_ok(
  $$
    update public.review_events
    set grade = 'easy'
    where idempotency_key = '51000000-0000-0000-0000-000000000001'
  $$,
  '42501',
  'Learner event history is append-only.',
  'persisted review history is immutable'
);
select throws_ok(
  $$
    update public.review_items
    set source_item_key = 'rewritten-source'
    where item_id = '41000000-0000-0000-0000-000000000001'
  $$,
  '42501',
  'Review item identity and scheduler version are immutable.',
  'a review item cannot be repointed to another source item'
);
select is(
  (
    select progress_state
    from private.submit_activity_attempt(
      '11000000-0000-0000-0000-000000000001',
      'ja-n5-review-test-v1',
      'ja-n5-review-u1-l1-vocab',
      '81000000-0000-0000-0000-000000000001',
      1,
      '71000000-0000-0000-0000-000000000001',
      repeat('a', 64),
      '{"answer":"私"}'::jsonb,
      'completed',
      1.0,
      'activity-evaluator-v1',
      '2026-07-29T12:05:00.000Z'::timestamptz,
      'Asia/Ho_Chi_Minh'
    )
  ),
  'completed',
  'a completed activity transaction recomputes lesson progress'
);
select is(
  (
    select completed_activity_count || '/' || total_activity_count
    from public.learner_lesson_progress
    where user_id = '11000000-0000-0000-0000-000000000001'
      and lesson_id = 'ja-n5-review-u1-l1'
  ),
  '1/1',
  'one completed activity yields full lesson progress for the one-activity lesson'
);
select ok(
  (
    select idempotent_replay
    from private.submit_activity_attempt(
      '11000000-0000-0000-0000-000000000001',
      'ja-n5-review-test-v1',
      'ja-n5-review-u1-l1-vocab',
      '81000000-0000-0000-0000-000000000001',
      1,
      '71000000-0000-0000-0000-000000000001',
      repeat('a', 64),
      '{"answer":"私"}'::jsonb,
      'completed',
      1.0,
      'activity-evaluator-v1',
      '2026-07-29T12:05:00.000Z'::timestamptz,
      'Asia/Ho_Chi_Minh'
    )
  ),
  'an activity retry returns the existing result without double-counting progress'
);
select throws_ok(
  $$
    select *
    from private.submit_activity_attempt(
      '11000000-0000-0000-0000-000000000001',
      'ja-n5-review-test-v1',
      'ja-n5-review-u1-l1-vocab',
      '81000000-0000-0000-0000-000000000001',
      2,
      '71000000-0000-0000-0000-000000000001',
      repeat('b', 64),
      '{"answer":"khác"}'::jsonb,
      'completed',
      0.5,
      'activity-evaluator-v1',
      clock_timestamp(),
      'Asia/Ho_Chi_Minh'
    )
  $$,
  '22023',
  'Activity idempotency key was reused with a different payload.',
  'an activity key cannot be reused with a different payload hash'
);
select throws_ok(
  $$
    select *
    from private.submit_activity_attempt(
      '11000000-0000-0000-0000-000000000001',
      'ja-n5-review-test-v1',
      'ja-n5-review-u1-l1-vocab',
      '81000000-0000-0000-0000-000000000001',
      1,
      '71000000-0000-0000-0000-000000000001',
      repeat('a', 64),
      '{"answer":"khác"}'::jsonb,
      'completed',
      1.0,
      'activity-evaluator-v1',
      '2026-07-29T12:05:00.000Z'::timestamptz,
      'Asia/Ho_Chi_Minh'
    )
  $$,
  '22023',
  'Activity idempotency key was reused with a different payload.',
  'an activity key cannot reuse an unchanged hash with changed evidence'
);
select throws_ok(
  $$
    select *
    from private.submit_activity_attempt(
      '11000000-0000-0000-0000-000000000001',
      'ja-n5-review-test-v1',
      'ja-n5-review-u1-l1-vocab',
      '81000000-0000-0000-0000-000000000001',
      1,
      '71000000-0000-0000-0000-000000000001',
      repeat('a', 64),
      '{"answer":"私"}'::jsonb,
      'submitted',
      1.0,
      'activity-evaluator-v1',
      '2026-07-29T12:05:00.000Z'::timestamptz,
      'Asia/Ho_Chi_Minh'
    )
  $$,
  '22023',
  'Activity idempotency key was reused with a different payload.',
  'an activity key cannot reuse an unchanged hash with another completion state'
);
select throws_ok(
  $$
    select *
    from private.submit_activity_attempt(
      '11000000-0000-0000-0000-000000000001',
      'ja-n5-review-test-v1',
      'ja-n5-review-u1-l1-vocab',
      '81000000-0000-0000-0000-000000000001',
      1,
      '71000000-0000-0000-0000-000000000001',
      repeat('a', 64),
      '{"answer":"私"}'::jsonb,
      'completed',
      0.75,
      'activity-evaluator-v1',
      '2026-07-29T12:05:00.000Z'::timestamptz,
      'Asia/Ho_Chi_Minh'
    )
  $$,
  '22023',
  'Activity idempotency key was reused with a different payload.',
  'an activity key cannot reuse an unchanged hash with another score'
);
select throws_ok(
  $$
    select *
    from private.submit_activity_attempt(
      '11000000-0000-0000-0000-000000000001',
      'ja-n5-review-test-v1',
      'ja-n5-review-u1-l1-vocab',
      '81000000-0000-0000-0000-000000000001',
      1,
      '71000000-0000-0000-0000-000000000001',
      repeat('a', 64),
      '{"answer":"私"}'::jsonb,
      'completed',
      1.0,
      'activity-evaluator-v2',
      '2026-07-29T12:05:00.000Z'::timestamptz,
      'Asia/Ho_Chi_Minh'
    )
  $$,
  '22023',
  'Activity idempotency key was reused with a different payload.',
  'an activity key cannot reuse an unchanged hash with another evaluator version'
);

select set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000000001', true);
set local role authenticated;

select is(
  (select count(*) from public.review_events),
  9::bigint,
  'learner A can read only their nine accepted review events'
);
select throws_ok(
  $$
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
      evaluation_version,
      client_timezone
    )
    values (
      '11000000-0000-0000-0000-000000000001',
      'ja-n5-review-test-v1',
      'ja-n5-review-u1-l1-vocab',
      '81000000-0000-0000-0000-000000000001',
      2,
      '71000000-0000-0000-0000-000000000002',
      repeat('c', 64),
      '{"answer":"forged"}'::jsonb,
      'submitted',
      'activity-evaluator-v1',
      'Asia/Ho_Chi_Minh'
    )
  $$,
  '42501',
  null,
  'learner clients cannot bypass the activity transaction helper'
);

reset role;
reset "request.jwt.claim.sub";

update public.content_releases
set release_status = 'archived'
where content_release_id = 'ja-n5-review-test-v1';

select is(
  (
    select count(*)
    from public.review_items
    where content_release_id = 'ja-n5-review-test-v1'
      and state = 'suspended'
  ),
  4::bigint,
  'archiving a release atomically suspends every outstanding review item'
);
select is(
  (
    select count(*)
    from public.learner_enrollments
    where content_release_id = 'ja-n5-review-test-v1'
      and enrollment_state = 'archived'
  ),
  2::bigint,
  'archiving a release closes active and paused enrollments'
);
select is(
  (
    select count(*)
    from public.review_events
    where user_id = '11000000-0000-0000-0000-000000000001'
  ),
  9::bigint,
  'release archival preserves immutable review history'
);
select throws_ok(
  $$
    delete from public.review_items
    where item_id = '41000000-0000-0000-0000-000000000001'
  $$,
  '42501',
  'Learner event history is append-only.',
  'review schedules can be deleted only by the authorized privacy purge'
);
select throws_ok(
  $$
    select *
    from private.submit_review_event(
      '11000000-0000-0000-0000-000000000001',
      '41000000-0000-0000-0000-000000000001',
      '51000000-0000-0000-0000-000000000099',
      '61000000-0000-0000-0000-000000000001',
      99,
      repeat('f', 64),
      'good',
      clock_timestamp(),
      'Asia/Ho_Chi_Minh'
    )
  $$,
  '42501',
  'Learning operations require a published active content release.',
  'an archived release rejects new review mutations'
);

select * from finish();
rollback;
