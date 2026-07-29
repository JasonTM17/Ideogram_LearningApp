-- Learner prompts and scoring material have different trust boundaries.
-- Activities keep the complete editorial payload for server-side evaluation,
-- while this view exposes a field-by-field allowlist for learner clients.

grant create on schema private, public to app_security_definer;

create function private.project_learner_catalog_questions(p_questions jsonb)
returns jsonb
language sql
immutable
strict
set search_path = pg_catalog
as $function$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'questionId', question.value -> 'questionId',
        'prompt', question.value -> 'prompt',
        'options', (
          select coalesce(
            jsonb_agg(
              jsonb_build_object(
                'optionId', option.value -> 'optionId',
                'text', option.value -> 'text'
              )
            ),
            '[]'::jsonb
          )
          from jsonb_array_elements(question.value -> 'options') as option(value)
        )
      )
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(p_questions) as question(value);
$function$;

create function private.project_learner_catalog_payload(
  p_activity_type text,
  p_payload jsonb
)
returns jsonb
language plpgsql
immutable
strict
set search_path = pg_catalog, private
as $function$
begin
  case p_activity_type
    when 'grammar' then
      return jsonb_build_object(
        'examples', p_payload -> 'examples',
        'explanationVietnamese', p_payload -> 'explanationVietnamese',
        'grammarPoint', p_payload -> 'grammarPoint'
      );
    when 'listening' then
      return jsonb_build_object(
        'audioAssetPath', p_payload -> 'audioAssetPath',
        'audioProductionStatus', p_payload -> 'audioProductionStatus',
        'questions', private.project_learner_catalog_questions(p_payload -> 'questions'),
        'transcript', p_payload -> 'transcript'
      );
    when 'objective_quiz' then
      return jsonb_build_object(
        'questions', private.project_learner_catalog_questions(p_payload -> 'questions')
      );
    when 'reading' then
      return jsonb_build_object(
        'questions', private.project_learner_catalog_questions(p_payload -> 'questions'),
        'text', p_payload -> 'text'
      );
    when 'retrieval' then
      return jsonb_build_object(
        'prompt', p_payload -> 'prompt',
        'promptVietnamese', p_payload -> 'promptVietnamese'
      );
    when 'speaking', 'writing' then
      return jsonb_build_object(
        'scenarioVietnamese', p_payload -> 'scenarioVietnamese',
        'targetPrompt', p_payload -> 'targetPrompt'
      );
    when 'vocabulary' then
      return jsonb_build_object('entries', p_payload -> 'entries');
    else
      raise exception using
        errcode = '22023',
        message = 'Unsupported learner activity type.';
  end case;
end;
$function$;

create view public.learner_catalog_activities
with (security_barrier = true, security_invoker = false)
as
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

revoke select on table public.activities from authenticated;
revoke all on table public.learner_catalog_activities
  from public, anon, authenticated, service_role;
grant select on table public.learner_catalog_activities to authenticated;

revoke all on function private.project_learner_catalog_questions(jsonb)
  from public, anon, authenticated, service_role;
revoke all on function private.project_learner_catalog_payload(text, jsonb)
  from public, anon, authenticated, service_role;

alter function private.project_learner_catalog_questions(jsonb)
  owner to app_security_definer;
alter function private.project_learner_catalog_payload(text, jsonb)
  owner to app_security_definer;
alter view public.learner_catalog_activities owner to app_security_definer;

revoke create on schema private, public from app_security_definer;
