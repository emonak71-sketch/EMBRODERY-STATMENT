-- Safe, additive migration. Never alters existing WorkerAttendance rows.
-- Daily WorkerAttendance remains the morning/legacy attendance register.
-- Night records are independently saved in WorkerNightAttendance.
create table if not exists public."WorkerNightAttendance" (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  worker_id uuid not null,
  attendance_date date not null,
  status text not null check (status in ('present','absent','late','half_day','leave')),
  check_in time,
  check_out time,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint worker_night_attendance_unique unique (user_id, worker_id, attendance_date),
  constraint worker_night_attendance_worker_fk
    foreign key (user_id, worker_id) references public."Workers"(user_id, id)
    on delete restrict
);
create index if not exists worker_night_attendance_user_date_idx
  on public."WorkerNightAttendance"(user_id, attendance_date);
alter table public."WorkerNightAttendance" enable row level security;
drop policy if exists "WorkerNightAttendance owner access" on public."WorkerNightAttendance";
create policy "WorkerNightAttendance owner access"
  on public."WorkerNightAttendance" for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public."WorkerNightAttendance" to authenticated;

-- Cross-device duplicate suppression (one claimed reminder per session/day/user).
-- A notification claim is created only after attendance was verified incomplete.
create table if not exists public."WorkerReminderDeliveries" (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  attendance_date date not null,
  session text not null check (session in ('morning','night')),
  sent_at timestamptz not null default now(),
  constraint worker_reminder_delivery_unique unique (user_id, attendance_date, session)
);
alter table public."WorkerReminderDeliveries" enable row level security;
drop policy if exists "WorkerReminderDeliveries owner access" on public."WorkerReminderDeliveries";
create policy "WorkerReminderDeliveries owner access"
  on public."WorkerReminderDeliveries" for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
grant select, insert, delete on public."WorkerReminderDeliveries" to authenticated;
