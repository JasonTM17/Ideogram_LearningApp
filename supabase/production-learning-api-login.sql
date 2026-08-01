-- Run after Supabase migrations with an administrative PostgreSQL connection.
-- This file intentionally sets no password. Configure the credential through
-- the deployment platform or secret manager, then store only the resulting
-- connection URL in the web runtime's LEARNING_DATABASE_URL secret.

begin;

do $provision$
declare
  existing_role pg_catalog.pg_roles%rowtype;
begin
  select *
  into existing_role
  from pg_catalog.pg_roles
  where rolname = 'ideogram_learning_web_login';

  if existing_role.rolname is null then
    create role ideogram_learning_web_login;
  elsif existing_role.rolsuper
    or existing_role.rolcreatedb
    or existing_role.rolcreaterole
    or existing_role.rolreplication
    or existing_role.rolbypassrls then
    raise exception using
      errcode = '42501',
      message = 'Existing learning API login has elevated attributes; revoke them as an administrator.';
  end if;
end;
$provision$;

alter role ideogram_learning_web_login with
  login
  noinherit
  connection limit 20;

grant app_learning_api_executor to ideogram_learning_web_login;

alter role ideogram_learning_web_login set statement_timeout = '7s';
alter role ideogram_learning_web_login set lock_timeout = '3s';
alter role ideogram_learning_web_login set idle_in_transaction_session_timeout = '10s';

comment on role ideogram_learning_web_login is
  'Next.js login; must SET ROLE app_learning_api_executor for learner mutations.';

commit;
