-- Embroidery Statement: additive Worker Management upgrade
-- SAFE: does not delete, rename, truncate, reassign, or rewrite existing business rows.
-- Run once in the EXISTING Supabase project after taking a backup.
-- Existing Parties, Transactions, Products, Expenses, Sales, Auth users and Storage objects are untouched.
-- Signup OTP is configured separately; this Worker migration does not change Auth triggers or users.

begin;

-- 0) Keep a per-worker active salary cycle.
-- The cycle starts in the current Bangladesh calendar month and advances only
-- after that worker's payroll for the active month is marked Paid.
alter table public."Workers"
  add column if not exists active_salary_month text not null
  default to_char((now() at time zone 'Asia/Dhaka')::date, 'YYYY-MM');

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public."Workers"'::regclass
      and conname = 'workers_active_salary_month_check'
  ) then
    alter table public."Workers"
      add constraint workers_active_salary_month_check
      check (active_salary_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');
  end if;
end $$;

-- 1) Automatic worker IDs. A single global sequence prevents collisions across accounts.
create sequence if not exists public.worker_code_seq start with 1000 increment by 1;

do $$
declare
  v_last bigint;
  v_is_called boolean;
  v_max bigint;
  v_has_workers boolean;
begin
  select last_value, is_called into v_last, v_is_called
  from public.worker_code_seq;

  select
    greatest(1000, coalesce(max(nullif(substring(worker_code from '([0-9]+)$'), '')::bigint), 1000)),
    exists (select 1 from public."Workers")
  into v_max, v_has_workers
  from public."Workers";

  if v_is_called or v_has_workers or v_max > 1000 then
    perform setval('public.worker_code_seq', greatest(v_last, v_max), true);
  else
    -- First generated ID is EMP-1000, not EMP-1001.
    perform setval('public.worker_code_seq', 1000, false);
  end if;
end $$;

create or replace function public.assign_worker_code()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_worker_number bigint;
  v_worker_text text;
begin
  if new.worker_code is null or btrim(new.worker_code) = '' then
    v_worker_number := nextval('public.worker_code_seq');
    v_worker_text := v_worker_number::text;
    new.worker_code := 'EMP-' || lpad(v_worker_text, greatest(4, length(v_worker_text)), '0');
  end if;
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'workers_assign_worker_code'
      and tgrelid = 'public."Workers"'::regclass
      and not tgisinternal
  ) then
    create trigger workers_assign_worker_code
      before insert on public."Workers"
      for each row execute function public.assign_worker_code();
  end if;
end $$;

revoke all on function public.assign_worker_code() from PUBLIC, anon, authenticated;
grant usage, select on sequence public.worker_code_seq to authenticated;

-- 2) Worker documents metadata. Actual files live in a private Storage bucket.
create table if not exists public."WorkerDocuments" (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  worker_id uuid not null,
  document_type text not null check (
    document_type in (
      'profile_photo', 'nid_front', 'nid_back',
      'birth_certificate', 'driving_license', 'passport', 'other'
    )
  ),
  file_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size bigint not null check (file_size > 0 and file_size <= 10485760),
  uploaded_at timestamptz not null default now(),
  notes text,
  constraint worker_documents_worker_fk
    foreign key (user_id, worker_id)
    references public."Workers"(user_id, id) on delete restrict,
  constraint worker_documents_path_unique unique (user_id, file_path),
  constraint worker_documents_user_id_unique unique (user_id, id)
);

create index if not exists worker_documents_worker_idx
  on public."WorkerDocuments"(user_id, worker_id, document_type, uploaded_at desc);

