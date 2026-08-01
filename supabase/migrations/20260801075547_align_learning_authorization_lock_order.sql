-- Role mutations lock account_roles before their role-epoch trigger updates
-- profiles. Learner writes must use the same order so concurrent revocation
-- cannot form an account_roles <-> profiles deadlock cycle.

create or replace function private.require_active_learning_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  perform 1
  from public.account_roles
  where user_id = p_user_id
    and role = 'learner'
    and revoked_at is null
  for update;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'Only active learner accounts may mutate learning state.';
  end if;

  perform 1
  from public.profiles
  where user_id = p_user_id
    and account_state = 'active'
    and revoked_at is null
  for update;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'Only active learner accounts may mutate learning state.';
  end if;
end;
$function$;

alter function private.require_active_learning_account(uuid)
  owner to app_security_definer;
