alter table private.placement_scoring_jobs
  drop constraint placement_scoring_jobs_status_check;

alter table private.placement_scoring_jobs
  add column failure_code text check (char_length(failure_code) between 1 and 120),
  add column failed_at timestamptz,
  add constraint placement_scoring_jobs_status_check
    check (status in ('pending', 'processing', 'completed', 'failed')),
  add constraint placement_scoring_jobs_failed_state_check
    check ((status = 'failed') = (failure_code is not null and failed_at is not null));

grant create on schema private to app_security_definer;

create function private.fail_placement_scoring_job(
  p_worker_id uuid,
  p_placement_session_id uuid,
  p_failure_code text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, private
as $function$
declare
  job private.placement_scoring_jobs%rowtype;
begin
  if p_failure_code is null or char_length(p_failure_code) not between 1 and 120 then
    raise exception using errcode = '22023', message = 'Placement failure code is invalid.';
  end if;

  select * into job
  from private.placement_scoring_jobs
  where placement_session_id = p_placement_session_id
  for update;

  if job.placement_session_id is null
    or job.status <> 'processing'
    or job.worker_id <> p_worker_id
    or job.lease_expires_at <= clock_timestamp()
  then
    raise exception using
      errcode = '42501',
      message = 'Placement scoring job is not held by this worker.';
  end if;

  update private.placement_scoring_jobs
  set status = 'failed',
      worker_id = null,
      lease_expires_at = null,
      failure_code = p_failure_code,
      failed_at = clock_timestamp()
  where placement_session_id = p_placement_session_id;
end;
$function$;

alter function private.fail_placement_scoring_job(uuid, uuid, text)
  owner to app_security_definer;
grant execute on function private.fail_placement_scoring_job(uuid, uuid, text) to service_role;
revoke all on function private.fail_placement_scoring_job(uuid, uuid, text)
  from public, anon, authenticated;

create function public.fail_placement_scoring_job(
  p_worker_id uuid,
  p_placement_session_id uuid,
  p_failure_code text
)
returns void
language sql
security invoker
set search_path = pg_catalog, public, private
as $function$
  select private.fail_placement_scoring_job(
    p_worker_id,
    p_placement_session_id,
    p_failure_code
  );
$function$;

revoke all on function public.fail_placement_scoring_job(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.fail_placement_scoring_job(uuid, uuid, text) to service_role;

revoke create on schema private from app_security_definer;