alter table public."WorkerDocuments" enable row level security;
grant select, insert on public."WorkerDocuments" to authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='WorkerDocuments' and policyname='WorkerDocuments owner select') then
    create policy "WorkerDocuments owner select" on public."WorkerDocuments"
      for select to authenticated using ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='WorkerDocuments' and policyname='WorkerDocuments owner insert') then
    create policy "WorkerDocuments owner insert" on public."WorkerDocuments"
      for insert to authenticated with check ((select auth.uid()) = user_id);
  end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'worker-documents',
  'worker-documents',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Worker documents owner read') then
    create policy "Worker documents owner read" on storage.objects
      for select to authenticated
      using (
        bucket_id = 'worker-documents'
        and (storage.foldername(name))[1] = (select auth.uid())::text
      );
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Worker documents owner upload') then
    create policy "Worker documents owner upload" on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'worker-documents'
        and (storage.foldername(name))[1] = (select auth.uid())::text
      );
  end if;
end $$;

-- 3) Salary increment history. The trigger updates the worker's current salary atomically.
create table if not exists public."WorkerSalaryIncrements" (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  worker_id uuid not null,
  previous_salary numeric(12,2) not null check (previous_salary >= 0),
  increment_amount numeric(12,2) not null check (increment_amount > 0),
  increment_percentage numeric(8,2) not null default 0 check (increment_percentage >= 0),
  new_salary numeric(12,2) not null check (new_salary > previous_salary),
  effective_date date not null,
  reason text not null default 'annual_appraisal',
  notes text,
  approved_by text,
  created_at timestamptz not null default now(),
  constraint worker_increment_worker_fk
    foreign key (user_id, worker_id)
    references public."Workers"(user_id, id) on delete restrict,
  constraint worker_increment_user_id_unique unique (user_id, id)
);

create index if not exists worker_salary_increments_history_idx
  on public."WorkerSalaryIncrements"(user_id, worker_id, effective_date desc);

alter table public."WorkerSalaryIncrements" enable row level security;
grant select, insert on public."WorkerSalaryIncrements" to authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='WorkerSalaryIncrements' and policyname='WorkerSalaryIncrements owner select') then
    create policy "WorkerSalaryIncrements owner select" on public."WorkerSalaryIncrements"
      for select to authenticated using ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='WorkerSalaryIncrements' and policyname='WorkerSalaryIncrements owner insert') then
    create policy "WorkerSalaryIncrements owner insert" on public."WorkerSalaryIncrements"
      for insert to authenticated with check ((select auth.uid()) = user_id);
  end if;
end $$;

create or replace function public.apply_worker_salary_increment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_current_salary numeric(12,2);
begin
  if auth.uid() is distinct from new.user_id then
    raise exception 'Worker account mismatch.';
  end if;

  if new.effective_date > current_date then
    raise exception 'Future-dated salary increments are not enabled. Use the effective date when the increment is applied.';
  end if;

  select monthly_salary
    into v_current_salary
    from public."Workers"
   where id = new.worker_id and user_id = new.user_id
   for update;

  if not found then
    raise exception 'Worker not found in this account.';
  end if;

  if round(v_current_salary, 2) <> round(new.previous_salary, 2) then
    raise exception 'Worker salary changed. Refresh the worker record and recalculate the increment.';
  end if;

  if round(new.new_salary, 2) <> round(new.previous_salary + new.increment_amount, 2) then
    raise exception 'New salary must equal previous salary plus increment amount.';
  end if;

  update public."Workers"
     set monthly_salary = new.new_salary,
         updated_at = now()
   where id = new.worker_id and user_id = new.user_id;

  -- Keep every still-unpaid draft in the effective salary month and later months
  -- aligned with the newly approved monthly salary. Paid payroll is never changed.
  update public."WorkerPayroll"
     set basic_salary = new.new_salary,
         net_salary = round(new.new_salary + overtime_amount + bonus - deduction, 2),
         updated_at = now()
   where user_id = new.user_id
     and worker_id = new.worker_id
     and status = 'draft'
     and month_key >= to_char(new.effective_date, 'YYYY-MM');

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'worker_salary_increment_apply'
      and tgrelid = 'public."WorkerSalaryIncrements"'::regclass
      and not tgisinternal
  ) then
    create trigger worker_salary_increment_apply
      before insert on public."WorkerSalaryIncrements"
      for each row execute function public.apply_worker_salary_increment();
  end if;
end $$;

revoke all on function public.apply_worker_salary_increment() from PUBLIC, anon, authenticated;

