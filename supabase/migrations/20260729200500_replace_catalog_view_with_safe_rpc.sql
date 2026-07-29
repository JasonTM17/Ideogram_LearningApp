-- The initial safe-view implementation still required callers to execute its
-- private JSON projector. Replace it with a narrow security-definer RPC so
-- learner roles never need private-schema access.

drop view public.learner_catalog_activities;

grant create on schema public to app_security_definer;

create function public.get_learner_catalog_activities()
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
  where private.is_active_account((select auth.uid()))
    and activities.status = 'published'
    and private.is_visible_content_release(activities.content_release_id);
$function$;

revoke all on function public.get_learner_catalog_activities()
  from public, anon, authenticated, service_role;
grant execute on function public.get_learner_catalog_activities() to authenticated;

alter function public.get_learner_catalog_activities()
  owner to app_security_definer;

revoke create on schema public from app_security_definer;
