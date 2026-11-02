-- Additive migration: new tables only. Existing Parties, Transactions and ledger rows are untouched.
create table if not exists public."Workers" (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 worker_code text not null, full_name text not null, phone text not null default '',
 designation text not null default '', joining_date date not null default current_date,
 monthly_salary numeric(12,2) not null default 0 check(monthly_salary>=0),
 is_active boolean not null default true, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), unique(user_id,worker_code), unique(user_id,id)
);
create table if not exists public."WorkerAttendance" (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 worker_id uuid not null, attendance_date date not null,
 status text not null check(status in ('present','absent','late','half_day','leave')),
 check_in time, check_out time, note text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint worker_attendance_worker_fk foreign key(user_id,worker_id) references public."Workers"(user_id,id) on delete restrict,
 unique(user_id,worker_id,attendance_date)
);
create table if not exists public."WorkerPayroll" (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 worker_id uuid not null, month_key text not null check (month_key ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
 basic_salary numeric(12,2) not null default 0 check(basic_salary>=0),
 overtime_hours numeric(8,2) not null default 0 check(overtime_hours>=0),
 overtime_amount numeric(12,2) not null default 0 check(overtime_amount>=0),
 bonus numeric(12,2) not null default 0 check(bonus>=0),
 deduction numeric(12,2) not null default 0 check(deduction>=0),
 net_salary numeric(12,2) not null default 0,
 status text not null default 'draft' check(status in ('draft','paid')), paid_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint worker_payroll_worker_fk foreign key(user_id,worker_id) references public."Workers"(user_id,id) on delete restrict,
 unique(user_id,worker_id,month_key)
);
create index if not exists worker_attendance_date_idx on public."WorkerAttendance"(user_id,attendance_date);
create index if not exists worker_payroll_month_idx on public."WorkerPayroll"(user_id,month_key);
alter table public."Workers" enable row level security;
alter table public."WorkerAttendance" enable row level security;
alter table public."WorkerPayroll" enable row level security;
drop policy if exists "Workers owner access" on public."Workers";
create policy "Workers owner access" on public."Workers" for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists "WorkerAttendance owner access" on public."WorkerAttendance";
create policy "WorkerAttendance owner access" on public."WorkerAttendance" for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists "WorkerPayroll owner access" on public."WorkerPayroll";
create policy "WorkerPayroll owner access" on public."WorkerPayroll" for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