-- 4) Worker advances and a full-recovery ledger.
create table if not exists public."WorkerAdvances" (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  worker_id uuid not null,
  amount numeric(12,2) not null check (amount > 0),
  outstanding_amount numeric(12,2) not null check (outstanding_amount >= 0 and outstanding_amount <= amount),
  request_date date not null default current_date,
  disbursed_at timestamptz not null default now(),
  deduct_from_month text not null check (deduct_from_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  reason text not null default 'Salary advance',
  status text not null default 'outstanding' check (status in ('outstanding','recovered')),
  recovered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint worker_advances_worker_fk
    foreign key (user_id, worker_id)
    references public."Workers"(user_id, id) on delete restrict,
  constraint worker_advances_user_id_unique unique (user_id, id)
);

create index if not exists worker_advances_worker_month_idx
  on public."WorkerAdvances"(user_id, worker_id, deduct_from_month, status);

create index if not exists worker_advances_disbursed_idx
  on public."WorkerAdvances"(user_id, disbursed_at);

alter table public."WorkerAdvances" enable row level security;
grant select, insert on public."WorkerAdvances" to authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='WorkerAdvances' and policyname='WorkerAdvances owner select') then
    create policy "WorkerAdvances owner select" on public."WorkerAdvances"
      for select to authenticated using ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='WorkerAdvances' and policyname='WorkerAdvances owner insert') then
    create policy "WorkerAdvances owner insert" on public."WorkerAdvances"
      for insert to authenticated with check ((select auth.uid()) = user_id);
  end if;
end $$;

-- The composite foreign key below needs a unique (user_id, id) key on the existing payroll table.
create unique index if not exists worker_payroll_user_id_id_uidx
  on public."WorkerPayroll"(user_id, id);

create table if not exists public."WorkerAdvanceRecoveries" (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  worker_id uuid not null,
  advance_id uuid not null,
  payroll_id uuid not null,
  recovered_amount numeric(12,2) not null check (recovered_amount > 0),
  recovered_at timestamptz not null default now(),
  constraint worker_advance_recovery_worker_fk
    foreign key (user_id, worker_id)
    references public."Workers"(user_id, id) on delete restrict,
  constraint worker_advance_recovery_advance_fk
    foreign key (user_id, advance_id)
    references public."WorkerAdvances"(user_id, id) on delete restrict,
  constraint worker_advance_recovery_payroll_fk
    foreign key (user_id, payroll_id)
    references public."WorkerPayroll"(user_id, id) on delete restrict,
  constraint worker_advance_recovery_once unique (user_id, advance_id)
);

create index if not exists worker_advance_recoveries_payroll_idx
  on public."WorkerAdvanceRecoveries"(user_id, payroll_id);

alter table public."WorkerAdvanceRecoveries" enable row level security;
grant select on public."WorkerAdvanceRecoveries" to authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='WorkerAdvanceRecoveries' and policyname='WorkerAdvanceRecoveries owner select') then
    create policy "WorkerAdvanceRecoveries owner select" on public."WorkerAdvanceRecoveries"
      for select to authenticated using ((select auth.uid()) = user_id);
  end if;

end $$;

-- Do not allow a new advance to be assigned to a salary month already paid.
create or replace function public.validate_worker_advance_cycle()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_active_salary_month text;
begin
  if auth.uid() is distinct from new.user_id then
    raise exception 'Worker account mismatch.';
  end if;

  select active_salary_month
    into v_active_salary_month
    from public."Workers"
   where id = new.worker_id
     and user_id = new.user_id
   for update;

  if not found then
    raise exception 'Worker not found in this account.';
  end if;

  if new.deduct_from_month is distinct from v_active_salary_month then
    raise exception 'Advance must be assigned to the worker active salary cycle: %.', v_active_salary_month;
  end if;

  if exists (
    select 1
      from public."WorkerPayroll" p
     where p.user_id = new.user_id
       and p.worker_id = new.worker_id
       and p.month_key = new.deduct_from_month
       and p.status = 'paid'
  ) then
    raise exception 'This salary month is already paid. The next salary cycle must be used.';
  end if;

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'worker_advance_validate_cycle'
      and tgrelid = 'public."WorkerAdvances"'::regclass
      and not tgisinternal
  ) then
    create trigger worker_advance_validate_cycle
      before insert on public."WorkerAdvances"
      for each row execute function public.validate_worker_advance_cycle();
  end if;
