-- Governed internal-beta Japanese placement bank plus lease-based worker scoring.

insert into public.content_provenance (
  provenance_id, source_kind, source_reference, license_reference, author_name,
  reviewer_name, adaptation_allowed, embedding_allowed, redistribution_allowed,
  ai_provider_processing_allowed
)
values (
  'b1000000-0000-4000-8000-000000000001',
  'original',
  'Ideogram internal-beta Japanese N5 placement bank, version 1.0.0.',
  'ideogram-original-internal-beta-v1',
  'Ideogram Curriculum Team',
  'Internal curriculum review',
  true, true, true, true
)
on conflict (provenance_id) do nothing;

insert into public.placement_question_sets (
  placement_question_set_id, language_code, objective_key, placement_version,
  title_vietnamese, status, provenance_id
)
values (
  'b2000000-0000-4000-8000-000000000001', 'ja', 'exam', 'v1.1.0',
  'Khởi động tiếng Nhật — N5', 'draft',
  'b1000000-0000-4000-8000-000000000001'
)
on conflict (language_code, objective_key, placement_version) do nothing;

insert into public.placement_questions (
  placement_question_id, placement_question_set_id, question_key, sequence,
  question_type, prompt_payload, scoring_rubric, status, provenance_id
)
values
  ('b3000000-0000-4000-8000-000000000001', 'b2000000-0000-4000-8000-000000000001', 'ja-n5-greeting', 1, 'vocabulary', '{"promptVietnamese":"「こんにちは」 gần nghĩa nhất với từ nào?","choices":["Xin chào","Cảm ơn","Tạm biệt"]}'::jsonb, '{"correctChoice":0,"skill":"vocabulary","weight":1}'::jsonb, 'published', 'b1000000-0000-4000-8000-000000000001'),
  ('b3000000-0000-4000-8000-000000000002', 'b2000000-0000-4000-8000-000000000001', 'ja-n5-thanks', 2, 'vocabulary', '{"promptVietnamese":"「ありがとう」 gần nghĩa nhất với từ nào?","choices":["Xin lỗi","Cảm ơn","Chúc ngủ ngon"]}'::jsonb, '{"correctChoice":1,"skill":"vocabulary","weight":1}'::jsonb, 'published', 'b1000000-0000-4000-8000-000000000001'),
  ('b3000000-0000-4000-8000-000000000003', 'b2000000-0000-4000-8000-000000000001', 'ja-n5-particle-wa', 3, 'grammar', '{"promptVietnamese":"Chọn trợ từ đúng: わたし＿ベトナムじんです。","choices":["は","を","に"]}'::jsonb, '{"correctChoice":0,"skill":"grammar","weight":1}'::jsonb, 'published', 'b1000000-0000-4000-8000-000000000001'),
  ('b3000000-0000-4000-8000-000000000004', 'b2000000-0000-4000-8000-000000000001', 'ja-n5-number-three', 4, 'reading', '{"promptVietnamese":"「三」 đọc là gì?","choices":["さん","し","よん"]}'::jsonb, '{"correctChoice":0,"skill":"reading","weight":1}'::jsonb, 'published', 'b1000000-0000-4000-8000-000000000001'),
  ('b3000000-0000-4000-8000-000000000005', 'b2000000-0000-4000-8000-000000000001', 'ja-n5-time', 5, 'vocabulary', '{"promptVietnamese":"「きょう」 gần nghĩa nhất với từ nào?","choices":["Hôm nay","Ngày mai","Hôm qua"]}'::jsonb, '{"correctChoice":0,"skill":"vocabulary","weight":1}'::jsonb, 'published', 'b1000000-0000-4000-8000-000000000001'),
  ('b3000000-0000-4000-8000-000000000006', 'b2000000-0000-4000-8000-000000000001', 'ja-n5-particle-o', 6, 'grammar', '{"promptVietnamese":"Chọn trợ từ đúng: パン＿たべます。","choices":["を","は","で"]}'::jsonb, '{"correctChoice":0,"skill":"grammar","weight":1}'::jsonb, 'published', 'b1000000-0000-4000-8000-000000000001'),
  ('b3000000-0000-4000-8000-000000000007', 'b2000000-0000-4000-8000-000000000001', 'ja-n5-school', 7, 'vocabulary', '{"promptVietnamese":"「がっこう」 gần nghĩa nhất với từ nào?","choices":["Trường học","Bệnh viện","Nhà ga"]}'::jsonb, '{"correctChoice":0,"skill":"vocabulary","weight":1}'::jsonb, 'published', 'b1000000-0000-4000-8000-000000000001'),
  ('b3000000-0000-4000-8000-000000000008', 'b2000000-0000-4000-8000-000000000001', 'ja-n5-question', 8, 'reading', '{"promptVietnamese":"「？」 được dùng để biểu thị điều gì?","choices":["Câu hỏi","Mệnh lệnh","Sự phủ định"]}'::jsonb, '{"correctChoice":0,"skill":"reading","weight":1}'::jsonb, 'published', 'b1000000-0000-4000-8000-000000000001'),
  ('b3000000-0000-4000-8000-000000000009', 'b2000000-0000-4000-8000-000000000001', 'ja-n5-this', 9, 'vocabulary', '{"promptVietnamese":"「これ」 gần nghĩa nhất với từ nào?","choices":["Cái này","Cái kia","Ở đâu"]}'::jsonb, '{"correctChoice":0,"skill":"vocabulary","weight":1}'::jsonb, 'published', 'b1000000-0000-4000-8000-000000000001'),
  ('b3000000-0000-4000-8000-000000000010', 'b2000000-0000-4000-8000-000000000001', 'ja-n5-particle-no', 10, 'grammar', '{"promptVietnamese":"Chọn trợ từ đúng: わたし＿ほんです。","choices":["の","を","が"]}'::jsonb, '{"correctChoice":0,"skill":"grammar","weight":1}'::jsonb, 'published', 'b1000000-0000-4000-8000-000000000001'),
  ('b3000000-0000-4000-8000-000000000011', 'b2000000-0000-4000-8000-000000000001', 'ja-n5-day-sunday', 11, 'reading', '{"promptVietnamese":"「日よう日」 là ngày nào?","choices":["Chủ nhật","Thứ hai","Thứ sáu"]}'::jsonb, '{"correctChoice":0,"skill":"reading","weight":1}'::jsonb, 'published', 'b1000000-0000-4000-8000-000000000001'),
  ('b3000000-0000-4000-8000-000000000012', 'b2000000-0000-4000-8000-000000000001', 'ja-n5-place-library', 12, 'vocabulary', '{"promptVietnamese":"「としょかん」 là nơi nào?","choices":["Thư viện","Nhà hàng","Bưu điện"]}'::jsonb, '{"correctChoice":0,"skill":"vocabulary","weight":1}'::jsonb, 'published', 'b1000000-0000-4000-8000-000000000001'),
  ('b3000000-0000-4000-8000-000000000013', 'b2000000-0000-4000-8000-000000000001', 'ja-n5-negative', 13, 'grammar', '{"promptVietnamese":"Chọn dạng phủ định: わたしは がくせい＿。","choices":["ではありません","です","でした"]}'::jsonb, '{"correctChoice":0,"skill":"grammar","weight":1}'::jsonb, 'published', 'b1000000-0000-4000-8000-000000000001'),
  ('b3000000-0000-4000-8000-000000000014', 'b2000000-0000-4000-8000-000000000001', 'ja-n5-number-seven', 14, 'reading', '{"promptVietnamese":"「七」 đọc là gì?","choices":["なな","きゅう","ご"]}'::jsonb, '{"correctChoice":0,"skill":"reading","weight":1}'::jsonb, 'published', 'b1000000-0000-4000-8000-000000000001'),
  ('b3000000-0000-4000-8000-000000000015', 'b2000000-0000-4000-8000-000000000001', 'ja-n5-transport-train', 15, 'vocabulary', '{"promptVietnamese":"「でんしゃ」 gần nghĩa nhất với từ nào?","choices":["Tàu điện","Xe đạp","Máy bay"]}'::jsonb, '{"correctChoice":0,"skill":"vocabulary","weight":1}'::jsonb, 'published', 'b1000000-0000-4000-8000-000000000001'),
  ('b3000000-0000-4000-8000-000000000016', 'b2000000-0000-4000-8000-000000000001', 'ja-n5-location-ni', 16, 'grammar', '{"promptVietnamese":"Chọn trợ từ đúng: がっこう＿いきます。","choices":["に","を","と"]}'::jsonb, '{"correctChoice":0,"skill":"grammar","weight":1}'::jsonb, 'published', 'b1000000-0000-4000-8000-000000000001'),
  ('b3000000-0000-4000-8000-000000000017', 'b2000000-0000-4000-8000-000000000001', 'ja-n5-person', 17, 'vocabulary', '{"promptVietnamese":"「せんせい」 thường chỉ ai?","choices":["Giáo viên","Học sinh","Bác sĩ"]}'::jsonb, '{"correctChoice":0,"skill":"vocabulary","weight":1}'::jsonb, 'published', 'b1000000-0000-4000-8000-000000000001'),
  ('b3000000-0000-4000-8000-000000000018', 'b2000000-0000-4000-8000-000000000001', 'ja-n5-past', 18, 'grammar', '{"promptVietnamese":"Chọn dạng quá khứ: きのう えいがを み＿。","choices":["ました","ます","ません"]}'::jsonb, '{"correctChoice":0,"skill":"grammar","weight":1}'::jsonb, 'published', 'b1000000-0000-4000-8000-000000000001'),
  ('b3000000-0000-4000-8000-000000000019', 'b2000000-0000-4000-8000-000000000001', 'ja-n5-kanji-mountain', 19, 'reading', '{"promptVietnamese":"「山」 đọc là gì?","choices":["やま","かわ","うみ"]}'::jsonb, '{"correctChoice":0,"skill":"reading","weight":1}'::jsonb, 'published', 'b1000000-0000-4000-8000-000000000001'),
  ('b3000000-0000-4000-8000-000000000020', 'b2000000-0000-4000-8000-000000000001', 'ja-n5-family-mother', 20, 'vocabulary', '{"promptVietnamese":"「はは」 thường nghĩa là ai trong gia đình?","choices":["Mẹ của mình","Chị gái","Bà ngoại"]}'::jsonb, '{"correctChoice":0,"skill":"vocabulary","weight":1}'::jsonb, 'published', 'b1000000-0000-4000-8000-000000000001'),
  ('b3000000-0000-4000-8000-000000000021', 'b2000000-0000-4000-8000-000000000001', 'ja-n5-question-ka', 21, 'grammar', '{"promptVietnamese":"Chọn từ đúng để hỏi: これは なんです＿。","choices":["か","を","で"]}'::jsonb, '{"correctChoice":0,"skill":"grammar","weight":1}'::jsonb, 'published', 'b1000000-0000-4000-8000-000000000001'),
  ('b3000000-0000-4000-8000-000000000022', 'b2000000-0000-4000-8000-000000000001', 'ja-n5-kanji-water', 22, 'reading', '{"promptVietnamese":"「水」 đọc là gì?","choices":["みず","ひ","き"]}'::jsonb, '{"correctChoice":0,"skill":"reading","weight":1}'::jsonb, 'published', 'b1000000-0000-4000-8000-000000000001'),
  ('b3000000-0000-4000-8000-000000000023', 'b2000000-0000-4000-8000-000000000001', 'ja-n5-weather-rain', 23, 'vocabulary', '{"promptVietnamese":"「あめ」 gần nghĩa nhất với từ nào?","choices":["Mưa","Tuyết","Gió"]}'::jsonb, '{"correctChoice":0,"skill":"vocabulary","weight":1}'::jsonb, 'published', 'b1000000-0000-4000-8000-000000000001'),
  ('b3000000-0000-4000-8000-000000000024', 'b2000000-0000-4000-8000-000000000001', 'ja-n5-adjective', 24, 'grammar', '{"promptVietnamese":"Chọn từ đúng: この ほんは おもしろい＿。","choices":["です","を","に"]}'::jsonb, '{"correctChoice":0,"skill":"grammar","weight":1}'::jsonb, 'published', 'b1000000-0000-4000-8000-000000000001'),
  ('b3000000-0000-4000-8000-000000000025', 'b2000000-0000-4000-8000-000000000001', 'ja-n5-kana-wo', 25, 'reading', '{"promptVietnamese":"Hiragana nào đọc là 「を」?","choices":["を","お","わ"]}'::jsonb, '{"correctChoice":0,"skill":"reading","weight":1}'::jsonb, 'published', 'b1000000-0000-4000-8000-000000000001')
