-- Learner mutations must reauthorize both account and learner-role state inside
-- the same database transaction that appends progress. Locking both rows makes
-- a concurrent revocation wait, or makes this mutation observe the revocation.

grant update (revoked_at) on table public.account_roles to app_security_definer;

create or replace function private.require_active_learning_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
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
end;
$function$;

alter function private.require_active_learning_account(uuid)
  owner to app_security_definer;
