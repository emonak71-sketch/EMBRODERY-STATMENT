-- Embroidery Statement 1.0.1: append-only account-scoped business activity history.
-- Additive DDL only: no existing business rows are updated, deleted, or backfilled.
-- History begins from the moment these triggers are installed.

begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public."ActivityHistory" (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  actor_id uuid,
  table_name text not null,
  record_id text,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  changed_at timestamptz not null default clock_timestamp()
);
create index if not exists activity_history_user_time_idx on public."ActivityHistory" (user_id, changed_at desc);
create index if not exists activity_history_user_module_idx on public."ActivityHistory" (user_id, table_name, changed_at desc);
alter table public."ActivityHistory" enable row level security;
revoke all on public."ActivityHistory" from anon, authenticated;
grant select on public."ActivityHistory" to authenticated;
drop policy if exists "ActivityHistory owner read" on public."ActivityHistory";
create policy "ActivityHistory owner read" on public."ActivityHistory"
  for select to authenticated using ((select auth.uid()) = user_id);

create or replace function private.capture_business_activity()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_old jsonb; v_new jsonb; v_user_id uuid; v_actor_id uuid;
  v_claim_role text; v_record_id text;
begin
  v_actor_id := auth.uid();
  v_claim_role := current_setting('request.jwt.claim.role', true);
  if tg_op = 'INSERT' then
    v_new := to_jsonb(new);
    v_user_id := coalesce(nullif(v_new->>'user_id', '')::uuid, v_actor_id);
    v_record_id := coalesce(v_new->>'id', v_new->>'worker_code');
  elsif tg_op = 'UPDATE' then
    v_old := to_jsonb(old); v_new := to_jsonb(new);
    if v_old = v_new then return new; end if;
    v_user_id := coalesce(nullif(v_new->>'user_id', '')::uuid, nullif(v_old->>'user_id', '')::uuid, v_actor_id);
    v_record_id := coalesce(v_new->>'id', v_old->>'id', v_new->>'worker_code', v_old->>'worker_code');
  else
    v_old := to_jsonb(old);
    v_user_id := coalesce(nullif(v_old->>'user_id', '')::uuid, v_actor_id);
    v_record_id := coalesce(v_old->>'id', v_old->>'worker_code');
  end if;
  if v_user_id is null then raise exception 'Audit event rejected: business row has no account owner.'; end if;
  if v_actor_id is null and coalesce(v_claim_role, '') <> 'service_role' then
    raise exception 'Audit event rejected: authenticated actor is required.';
  end if;
  if v_actor_id is not null and v_actor_id is distinct from v_user_id then
    raise exception 'Audit event rejected: actor does not own the business record.';
  end if;
  insert into public."ActivityHistory"(user_id, actor_id, table_name, record_id, action, old_data, new_data)
  values (v_user_id, v_actor_id, tg_table_name, v_record_id, tg_op, v_old, v_new);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function private.capture_business_activity() from public, anon, authenticated;

create or replace function private.prevent_activity_history_mutation()
returns trigger language plpgsql set search_path = pg_catalog, public, private
as $$ begin
  raise exception 'Activity history is append-only and cannot be changed, deleted, or truncated.';
end; $$;
revoke all on function private.prevent_activity_history_mutation() from public, anon, authenticated;
drop trigger if exists activity_history_block_update on public."ActivityHistory";
create trigger activity_history_block_update before update or delete on public."ActivityHistory"
  for each row execute function private.prevent_activity_history_mutation();
drop trigger if exists activity_history_block_truncate on public."ActivityHistory";
create trigger activity_history_block_truncate before truncate on public."ActivityHistory"
  for each statement execute function private.prevent_activity_history_mutation();

do $$
declare
  v_table text;
  v_tables text[] := array[
    'Parties','Transactions','Products','Expenses','Sales','Workers','WorkerAttendance',
    'WorkerNightAttendance','WorkerPayroll','WorkerDocuments','WorkerSalaryIncrements',
    'WorkerAdvances','WorkerAdvanceRecoveries','WorkerSmsLogs','WorkerReminderDeliveries'
  ];
  v_trigger text;
begin
  foreach v_table in array v_tables loop
    if to_regclass(format('public.%I', v_table)) is not null then
      v_trigger := 'audit_' || lower(regexp_replace(v_table, '[^a-zA-Z0-9]+', '_', 'g'));
      if not exists (select 1 from pg_trigger where tgname = v_trigger
        and tgrelid = to_regclass(format('public.%I', v_table)) and not tgisinternal) then
        execute format('create trigger %I after insert or update or delete on public.%I for each row execute function private.capture_business_activity()',v_trigger,v_table);
      end if;
    end if;
  end loop;
end;
$$;
commit;
