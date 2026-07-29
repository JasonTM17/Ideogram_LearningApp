begin;

select plan(16);

select ok(
  (select relrowsecurity from pg_class where oid = 'storage.objects'::regclass),
  'Storage objects has row-level security enabled'
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
    private.hash_email('storage-a@example.test'),
    private.hash_secret('storage-approval-a'),
    'adult-beta-v1',
    repeat('c', 64),
    clock_timestamp(),
    clock_timestamp() + interval '15 minutes'
  ),
  (
    private.hash_email('storage-b@example.test'),
    private.hash_secret('storage-approval-b'),
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
    '00000000-0000-0000-0000-000000000011',
    'authenticated',
    'authenticated',
    'storage-a@example.test',
    clock_timestamp(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"registration_approval_token":"storage-approval-a"}'::jsonb,
    clock_timestamp(),
    clock_timestamp()
  ),
  (
    '00000000-0000-0000-0000-000000000012',
    'authenticated',
    'authenticated',
    'storage-b@example.test',
    clock_timestamp(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"registration_approval_token":"storage-approval-b"}'::jsonb,
    clock_timestamp(),
    clock_timestamp()
  );

insert into storage.objects (bucket_id, name, owner_id, metadata)
values
  (
    'learner-recordings',
    '00000000-0000-0000-0000-000000000011/existing-recording.webm',
    '00000000-0000-0000-0000-000000000011',
    '{"mimetype":"audio/webm","size":1}'::jsonb
  ),
  (
    'learner-recordings',
    '00000000-0000-0000-0000-000000000012/existing-recording.webm',
    '00000000-0000-0000-0000-000000000012',
    '{"mimetype":"audio/webm","size":1}'::jsonb
  ),
  (
    'learner-exports',
    '00000000-0000-0000-0000-000000000011/request-a/export.zip',
    null,
    '{"mimetype":"application/zip","size":1}'::jsonb
  ),
  (
    'learner-exports',
    '00000000-0000-0000-0000-000000000012/request-b/export.zip',
    null,
    '{"mimetype":"application/zip","size":1}'::jsonb
  );

select is(
  (
    select count(*)
    from storage.buckets
    where id in ('learner-recordings', 'learner-attachments', 'learner-exports')
      and public = false
  ),
  3::bigint,
  'all learner buckets are private'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000011', true);
set local role authenticated;

select is(
  (
    select count(*)
    from storage.objects
    where bucket_id = 'learner-recordings'
  ),
  1::bigint,
  'learner A can list only their recording prefix'
);
select is(
  (
    select count(*)
    from storage.objects
    where bucket_id = 'learner-recordings'
      and name like '00000000-0000-0000-0000-000000000012/%'
  ),
  0::bigint,
  'learner A cannot read learner B recording prefix'
);
select lives_ok(
  $$
    insert into storage.objects (bucket_id, name, owner_id, metadata)
    values (
      'learner-attachments',
      '00000000-0000-0000-0000-000000000011/own-attachment.png',
      '00000000-0000-0000-0000-000000000011',
      '{"mimetype":"image/png","size":1}'::jsonb
    )
  $$,
  'learner A can write an object in their active prefix'
);
select throws_ok(
  $$
    insert into storage.objects (bucket_id, name, owner_id, metadata)
    values (
      'learner-attachments',
      '00000000-0000-0000-0000-000000000012/cross-user.png',
      '00000000-0000-0000-0000-000000000011',
      '{"mimetype":"image/png","size":1}'::jsonb
    )
  $$,
  '42501',
  null,
  'learner A cannot upload into learner B prefix'
);
select throws_ok(
  $$
    insert into storage.objects (bucket_id, name, owner_id, metadata)
    values (
      'learner-recordings',
      '00000000-0000-0000-0000-000000000011/../path-traversal.webm',
      '00000000-0000-0000-0000-000000000011',
      '{"mimetype":"audio/webm","size":1}'::jsonb
    )
  $$,
  '42501',
  null,
  'path traversal syntax is rejected even below the caller prefix'
);
select throws_ok(
  $$
    delete from storage.objects
    where bucket_id = 'learner-recordings'
      and name = '00000000-0000-0000-0000-000000000012/existing-recording.webm'
  $$,
  '42501',
  'Direct deletion from storage tables is not allowed. Use the Storage API instead.',
  'direct table deletion cannot bypass the Storage API'
);
select is(
  (
    select count(*)
    from storage.objects
    where bucket_id = 'learner-exports'
  ),
  1::bigint,
  'learner A can read only their export prefix even when worker-created owner_id is null'
);
select is(
  (
    select count(*)
    from storage.objects
    where bucket_id = 'learner-exports'
      and name like '00000000-0000-0000-0000-000000000012/%'
  ),
  0::bigint,
  'learner A cannot read learner B export prefix'
);
select throws_ok(
  $$
    insert into storage.objects (bucket_id, name, owner_id, metadata)
    values (
      'learner-exports',
      '00000000-0000-0000-0000-000000000011/forged/export.zip',
      '00000000-0000-0000-0000-000000000011',
      '{"mimetype":"application/zip","size":1}'::jsonb
    )
  $$,
  '42501',
  null,
  'learner A cannot write export artifacts'
);

reset role;

select is(
  (
    select count(*)
    from storage.objects
    where bucket_id = 'learner-recordings'
      and name = '00000000-0000-0000-0000-000000000012/existing-recording.webm'
  ),
  1::bigint,
  'learner A cross-user delete attempt leaves learner B object unchanged'
);

insert into public.data_subject_requests (
  request_id,
  user_id,
  request_kind,
  idempotency_key,
  subject_role_epoch,
  requesting_session_id,
  reauthenticated_at
)
values (
  '00000000-0000-0000-0000-0000000000d1',
  '00000000-0000-0000-0000-000000000011',
  'deletion',
  '00000000-0000-0000-0000-0000000000e1',
  1,
  '00000000-0000-0000-0000-0000000000f1',
  clock_timestamp()
);
update public.data_subject_requests
set status = 'frozen', frozen_at = clock_timestamp()
where request_id = '00000000-0000-0000-0000-0000000000d1';
select is(
  (
    select account_state
    from public.profiles
    where user_id = '00000000-0000-0000-0000-000000000011'
  ),
  'pending_deletion',
  'freezing a deletion request revokes Storage access through the account lifecycle'
);

set local role authenticated;
select is(
  (select count(*) from storage.objects),
  0::bigint,
  'a frozen account loses direct Storage read access'
);
select throws_ok(
  $$
    insert into storage.objects (bucket_id, name, owner_id, metadata)
    values (
      'learner-recordings',
      '00000000-0000-0000-0000-000000000011/late-upload.webm',
      '00000000-0000-0000-0000-000000000011',
      '{"mimetype":"audio/webm","size":1}'::jsonb
    )
  $$,
  '42501',
  null,
  'a frozen account cannot create late uploads'
);

reset role;
reset "request.jwt.claim.sub";
set local role anon;

select is(
  (select count(*) from storage.objects),
  0::bigint,
  'anonymous callers have no readable Storage objects'
);

reset role;

select * from finish();
rollback;
