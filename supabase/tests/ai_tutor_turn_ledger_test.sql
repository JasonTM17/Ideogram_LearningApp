begin;

select plan(24);

select ok(
  (select relrowsecurity from pg_class where oid = 'private.ai_tutor_conversations'::regclass),
  'AI tutor conversations keep row-level security enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'private.ai_tutor_turns'::regclass),
  'AI tutor turns keep row-level security enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'private.ai_tutor_rate_windows'::regclass),
  'AI tutor rate windows keep row-level security enabled'
);
select ok(
  has_function_privilege(
    'app_learning_api_executor',
    'private.begin_ai_tutor_turn(uuid,uuid,uuid,text,jsonb,text,text,text,text,text,text,timestamptz)',
    'execute'
  ),
  'the narrow begin transition is executable by the app learning executor'
);
select ok(
  not has_table_privilege('authenticated', 'private.ai_tutor_turns', 'select'),
  'authenticated clients cannot read private AI turns directly'
);
select ok(
  exists (
    select 1
    from pg_trigger
    where tgrelid = 'private.learning_data_purge_operations'::regclass
      and tgname = 'purge_ai_tutor_data_after_learning_operation'
      and not tgisinternal
  ),
  'learning data purge installs the AI cleanup trigger'
);

grant execute on function private.begin_ai_tutor_turn(
  uuid, uuid, uuid, text, jsonb, text, text, text, text, text, text, timestamptz
) to postgres;
grant execute on function private.complete_ai_tutor_turn(
  uuid, uuid, uuid, text, jsonb, bigint, bigint, bigint, bigint, text, text, timestamptz
) to postgres;
grant execute on function private.fail_ai_tutor_turn(
  uuid, uuid, uuid, text, text, timestamptz
) to postgres;

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
    private.hash_email('ai-a@example.test'),
    private.hash_secret('ai-approval-a'),
    'adult-beta-v1',
    repeat('a', 64),
    clock_timestamp(),
    clock_timestamp() + interval '15 minutes'
  ),
  (
    private.hash_email('ai-b@example.test'),
    private.hash_secret('ai-approval-b'),
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
    'ai-a@example.test',
    clock_timestamp(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"registration_approval_token":"ai-approval-a"}'::jsonb,
    clock_timestamp(),
    clock_timestamp()
  ),
  (
    '12000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'ai-b@example.test',
    clock_timestamp(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"registration_approval_token":"ai-approval-b"}'::jsonb,
    clock_timestamp(),
    clock_timestamp()
  );

insert into public.consent_records (
  user_id,
  policy_key,
  policy_version,
  policy_document_digest,
  decision,
  source,
  idempotency_key
)
values (
  '12000000-0000-0000-0000-000000000001',
  'ai-tutor-provider-processing-v1',
  'v1',
  repeat('c', 64),
  'accepted',
  'web',
  '32000000-0000-0000-0000-000000000001'
);

select is(
  (
    select state
    from private.begin_ai_tutor_turn(
      '12000000-0000-0000-0000-000000000001',
      '22000000-0000-0000-0000-000000000001',
      '32000000-0000-0000-0000-000000000001',
      repeat('a', 64),
      jsonb_build_object('message', 'Giải thích は.', 'targetLevelCode', 'N5'),
      'ja',
      'N5',
      'communication',
      'standard',
      'encouraging',
      'ai-tutor-provider-processing-v1'
    )
  ),
  'pending',
  'a new learner turn is durably reserved before provider work'
);
select is(
  (
    select turn_count
    from private.ai_tutor_rate_windows
    where user_id = '12000000-0000-0000-0000-000000000001'
  ),
  1,
  'a new provider attempt increments the hourly turn counter'
);