on conflict (placement_question_set_id, question_key) do nothing;

update public.placement_question_sets
set status = 'published', published_at = clock_timestamp()
where placement_question_set_id = 'b2000000-0000-4000-8000-000000000001'
  and status = 'draft';

create table private.placement_scoring_jobs (
  placement_session_id uuid primary key references public.placement_sessions (placement_session_id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed')),
  worker_id uuid,
  claimed_at timestamptz,
  lease_expires_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  check ((status = 'processing') = (worker_id is not null and claimed_at is not null and lease_expires_at is not null)),
  check (status <> 'completed' or completed_at is not null)
);

create index placement_scoring_jobs_claim_idx
  on private.placement_scoring_jobs (status, lease_expires_at, created_at);

create function private.enqueue_placement_scoring_job()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, private
as $function$
begin
  if new.session_status = 'submitted' and old.session_status is distinct from 'submitted' then
    insert into private.placement_scoring_jobs (placement_session_id)
    values (new.placement_session_id)
    on conflict (placement_session_id) do nothing;
  end if;
  return new;
end;
$function$;

create trigger enqueue_placement_scoring_job_after_submit
after update of session_status on public.placement_sessions
for each row execute function private.enqueue_placement_scoring_job();

insert into private.placement_scoring_jobs (placement_session_id)
select placement_session_id from public.placement_sessions where session_status = 'submitted'
on conflict (placement_session_id) do nothing;

create function private.claim_placement_scoring_job(p_worker_id uuid)
returns table (placement_session_id uuid)
language plpgsql
security definer
set search_path = pg_catalog, private, public
as $function$
declare claimed_id uuid;
begin
  if p_worker_id is null then raise exception using errcode = '22023', message = 'Worker identifier is required.'; end if;
  select jobs.placement_session_id into claimed_id
  from private.placement_scoring_jobs jobs
  join public.placement_sessions sessions using (placement_session_id)
  where sessions.session_status = 'submitted'
    and (jobs.status = 'pending' or (jobs.status = 'processing' and jobs.lease_expires_at <= clock_timestamp()))
  order by jobs.created_at
  for update of jobs skip locked
  limit 1;
  if claimed_id is null then return; end if;
  update private.placement_scoring_jobs
  set status = 'processing', worker_id = p_worker_id, claimed_at = clock_timestamp(), lease_expires_at = clock_timestamp() + interval '2 minutes', completed_at = null
  where private.placement_scoring_jobs.placement_session_id = claimed_id;
  return query select claimed_id;
end;
$function$;

create function private.complete_placement_scoring_job(
  p_worker_id uuid, p_placement_session_id uuid, p_recommended_level_code text,
  p_confidence numeric, p_score_summary jsonb
)
returns public.placement_sessions
language plpgsql
security definer
set search_path = pg_catalog, private, public
as $function$
declare job private.placement_scoring_jobs%rowtype; scored public.placement_sessions%rowtype;
begin
  select * into job from private.placement_scoring_jobs where placement_session_id = p_placement_session_id for update;
  if job.placement_session_id is null or job.status <> 'processing' or job.worker_id <> p_worker_id or job.lease_expires_at <= clock_timestamp() then
    raise exception using errcode = '42501', message = 'Placement scoring job is not held by this worker.';
  end if;
  select * into scored from private.score_placement_session(p_placement_session_id, p_recommended_level_code, p_confidence, p_score_summary);
  update private.placement_scoring_jobs set status = 'completed', completed_at = clock_timestamp(), lease_expires_at = null where placement_session_id = p_placement_session_id;
  return scored;
end;
$function$;

grant create on schema private to app_security_definer;
grant select, insert, update on table private.placement_scoring_jobs to app_security_definer;

alter function private.enqueue_placement_scoring_job() owner to app_security_definer;
alter function private.claim_placement_scoring_job(uuid) owner to app_security_definer;
alter function private.complete_placement_scoring_job(uuid, uuid, text, numeric, jsonb) owner to app_security_definer;
grant usage on schema private to service_role;
grant execute on function private.claim_placement_scoring_job(uuid) to service_role;
grant execute on function private.complete_placement_scoring_job(uuid, uuid, text, numeric, jsonb) to service_role;
revoke all on table private.placement_scoring_jobs from public, anon, authenticated, service_role;
revoke all on function private.claim_placement_scoring_job(uuid) from public, anon, authenticated;
revoke all on function private.complete_placement_scoring_job(uuid, uuid, text, numeric, jsonb) from public, anon, authenticated;
revoke create on schema private from app_security_definer;