end $$;

revoke all on function public.validate_worker_advance_cycle() from PUBLIC, anon, authenticated;

-- 5) Extend the existing payroll table without replacing any existing columns or rows.
alter table public."WorkerPayroll"
  add column if not exists advance_deduction numeric(12,2) not null default 0,
  add column if not exists payment_method text,
  add column if not exists payment_reference text,
  add column if not exists notes text;

create unique index if not exists worker_payroll_user_id_id_uidx
  on public."WorkerPayroll"(user_id, id);

-- A paid payroll is immutable. On first payment, all outstanding advances assigned
-- to that salary month are deducted in full, with one recovery ledger row per advance.
create or replace function public.prepare_worker_payroll_payment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_advance_total numeric(12,2);
  v_active_salary_month text;
begin
  if auth.uid() is distinct from new.user_id then
    raise exception 'Payroll account mismatch.';
  end if;

  if tg_op = 'UPDATE' then
    if old.status = 'paid' then
      if new.id is distinct from old.id
        or new.status is distinct from old.status
        or new.worker_id is distinct from old.worker_id
        or new.month_key is distinct from old.month_key
        or new.basic_salary is distinct from old.basic_salary
        or new.overtime_hours is distinct from old.overtime_hours
        or new.overtime_amount is distinct from old.overtime_amount
        or new.bonus is distinct from old.bonus
        or new.deduction is distinct from old.deduction then
        raise exception 'Paid payroll is locked. Do not overwrite a completed salary payment.';
      end if;
      new.advance_deduction := old.advance_deduction;
      new.net_salary := old.net_salary;
      new.paid_at := old.paid_at;
      return new;
    end if;
  end if;

  if new.status = 'paid' then
    select active_salary_month
      into v_active_salary_month
      from public."Workers"
     where id = new.worker_id
       and user_id = new.user_id
     for update;

    if not found then
      raise exception 'Worker not found in this account.';
    end if;

    if new.month_key is distinct from v_active_salary_month then
      raise exception 'This worker salary cycle is %. Select that month before marking payroll Paid.', v_active_salary_month;
    end if;

    -- Lock outstanding advances first so two concurrent payroll payments
    -- cannot deduct the same advance twice.
    perform 1
      from public."WorkerAdvances" a
     where a.user_id = new.user_id
       and a.worker_id = new.worker_id
       and a.deduct_from_month <= new.month_key
       and a.status = 'outstanding'
       and a.outstanding_amount > 0
       for update;

    select coalesce(sum(a.outstanding_amount), 0)
      into v_advance_total
      from public."WorkerAdvances" a
     where a.user_id = new.user_id
       and a.worker_id = new.worker_id
       and a.deduct_from_month <= new.month_key
       and a.status = 'outstanding'
       and a.outstanding_amount > 0;

    new.advance_deduction := v_advance_total;
    new.net_salary := round(
      new.basic_salary + new.overtime_amount + new.bonus
      - new.deduction - v_advance_total,
      2
    );

    if new.net_salary < 0 then
      raise exception 'Outstanding advances and deductions exceed this salary. Review the advance month or payroll amounts.';
    end if;

    new.paid_at := coalesce(new.paid_at, now());
  end if;

  return new;
end;
$$;

create or replace function public.recover_worker_advances_after_payroll()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_advance record;
  v_should_recover boolean := false;