select is(
  (
    select state
    from private.complete_ai_tutor_turn(
      '12000000-0000-0000-0000-000000000001',
      '22000000-0000-0000-0000-000000000001',
      '32000000-0000-0000-0000-000000000001',
      repeat('a', 64),
      jsonb_build_object(
        'assessmentVietnamese', 'Đúng hướng.',
        'explanationVietnamese', 'は đánh dấu chủ đề.',
        'example', 'これは本です。',
        'frequentVietnameseMistake', 'Không đồng nhất は với chủ ngữ.',
        'nextExerciseVietnamese', 'Đặt một câu với は.',
        'sourceBoundaryVietnamese', 'Chưa có nguồn bài học.'
      ),
      10,
      5,
      15,
      100000,
      'deepseek-v4-flash',
      'deepseek-v4-flash:high:disabled'
    )
  ),
  'completed',
  'a provider result completes the reserved turn'
);
select is(
  (
    select response_payload ->> 'assessmentVietnamese'
    from private.ai_tutor_turns
    where turn_id = '32000000-0000-0000-0000-000000000001'
  ),
  'Đúng hướng.',
  'completed tutor output is stored as structured JSON'
);
select ok(
  (
    select idempotent_replay
    from private.begin_ai_tutor_turn(
      '12000000-0000-0000-0000-000000000001',
      '22000000-0000-0000-0000-000000000001',
      '32000000-0000-0000-0000-000000000001',
      repeat('a', 64),
      jsonb_build_object('message', 'Giải thích は.', 'targetLevelCode', 'N5'),
      'ja',
      'N5',
      'communication',
      'standard',
      'encouraging',
      'ai-tutor-provider-processing-v1'
    )
  ),
  'an exact retry returns the stored receipt without a new reservation'
);
select throws_ok(
  $$
    select *
    from private.begin_ai_tutor_turn(
      '12000000-0000-0000-0000-000000000001',
      '22000000-0000-0000-0000-000000000001',
      '32000000-0000-0000-0000-000000000001',
      repeat('b', 64),
      jsonb_build_object('message', 'payload mismatch', 'targetLevelCode', 'N5'),
      'ja', 'N5', 'communication', 'standard', 'encouraging',
      'ai-tutor-provider-processing-v1'
    )
  $$,
  '22023',
  'Tutor turn identity was reused with a different payload.',
  'a turn UUID cannot be reused for a different payload'
);

select ok(
  (
    select state = 'pending'
    from private.begin_ai_tutor_turn(
      '12000000-0000-0000-0000-000000000001',
      '22000000-0000-0000-0000-000000000003',
      '32000000-0000-0000-0000-000000000003',
      repeat('c', 64),
      jsonb_build_object('message', 'stale retry', 'targetLevelCode', 'N5'),
      'ja', 'N5', 'communication', 'standard', 'encouraging',
      'ai-tutor-provider-processing-v1'
    )
  ),
  'a fresh turn can be reserved for stale-reclaim coverage'
);
reset role;
update private.ai_tutor_turns
set lease_expires_at = clock_timestamp() - interval '1 second'
where turn_id = '32000000-0000-0000-0000-000000000003';
select ok(
  (
    select state = 'pending'
    from private.begin_ai_tutor_turn(
      '12000000-0000-0000-0000-000000000001',
      '22000000-0000-0000-0000-000000000003',
      '32000000-0000-0000-0000-000000000003',
      repeat('c', 64),
      jsonb_build_object('message', 'stale retry', 'targetLevelCode', 'N5'),
      'ja', 'N5', 'communication', 'standard', 'encouraging',
      'ai-tutor-provider-processing-v1'
    )
  ),
  'an expired lease can be reclaimed without a second reservation leak'
);
select is(
  (
    select reserved_cost_microusd
    from private.ai_tutor_rate_windows
    where user_id = '12000000-0000-0000-0000-000000000001'
  ),
  500000::bigint,
  'stale reclaim releases the previous reservation before reserving again'
);

insert into public.consent_records (
  user_id,
  policy_key,
  policy_version,
  policy_document_digest,
  decision,
  source,
  idempotency_key
)
values (
  '12000000-0000-0000-0000-000000000002',
  'ai-tutor-provider-processing-v1',
  'v1',
  repeat('d', 64),
  'accepted',
  'mobile',
  '32000000-0000-0000-0000-000000000002'
);

select throws_ok(
  $$
    select *
    from private.begin_ai_tutor_turn(
      '12000000-0000-0000-0000-000000000002',
      '22000000-0000-0000-0000-000000000002',
      '32000000-0000-0000-0000-000000000002',
      repeat('a', 64),
      null::jsonb,
      'ja', 'N5', 'communication', 'standard', 'encouraging',
      'ai-tutor-provider-processing-v1'
    )
  $$,
  '22023',
  'Tutor turn input is invalid.',
  'a null request payload is rejected at the database boundary'
);
select throws_ok(
  $$
    select *
    from private.begin_ai_tutor_turn(
      '12000000-0000-0000-0000-000000000002',
      '22000000-0000-0000-0000-000000000002',
      '32000000-0000-0000-0000-000000000002',
      repeat('a', 64),
      jsonb_build_object('message', 'hidden pack'),
      'zh', 'HSK_1', 'communication', 'standard', 'encouraging',
      'ai-tutor-provider-processing-v1'
    )
  $$,
  'P0002',
  'Tutor language pack is not available.',
  'hidden language packs cannot reach the provider'
);

