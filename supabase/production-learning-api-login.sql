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
  elsif exists (
    select 1
    from pg_catalog.pg_auth_members memberships
    join pg_catalog.pg_roles granted_roles
      on granted_roles.oid = memberships.roleid
    where memberships.member = existing_role.oid
      and (
        granted_roles.rolname <> 'app_learning_api_executor'
        or memberships.admin_option
      )
  ) or exists (
    select 1
    from pg_catalog.pg_auth_members memberships
    where memberships.member = (
      select roles.oid
      from pg_catalog.pg_roles roles
      where roles.rolname = 'app_learning_api_executor'
    )
  ) then
    raise exception using
      errcode = '42501',
      message = 'Existing learning API role memberships exceed the approved executor boundary.';
  elsif exists (
    select 1 from pg_catalog.pg_class where relowner = existing_role.oid
    union all
    select 1 from pg_catalog.pg_proc where proowner = existing_role.oid
    union all
    select 1 from pg_catalog.pg_namespace where nspowner = existing_role.oid
    union all
    select 1 from pg_catalog.pg_type where typowner = existing_role.oid
    union all
    select 1 from pg_catalog.pg_database where datdba = existing_role.oid
    union all
    select 1 from pg_catalog.pg_extension where extowner = existing_role.oid
    union all
    select 1 from pg_catalog.pg_default_acl where defaclrole = existing_role.oid
  ) or exists (
    select 1
    from pg_catalog.pg_class objects
    cross join lateral pg_catalog.aclexplode(objects.relacl) privileges
    where privileges.grantee = existing_role.oid
    union all
    select 1
    from pg_catalog.pg_proc routines
    cross join lateral pg_catalog.aclexplode(routines.proacl) privileges
    where privileges.grantee = existing_role.oid
    union all
    select 1
    from pg_catalog.pg_namespace schemas
    cross join lateral pg_catalog.aclexplode(schemas.nspacl) privileges
    where privileges.grantee = existing_role.oid
    union all
    select 1
    from pg_catalog.pg_database databases
    cross join lateral pg_catalog.aclexplode(databases.datacl) privileges
    where privileges.grantee = existing_role.oid
    union all
    select 1
    from pg_catalog.pg_type types
    cross join lateral pg_catalog.aclexplode(types.typacl) privileges
    where privileges.grantee = existing_role.oid
    union all
    select 1
    from pg_catalog.pg_attribute columns
    cross join lateral pg_catalog.aclexplode(columns.attacl) privileges
    where privileges.grantee = existing_role.oid
    union all
    select 1
    from pg_catalog.pg_default_acl defaults
    cross join lateral pg_catalog.aclexplode(defaults.defaclacl) privileges
    where privileges.grantee = existing_role.oid
  ) then
    raise exception using
      errcode = '42501',
      message = 'Existing learning API login owns objects or has direct database privileges.';
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