begin
  if auth.uid() is distinct from new.user_id then
    raise exception 'Payroll account mismatch.';
  end if;

  if tg_op = 'INSERT' then
    v_should_recover := true;
  else
    v_should_recover := old.status is distinct from 'paid';
  end if;

  if new.status = 'paid' and v_should_recover then
      for v_advance in
      select a.id, a.worker_id, a.outstanding_amount
        from public."WorkerAdvances" a
       where a.user_id = new.user_id
         and a.worker_id = new.worker_id
         and a.deduct_from_month <= new.month_key
         and a.status = 'outstanding'
         and a.outstanding_amount > 0
       order by a.request_date, a.created_at
       for update
    loop
      insert into public."WorkerAdvanceRecoveries"
        (user_id, worker_id, advance_id, payroll_id, recovered_amount)
      values
        (new.user_id, new.worker_id, v_advance.id, new.id, v_advance.outstanding_amount)
      on conflict (user_id, advance_id) do nothing;

      update public."WorkerAdvances"
         set outstanding_amount = 0,
             status = 'recovered',
             recovered_at = now(),
             updated_at = now()
       where id = v_advance.id
         and user_id = new.user_id;
      end loop;

      -- Close this worker's active salary cycle only after payroll is Paid.
      -- Any advance entered before this payment remains assigned to this month.
      update public."Workers"
         set active_salary_month = to_char(
               (to_date(new.month_key || '-01', 'YYYY-MM-DD') + interval '1 month')::date,
               'YYYY-MM'
             ),
             updated_at = now()
       where id = new.worker_id
         and user_id = new.user_id
         and active_salary_month = new.month_key;

      if not found then
        raise exception 'Could not advance the worker salary cycle after payment.';
      end if;
  end if;

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'worker_payroll_prepare_payment'
      and tgrelid = 'public."WorkerPayroll"'::regclass
      and not tgisinternal
  ) then
    create trigger worker_payroll_prepare_payment
      before insert or update on public."WorkerPayroll"
      for each row execute function public.prepare_worker_payroll_payment();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'worker_payroll_recover_advances'
      and tgrelid = 'public."WorkerPayroll"'::regclass
      and not tgisinternal
  ) then
    create trigger worker_payroll_recover_advances
      after insert or update on public."WorkerPayroll"
      for each row execute function public.recover_worker_advances_after_payroll();
  end if;
end $$;

revoke all on function public.prepare_worker_payroll_payment() from PUBLIC, anon, authenticated;
revoke all on function public.recover_worker_advances_after_payroll() from PUBLIC, anon, authenticated;

-- 6) DNotify SMS audit trail. Only the authenticated account owner can read it.
-- Writes are performed by the authenticated Edge Function using the server key.
create table if not exists public."WorkerSmsLogs" (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  worker_id uuid not null,
  event_type text not null check (event_type in ('salary_paid', 'advance_paid', 'custom')),
  related_id uuid,
  idempotency_key text not null,
  mobile text not null,
  message text not null,
  sms_mode text not null default 'non-masking' check (sms_mode in ('non-masking', 'masking')),
  sender_id text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'failed')),
  provider_response jsonb,
  error_message text,
  attempts integer not null default 1 check (attempts >= 1),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  constraint worker_sms_logs_worker_fk
    foreign key (user_id, worker_id)
    references public."Workers"(user_id, id) on delete restrict,
  constraint worker_sms_logs_idempotency_unique unique (user_id, idempotency_key)
);

create index if not exists worker_sms_logs_history_idx
  on public."WorkerSmsLogs"(user_id, created_at desc);

alter table public."WorkerSmsLogs" enable row level security;
grant select on public."WorkerSmsLogs" to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='WorkerSmsLogs'
      and policyname='WorkerSmsLogs owner select'
  ) then
    create policy "WorkerSmsLogs owner select" on public."WorkerSmsLogs"
      for select to authenticated
      using ((select auth.uid()) = user_id);
  end if;
end $$;

commit;

-- Verification (read-only): expected tables and private bucket should now exist.
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'Workers', 'WorkerAttendance', 'WorkerPayroll',
    'WorkerDocuments', 'WorkerSalaryIncrements',
    'WorkerAdvances', 'WorkerAdvanceRecoveries', 'WorkerSmsLogs'
  )
order by table_name;

select id, name, public
from storage.buckets
where id = 'worker-documents';
