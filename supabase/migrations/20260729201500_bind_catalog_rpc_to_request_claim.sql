-- Supabase owns the auth schema and does not delegate its schema usage to the
-- definer role. Read the signed request claim directly, as the existing RLS
-- test harness and PostgREST request context do, so the RPC remains owned by
-- the no-login non-bypass role.

create or replace function public.get_learner_catalog_activities()
returns table (
  activity_id text,
  content_release_id text,
  lesson_id text,
  sequence integer,
  activity_type text,
  target_script text,
  title_vietnamese text,
  instructions_vietnamese text,
  estimated_minutes integer,
  payload jsonb
)
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $function$
  select
    activities.activity_id,
    activities.content_release_id,
    activities.lesson_id,
    activities.sequence,
    activities.activity_type,
    activities.target_script,
    activities.title_vietnamese,
    activities.instructions_vietnamese,
    activities.estimated_minutes,
    private.project_learner_catalog_payload(
      activities.activity_type,
      activities.payload
    ) as payload
  from public.activities
  where private.is_active_account(
    nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  )
    and activities.status = 'published'
    and private.is_visible_content_release(activities.content_release_id);
$function$;
