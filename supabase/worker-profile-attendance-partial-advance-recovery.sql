-- Additive migration applied to the active Embroidery Statement Supabase project.
-- Worker attendance settings and owner-selected partial salary-advance recovery.

begin;

alter table public."Workers"
  add column if not exists attendance_applicable boolean not null default true,
  add column if not exists monthly_working_days integer not null default 26;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public."Workers"'::regclass
      and conname = 'workers_monthly_working_days_check'
  ) then
    alter table public."Workers"
      add constraint workers_monthly_working_days_check
      check (
        (attendance_applicable = true and monthly_working_days between 1 and 31)
        or
        (attendance_applicable = false and monthly_working_days = 0)
      );
  end if;
end $$;

alter table public."WorkerAdvanceRecoveries"
  drop constraint if exists worker_advance_recovery_once;

create unique index if not exists worker_advance_recovery_payroll_once_uidx
  on public."WorkerAdvanceRecoveries"(user_id, advance_id, payroll_id);

create or replace function public.prepare_worker_payroll_payment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_advance_total numeric(12,2) := 0;
  v_requested_advance numeric(12,2) := 0;
  v_active_salary_month text;
begin
  if auth.uid() is distinct from new.user_id then
    raise exception 'Payroll account mismatch.';
  end if;

  if tg_op = 'UPDATE' and old.status = 'paid' then
    if new.id is distinct from old.id
      or new.status is distinct from old.status
      or new.worker_id is distinct from old.worker_id
      or new.month_key is distinct from old.month_key
      or new.basic_salary is distinct from old.basic_salary
      or new.overtime_hours is distinct from old.overtime_hours
      or new.overtime_amount is distinct from old.overtime_amount
      or new.bonus is distinct from old.bonus
      or new.deduction is distinct from old.deduction
      or new.advance_deduction is distinct from old.advance_deduction then
      raise exception 'Paid payroll is locked. Do not overwrite a completed salary payment.';
    end if;
    new.advance_deduction := old.advance_deduction;
    new.net_salary := old.net_salary;
    new.paid_at := old.paid_at;
    return new;
  end if;

  if new.status = 'paid' then
    select active_salary_month
      into v_active_salary_month
      from public."Workers"
     where id = new.worker_id
       and user_id = new.user_id
     for update;

    if not found then raise exception 'Worker not found in this account.'; end if;
    if new.month_key is distinct from v_active_salary_month then
      raise exception 'This worker salary cycle is %. Select that month before marking payroll Paid.', v_active_salary_month;
    end if;

    perform 1
      from public."WorkerAdvances" a
     where a.user_id = new.user_id
       and a.worker_id = new.worker_id
       and a.deduct_from_month <= new.month_key
       and a.status = 'outstanding'
       and a.outstanding_amount > 0
     order by a.request_date, a.created_at, a.id
     for update;

    select coalesce(sum(a.outstanding_amount), 0)
      into v_advance_total
      from public."WorkerAdvances" a
     where a.user_id = new.user_id
       and a.worker_id = new.worker_id
       and a.deduct_from_month <= new.month_key
       and a.status = 'outstanding'
       and a.outstanding_amount > 0;

    v_requested_advance := coalesce(new.advance_deduction, 0);
    if v_requested_advance < 0 or v_requested_advance > v_advance_total then
      raise exception 'Selected advance deduction (%) must be between 0 and the outstanding balance (%).',
        v_requested_advance, v_advance_total;
    end if;

    new.advance_deduction := v_requested_advance;
    new.net_salary := round(
      new.basic_salary + new.overtime_amount + new.bonus
      - new.deduction - v_requested_advance, 2
    );
    if new.net_salary < 0 then
      raise exception 'Advance and other deductions exceed this salary. Review the payroll amounts.';
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
  v_remaining numeric(12,2) := 0;
  v_recover numeric(12,2) := 0;
  v_recovery_id uuid;
begin
  if auth.uid() is distinct from new.user_id then raise exception 'Payroll account mismatch.'; end if;
  if tg_op = 'INSERT' then
    v_should_recover := true;
  else
    v_should_recover := old.status is distinct from 'paid';
  end if;

  if new.status = 'paid' and v_should_recover then
    v_remaining := coalesce(new.advance_deduction, 0);

    for v_advance in
      select a.id, a.worker_id, a.outstanding_amount
        from public."WorkerAdvances" a
       where a.user_id = new.user_id
         and a.worker_id = new.worker_id
         and a.deduct_from_month <= new.month_key
         and a.status = 'outstanding'
         and a.outstanding_amount > 0
       order by a.request_date, a.created_at, a.id
       for update
    loop
      exit when v_remaining <= 0;
      v_recover := least(v_remaining, v_advance.outstanding_amount);
      v_recovery_id := null;

      insert into public."WorkerAdvanceRecoveries"
        (user_id, worker_id, advance_id, payroll_id, recovered_amount)
      values
        (new.user_id, new.worker_id, v_advance.id, new.id, v_recover)
      on conflict (user_id, advance_id, payroll_id) do nothing
      returning id into v_recovery_id;

      if v_recovery_id is not null then
        update public."WorkerAdvances"
           set outstanding_amount = round(outstanding_amount - v_recover, 2),
               status = case when outstanding_amount - v_recover <= 0 then 'recovered' else 'outstanding' end,
               recovered_at = case when outstanding_amount - v_recover <= 0 then now() else null end,
               updated_at = now()
         where id = v_advance.id and user_id = new.user_id;
        v_remaining := round(v_remaining - v_recover, 2);
      end if;
    end loop;

    if v_remaining > 0 then
      raise exception 'Could not allocate the selected advance recovery amount. Payroll was not completed.';
    end if;

    update public."Workers"
       set active_salary_month = to_char(
             (to_date(new.month_key || '-01', 'YYYY-MM-DD') + interval '1 month')::date,
             'YYYY-MM'
           ),
           updated_at = now()
     where id = new.worker_id
       and user_id = new.user_id
       and active_salary_month = new.month_key;

    if not found then raise exception 'Could not advance the worker salary cycle after payment.'; end if;
  end if;
  return new;
end;
$$;

revoke all on function public.prepare_worker_payroll_payment() from PUBLIC, anon, authenticated;
revoke all on function public.recover_worker_advances_after_payroll() from PUBLIC, anon, authenticated;

commit;