reset role;
update private.ai_tutor_rate_windows
set turn_count = 20
where user_id = '12000000-0000-0000-0000-000000000001';
select throws_ok(
  $$
    select *
    from private.begin_ai_tutor_turn(
      '12000000-0000-0000-0000-000000000001',
      '22000000-0000-0000-0000-000000000004',
      '32000000-0000-0000-0000-000000000004',
      repeat('c', 64),
      jsonb_build_object('message', 'quota'),
      'ja', 'N5', 'communication', 'standard', 'encouraging',
      'ai-tutor-provider-processing-v1'
    )
  $$,
  'P0001',
  'Tutor hourly quota has been reached.',
  'hourly turn quota is enforced atomically'
);

reset role;
update public.profiles
set account_state = 'frozen', revoked_at = clock_timestamp()
where user_id = '12000000-0000-0000-0000-000000000001';
select throws_ok(
  $$
    select *
    from private.begin_ai_tutor_turn(
      '12000000-0000-0000-0000-000000000001',
      '22000000-0000-0000-0000-000000000005',
      '32000000-0000-0000-0000-000000000005',
      repeat('d', 64),
      jsonb_build_object('message', 'inactive'),
      'ja', 'N5', 'communication', 'standard', 'encouraging',
      'ai-tutor-provider-processing-v1'
    )
  $$,
  '42501',
  'Only active learner accounts may mutate learning state.',
  'inactive accounts are rechecked inside the turn transaction'
);

reset role;
insert into private.ai_tutor_conversations (
  conversation_id,
  user_id,
  language_code,
  target_level_code,
  objective_key,
  explanation_depth,
  tone
)
values (
  '22000000-0000-0000-0000-000000000005',
  '12000000-0000-0000-0000-000000000002',
  'ja',
  'N5',
  'communication',
  'standard',
  'encouraging'
);
insert into private.ai_tutor_turns (
  turn_id,
  conversation_id,
  user_id,
  state,
  payload_hash,
  request_payload,
  provider_model,
  configuration_version
)
values (
  '32000000-0000-0000-0000-000000000005',
  '22000000-0000-0000-0000-000000000005',
  '12000000-0000-0000-0000-000000000002',
  'failed',
  repeat('e', 64),
  jsonb_build_object('message', 'purge me'),
  'deepseek-v4-flash',
  'deepseek-v4-flash:high:disabled'
);
insert into private.ai_tutor_rate_windows (user_id, window_start)
values ('12000000-0000-0000-0000-000000000002', date_trunc('hour', clock_timestamp()));

insert into public.data_subject_requests (
  request_id,
  user_id,
  request_kind,
  idempotency_key,
  subject_role_epoch,
  requesting_session_id,
  reauthenticated_at
)
select
  '42000000-0000-0000-0000-000000000001',
  '12000000-0000-0000-0000-000000000002',
  'deletion',
  '52000000-0000-0000-0000-000000000001',
  role_epoch,
  '62000000-0000-0000-0000-000000000001',
  clock_timestamp()
from public.profiles
where user_id = '12000000-0000-0000-0000-000000000002';

insert into private.learning_data_purge_operations (
  request_id,
  user_id,
  worker_id,
  transaction_id
)
values (
  '42000000-0000-0000-0000-000000000001',
  '12000000-0000-0000-0000-000000000002',
  '72000000-0000-0000-0000-000000000001',
  pg_catalog.txid_current()
);

select is(
  (select count(*) from private.ai_tutor_conversations where user_id = '12000000-0000-0000-0000-000000000002'),
  0::bigint,
  'deletion purge trigger removes AI conversations'
);
select is(
  (select count(*) from private.ai_tutor_turns where user_id = '12000000-0000-0000-0000-000000000002'),
  0::bigint,
  'deletion purge trigger removes AI turns'
);
select is(
  (select count(*) from private.ai_tutor_rate_windows where user_id = '12000000-0000-0000-0000-000000000002'),
  0::bigint,
  'deletion purge trigger removes AI rate windows'
);

select ok(
  pg_get_userbyid((select proowner from pg_proc where oid = 'private.begin_ai_tutor_turn(uuid,uuid,uuid,text,jsonb,text,text,text,text,text,text,timestamptz)'::regprocedure)) = 'app_security_definer',
  'AI turn transition is owned by the security-definer role'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'private.begin_ai_tutor_turn(uuid,uuid,uuid,text,jsonb,text,text,text,text,text,text,timestamptz)',
    'execute'
  ),
  'authenticated clients cannot invoke the private AI transition'
);

select * from finish();
rollback;
