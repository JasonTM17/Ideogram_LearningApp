-- PostgREST exposes only the public schema. These narrow wrappers let the
-- service-role worker invoke the placement lifecycle without exposing private.

create function public.claim_placement_scoring_job(p_worker_id uuid)
returns table (placement_session_id uuid)
language sql
security invoker
set search_path = pg_catalog, public, private
as $function$
  select * from private.claim_placement_scoring_job(p_worker_id);
$function$;

create function public.get_placement_scoring_input(p_placement_session_id uuid)
returns table (
  placement_session_id uuid,
  language_code text,
  objective_key text,
  placement_version text,
  placement_question_id uuid,
  question_type text,
  scoring_rubric jsonb,
  answer_payload jsonb,
  attempt_number integer
)
language sql
security invoker
set search_path = pg_catalog, public, private
as $function$
  select * from private.get_placement_scoring_input(p_placement_session_id);
$function$;

create function public.complete_placement_scoring_job(
  p_worker_id uuid,
  p_placement_session_id uuid,
  p_recommended_level_code text,
  p_confidence numeric,
  p_score_summary jsonb
)
returns public.placement_sessions
language sql
security invoker
set search_path = pg_catalog, public, private
as $function$
  select *
  from private.complete_placement_scoring_job(
    p_worker_id,
    p_placement_session_id,
    p_recommended_level_code,
    p_confidence,
    p_score_summary
  );
$function$;

revoke all on function public.claim_placement_scoring_job(uuid) from public, anon, authenticated;
revoke all on function public.get_placement_scoring_input(uuid) from public, anon, authenticated;
revoke all on function public.complete_placement_scoring_job(uuid, uuid, text, numeric, jsonb)
  from public, anon, authenticated;

grant execute on function public.claim_placement_scoring_job(uuid) to service_role;
grant execute on function public.get_placement_scoring_input(uuid) to service_role;
grant execute on function public.complete_placement_scoring_job(uuid, uuid, text, numeric, jsonb)
  to service_role;

-- PostgREST needs the relation key and filter column to embed only published
-- prompt rows. Rubrics remain column-revoked and RLS remains authoritative.
grant select (placement_question_set_id, status)
  on table public.placement_questions to authenticated;
