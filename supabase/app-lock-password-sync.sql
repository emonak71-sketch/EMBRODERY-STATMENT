-- Shared App Lock password for Web and Windows Desktop.
-- Additive only: no business, worker, attendance, payroll or history rows are changed.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table if not exists private.app_lock_credentials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  password_salt text not null,
  password_hash text not null,
  iterations integer not null check (iterations between 100000 and 1000000),
  failed_attempts integer not null default 0 check (failed_attempts between 0 and 100),
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table private.app_lock_credentials enable row level security;
revoke all on table private.app_lock_credentials from public, anon, authenticated;
grant select, insert, update, delete on table private.app_lock_credentials to service_role;

create or replace function public.app_lock_get(p_user_id uuid)
returns table (password_salt text, password_hash text, iterations integer, failed_attempts integer, locked_until timestamptz, updated_at timestamptz)
language sql stable security invoker set search_path = ''
as $function$
  select c.password_salt, c.password_hash, c.iterations, c.failed_attempts, c.locked_until, c.updated_at
  from private.app_lock_credentials as c where c.user_id = p_user_id;
$function$;

create or replace function public.app_lock_create(p_user_id uuid, p_password_salt text, p_password_hash text, p_iterations integer)
returns timestamptz
language plpgsql security invoker set search_path = ''
as $function$
declare v_updated_at timestamptz;
begin
  insert into private.app_lock_credentials (user_id, password_salt, password_hash, iterations, failed_attempts, locked_until, updated_at)
  values (p_user_id, p_password_salt, p_password_hash, p_iterations, 0, null, now())
  on conflict (user_id) do nothing
  returning updated_at into v_updated_at;
  return v_updated_at;
end;
$function$;

create or replace function public.app_lock_upsert(p_user_id uuid, p_password_salt text, p_password_hash text, p_iterations integer)
returns timestamptz
language plpgsql security invoker set search_path = ''
as $function$
declare v_updated_at timestamptz;
begin
  insert into private.app_lock_credentials (user_id, password_salt, password_hash, iterations, failed_attempts, locked_until, updated_at)
  values (p_user_id, p_password_salt, p_password_hash, p_iterations, 0, null, now())
  on conflict (user_id) do update
    set password_salt = excluded.password_salt,
        password_hash = excluded.password_hash,
        iterations = excluded.iterations,
        failed_attempts = 0,
        locked_until = null,
        updated_at = now()
  returning updated_at into v_updated_at;
  return v_updated_at;
end;
$function$;

create or replace function public.app_lock_record_failure(p_user_id uuid)
returns table (attempt_count integer, blocked_until timestamptz)
language sql security invoker set search_path = ''
as $function$
  update private.app_lock_credentials as c
  set failed_attempts = c.failed_attempts + 1,
      locked_until = case when c.failed_attempts + 1 >= 5 then now() + interval '5 minutes' else c.locked_until end
  where c.user_id = p_user_id
  returning c.failed_attempts, c.locked_until;
$function$;

create or replace function public.app_lock_clear_failures(p_user_id uuid)
returns void
language sql security invoker set search_path = ''
as $function$
  update private.app_lock_credentials set failed_attempts = 0, locked_until = null where user_id = p_user_id;
$function$;

revoke all on function public.app_lock_get(uuid) from public, anon, authenticated;
revoke all on function public.app_lock_create(uuid, text, text, integer) from public, anon, authenticated;
revoke all on function public.app_lock_upsert(uuid, text, text, integer) from public, anon, authenticated;
revoke all on function public.app_lock_record_failure(uuid) from public, anon, authenticated;
revoke all on function public.app_lock_clear_failures(uuid) from public, anon, authenticated;

grant execute on function public.app_lock_get(uuid) to service_role;
grant execute on function public.app_lock_create(uuid, text, text, integer) to service_role;
grant execute on function public.app_lock_upsert(uuid, text, text, integer) to service_role;
grant execute on function public.app_lock_record_failure(uuid) to service_role;
grant execute on function public.app_lock_clear_failures(uuid) to service_role;

comment on table private.app_lock_credentials is 'Server-only App Lock password hashes. No client role can read or write this table.';
