-- Password-recovery account lookup throttling.
-- Stores only keyed hashes of email addresses and IP addresses; no raw values are persisted.

create table if not exists public.password_recovery_rate_limits (
  key_type text not null check (key_type in ('email', 'ip')),
  key_hash text not null,
  window_started_at timestamptz not null default now(),
  attempts integer not null default 1 check (attempts > 0),
  updated_at timestamptz not null default now(),
  primary key (key_type, key_hash)
);

alter table public.password_recovery_rate_limits enable row level security;

revoke all on table public.password_recovery_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.password_recovery_rate_limits to service_role;

create or replace function public.consume_password_recovery_attempt(
  p_email_hash text,
  p_ip_hash text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_email_attempts integer;
  v_ip_attempts integer;
begin
  if coalesce(p_email_hash, '') = '' or coalesce(p_ip_hash, '') = '' then
    return false;
  end if;

  delete from public.password_recovery_rate_limits
  where updated_at < v_now - interval '24 hours';

  insert into public.password_recovery_rate_limits as current_limit
    (key_type, key_hash, window_started_at, attempts, updated_at)
  values
    ('email', p_email_hash, v_now, 1, v_now)
  on conflict (key_type, key_hash) do update
    set window_started_at = case
          when current_limit.window_started_at <= v_now - interval '1 hour' then v_now
          else current_limit.window_started_at
        end,
        attempts = case
          when current_limit.window_started_at <= v_now - interval '1 hour' then 1
          else current_limit.attempts + 1
        end,
        updated_at = v_now
  returning attempts into v_email_attempts;

  insert into public.password_recovery_rate_limits as current_limit
    (key_type, key_hash, window_started_at, attempts, updated_at)
  values
    ('ip', p_ip_hash, v_now, 1, v_now)
  on conflict (key_type, key_hash) do update
    set window_started_at = case
          when current_limit.window_started_at <= v_now - interval '1 hour' then v_now
          else current_limit.window_started_at
        end,
        attempts = case
          when current_limit.window_started_at <= v_now - interval '1 hour' then 1
          else current_limit.attempts + 1
        end,
        updated_at = v_now
  returning attempts into v_ip_attempts;

  return v_email_attempts <= 3 and v_ip_attempts <= 10;
end;
$function$;

revoke all on function public.consume_password_recovery_attempt(text, text) from public, anon, authenticated;
grant execute on function public.consume_password_recovery_attempt(text, text) to service_role;
