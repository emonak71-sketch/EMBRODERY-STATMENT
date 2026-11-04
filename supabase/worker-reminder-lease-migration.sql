-- Additive reliability upgrade for cross-device reminder claims.
-- Existing claims are treated as already sent; no delivery rows are deleted.
alter table public."WorkerReminderDeliveries"
  add column if not exists status text not null default 'sent';
alter table public."WorkerReminderDeliveries"
  add column if not exists claimed_at timestamptz not null default now();
alter table public."WorkerReminderDeliveries"
  alter column sent_at drop not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'worker_reminder_delivery_status_check'
      and conrelid = 'public."WorkerReminderDeliveries"'::regclass
  ) then
    alter table public."WorkerReminderDeliveries"
      add constraint worker_reminder_delivery_status_check
      check (status in ('pending','sent'));
  end if;
end $$;

create or replace function public.claim_worker_attendance_reminder(
  p_attendance_date date,
  p_session text
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_rows integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_session not in ('morning','night') then
    raise exception 'Invalid attendance session';
  end if;

  insert into public."WorkerReminderDeliveries"
    (user_id, attendance_date, session, status, claimed_at, sent_at)
  values
    (v_user_id, p_attendance_date, p_session, 'pending', now(), null)
  on conflict (user_id, attendance_date, session)
  do update set
    status = 'pending',
    claimed_at = now(),
    sent_at = null
  where public."WorkerReminderDeliveries".status = 'pending'
    and public."WorkerReminderDeliveries".claimed_at < now() - interval '3 minutes';

  get diagnostics v_rows = row_count;
  return v_rows = 1;
end;
$$;

create or replace function public.complete_worker_attendance_reminder(
  p_attendance_date date,
  p_session text
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  update public."WorkerReminderDeliveries"
  set status = 'sent', sent_at = now()
  where user_id = v_user_id
    and attendance_date = p_attendance_date
    and session = p_session
    and status = 'pending'
    and claimed_at >= now() - interval '3 minutes';
  return found;
end;
$$;

revoke all on function public.claim_worker_attendance_reminder(date, text) from public;
revoke all on function public.complete_worker_attendance_reminder(date, text) from public;
grant execute on function public.claim_worker_attendance_reminder(date, text) to authenticated;
grant execute on function public.complete_worker_attendance_reminder(date, text) to authenticated;
