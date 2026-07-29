-- RLS, least-privilege grants, and private Storage policies for identity data.
-- No application client receives the service-role credential. The worker is the
-- only runtime allowed to hold it, and private schema objects are not exposed by
-- the Supabase Data API configuration.

create function private.is_active_account(subject_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select exists (
    select 1
    from public.profiles
    where user_id = subject_id
      and account_state = 'active'
      and revoked_at is null
  );
$function$;

create function private.has_current_role(subject_id uuid, required_role text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select exists (
    select 1
    from public.profiles
    join public.account_roles
      on account_roles.user_id = profiles.user_id
    where profiles.user_id = subject_id
      and profiles.account_state = 'active'
      and profiles.revoked_at is null
      and account_roles.role = required_role
      and account_roles.revoked_at is null
  );
$function$;

create function private.session_claim_matches(subject_id uuid, candidate_session_id uuid)
returns boolean
language sql
stable
set search_path = pg_catalog, auth
as $function$
  select subject_id = (select auth.uid())
    and candidate_session_id is not null
    and candidate_session_id::text = coalesce((select auth.jwt() ->> 'session_id'), '');
$function$;

create function private.role_epoch_matches(subject_id uuid, expected_role_epoch bigint)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select subject_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles
      where user_id = subject_id
        and account_state = 'active'
        and revoked_at is null
        and role_epoch = expected_role_epoch
    );
$function$;

grant create on schema private to app_security_definer;
alter function private.is_active_account(uuid) owner to app_security_definer;
alter function private.has_current_role(uuid, text) owner to app_security_definer;
alter function private.role_epoch_matches(uuid, bigint) owner to app_security_definer;
revoke create on schema private from app_security_definer;

alter table public.profiles enable row level security;
alter table public.account_roles enable row level security;
alter table public.consent_records enable row level security;
alter table public.data_subject_requests enable row level security;
alter table private.security_events enable row level security;

revoke all on table public.profiles from public, anon, authenticated;
revoke all on table public.account_roles from public, anon, authenticated;
revoke all on table public.consent_records from public, anon, authenticated;
revoke all on table public.data_subject_requests from public, anon, authenticated;
revoke all on table storage.buckets from public, anon, authenticated;
revoke all on table storage.objects from public, anon, authenticated;

grant select on table public.profiles to authenticated;
grant update (display_name, preferred_ui_locale, timezone)
  on table public.profiles to authenticated;
grant select on table public.account_roles to authenticated;
grant select on table public.consent_records to authenticated;
grant select on table public.data_subject_requests to authenticated;
grant select, insert, update, delete on table storage.objects to authenticated;

grant usage on schema private to authenticated, service_role;
grant execute on function private.is_active_account(uuid) to authenticated, service_role;
grant execute on function private.has_current_role(uuid, text) to authenticated, service_role;
grant execute on function private.session_claim_matches(uuid, uuid) to authenticated, service_role;
grant execute on function private.role_epoch_matches(uuid, bigint) to authenticated, service_role;
grant execute on function private.record_registration_approval(
  text,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  uuid
) to service_role;
grant execute on function private.claim_data_subject_request(uuid, bigint, uuid, integer)
  to service_role;
grant execute on function private.complete_data_subject_request(uuid, bigint, uuid, text)
  to service_role;
grant execute on function private.reclaim_expired_data_subject_request(uuid, bigint, uuid, integer)
  to service_role;
grant execute on function private.fail_data_subject_request(uuid, bigint, uuid, text)
  to service_role;

grant all on table public.profiles to service_role;
grant all on table public.account_roles to service_role;
grant all on table public.consent_records to service_role;
grant all on table public.data_subject_requests to service_role;
revoke all on table private.registration_approvals from service_role;
grant select, insert on table private.security_events to service_role;
grant all on table storage.buckets to service_role;
grant all on table storage.objects to service_role;

create policy "internal security definer: manage profiles"
on public.profiles
for all
to app_security_definer
using (true)
with check (true);

create policy "internal security definer: manage account roles"
on public.account_roles
for all
to app_security_definer
using (true)
with check (true);

create policy "internal security definer: record consent"
on public.consent_records
for insert
to app_security_definer
with check (true);

create policy "internal security definer: manage data subject requests"
on public.data_subject_requests
for all
to app_security_definer
using (true)
with check (true);

create policy "profiles: select own row"
on public.profiles
for select
to authenticated
using (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
);

create policy "profiles: update own preferences"
on public.profiles
for update
to authenticated
using (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
  and private.is_active_account((select auth.uid()))
)
with check (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
  and private.is_active_account((select auth.uid()))
);

create policy "profiles: deny direct insert"
on public.profiles
for insert
to authenticated
with check (false);

create policy "profiles: deny direct delete"
on public.profiles
for delete
to authenticated
using (false);

create policy "account roles: select own active roles"
on public.account_roles
for select
to authenticated
using (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
  and revoked_at is null
  and private.is_active_account((select auth.uid()))
);

create policy "account roles: deny direct insert"
on public.account_roles
for insert
to authenticated
with check (false);

create policy "account roles: deny direct update"
on public.account_roles
for update
to authenticated
using (false)
with check (false);

create policy "account roles: deny direct delete"
on public.account_roles
for delete
to authenticated
using (false);

create policy "consent records: select own history"
on public.consent_records
for select
to authenticated
using (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
);

create policy "consent records: deny direct insert"
on public.consent_records
for insert
to authenticated
with check (false);

create policy "consent records: deny direct update"
on public.consent_records
for update
to authenticated
using (false)
with check (false);

create policy "consent records: deny direct delete"
on public.consent_records
for delete
to authenticated
using (false);

create policy "data subject requests: select own requests"
on public.data_subject_requests
for select
to authenticated
using (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
);

create policy "data subject requests: deny direct insert"
on public.data_subject_requests
for insert
to authenticated
with check (false);

create policy "data subject requests: deny direct update"
on public.data_subject_requests
for update
to authenticated
using (false)
with check (false);

create policy "data subject requests: deny direct delete"
on public.data_subject_requests
for delete
to authenticated
using (false);

create policy "security events: deny all direct access"
on private.security_events
as restrictive
for all
to public
using (false)
with check (false);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values
  (
    'learner-recordings',
    'learner-recordings',
    false,
    52428800,
    array['audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/webm']
  ),
  (
    'learner-attachments',
    'learner-attachments',
    false,
    10485760,
    array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'learner-exports',
    'learner-exports',
    false,
    262144000,
    array['application/json', 'application/zip', 'text/csv']
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "learner uploads: read own active prefix"
on storage.objects
for select
to authenticated
using (
  bucket_id in ('learner-recordings', 'learner-attachments')
  and private.is_active_account((select auth.uid()))
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and name !~ '(^|/)\.{1,2}(/|$)'
);

create policy "learner uploads: insert own active prefix"
on storage.objects
for insert
to authenticated
with check (
  bucket_id in ('learner-recordings', 'learner-attachments')
  and private.is_active_account((select auth.uid()))
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and owner_id = (select auth.uid()::text)
  and name !~ '(^|/)\.{1,2}(/|$)'
);

create policy "learner uploads: update own active prefix"
on storage.objects
for update
to authenticated
using (
  bucket_id in ('learner-recordings', 'learner-attachments')
  and private.is_active_account((select auth.uid()))
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and owner_id = (select auth.uid()::text)
  and name !~ '(^|/)\.{1,2}(/|$)'
)
with check (
  bucket_id in ('learner-recordings', 'learner-attachments')
  and private.is_active_account((select auth.uid()))
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and owner_id = (select auth.uid()::text)
  and name !~ '(^|/)\.{1,2}(/|$)'
);

create policy "learner uploads: delete own active prefix"
on storage.objects
for delete
to authenticated
using (
  bucket_id in ('learner-recordings', 'learner-attachments')
  and private.is_active_account((select auth.uid()))
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and owner_id = (select auth.uid()::text)
  and name !~ '(^|/)\.{1,2}(/|$)'
);

create policy "learner exports: read own active prefix"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'learner-exports'
  and private.is_active_account((select auth.uid()))
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and name !~ '(^|/)\.{1,2}(/|$)'
);

revoke all on function private.is_active_account(uuid) from public, anon;
revoke all on function private.has_current_role(uuid, text) from public, anon;
revoke all on function private.session_claim_matches(uuid, uuid) from public, anon;
revoke all on function private.role_epoch_matches(uuid, bigint) from public, anon;
