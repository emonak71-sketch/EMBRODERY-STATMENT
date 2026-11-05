-- Additive worker-wise attendance bonus configuration and payroll snapshot.
-- Existing workers and paid payrolls retain zero as the historical attendance bonus.
begin;
alter table public."Workers" add column if not exists attendance_bonus numeric(12,2) not null default 0;
alter table public."WorkerPayroll" add column if not exists attendance_bonus numeric(12,2) not null default 0;
do $$
begin
  if not exists (select 1 from pg_constraint where conrelid='public."Workers"'::regclass and conname='workers_attendance_bonus_nonnegative') then
    alter table public."Workers" add constraint workers_attendance_bonus_nonnegative check (attendance_bonus >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public."WorkerPayroll"'::regclass and conname='worker_payroll_attendance_bonus_nonnegative') then
    alter table public."WorkerPayroll" add constraint worker_payroll_attendance_bonus_nonnegative check (attendance_bonus >= 0);
  end if;
end $$;
create or replace function public.prepare_worker_payroll_payment()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_advance_total numeric(12,2) := 0;
  v_requested_advance numeric(12,2) := 0;
  v_active_salary_month text;
  v_attendance_applicable boolean := false;
  v_monthly_working_days integer := 0;
  v_attendance_bonus_rate numeric(12,2) := 0;
  v_present_equivalent numeric(12,2) := 0;
begin
  if auth.uid() is distinct from new.user_id then raise exception 'Payroll account mismatch.'; end if;
  if tg_op = 'UPDATE' and old.status = 'paid' then
    if new.id is distinct from old.id or new.status is distinct from old.status
      or new.worker_id is distinct from old.worker_id or new.month_key is distinct from old.month_key
      or new.basic_salary is distinct from old.basic_salary or new.overtime_hours is distinct from old.overtime_hours
      or new.overtime_amount is distinct from old.overtime_amount
      or new.attendance_bonus is distinct from old.attendance_bonus
      or new.bonus is distinct from old.bonus or new.deduction is distinct from old.deduction
      or new.advance_deduction is distinct from old.advance_deduction then
      raise exception 'Paid payroll is locked. Do not overwrite a completed salary payment.';
    end if;
    new.attendance_bonus := old.attendance_bonus;
    new.advance_deduction := old.advance_deduction;
    new.net_salary := old.net_salary;
    new.paid_at := old.paid_at;
    return new;
  end if;
  select active_salary_month, attendance_applicable, monthly_working_days, attendance_bonus
    into v_active_salary_month, v_attendance_applicable, v_monthly_working_days, v_attendance_bonus_rate
    from public."Workers" where id = new.worker_id and user_id = new.user_id for update;
  if not found then raise exception 'Worker not found in this account.'; end if;
  if v_attendance_applicable and v_monthly_working_days > 0 and v_attendance_bonus_rate > 0 then
    select coalesce(sum(case when a.status in ('present','late') then 1 when a.status='half_day' then 0.5 else 0 end),0)
      into v_present_equivalent from public."WorkerAttendance" a
     where a.user_id=new.user_id and a.worker_id=new.worker_id
       and a.attendance_date >= to_date(new.month_key || '-01','YYYY-MM-DD')
       and a.attendance_date < (to_date(new.month_key || '-01','YYYY-MM-DD') + interval '1 month');
    new.attendance_bonus := round(v_attendance_bonus_rate * least(v_present_equivalent / v_monthly_working_days,1),2);
  else new.attendance_bonus := 0;
  end if;
  if new.status = 'paid' then
    if new.month_key is distinct from v_active_salary_month then
      raise exception 'This worker salary cycle is %. Select that month before marking payroll Paid.',v_active_salary_month;
    end if;
    perform 1 from public."WorkerAdvances" a where a.user_id=new.user_id and a.worker_id=new.worker_id
      and a.deduct_from_month<=new.month_key and a.status='outstanding' and a.outstanding_amount>0
      order by a.request_date,a.created_at,a.id for update;
    select coalesce(sum(a.outstanding_amount),0) into v_advance_total from public."WorkerAdvances" a
      where a.user_id=new.user_id and a.worker_id=new.worker_id
      and a.deduct_from_month<=new.month_key and a.status='outstanding' and a.outstanding_amount>0;
    v_requested_advance := coalesce(new.advance_deduction,0);
    if v_requested_advance<0 or v_requested_advance>v_advance_total then
      raise exception 'Selected advance deduction (%) must be between 0 and the outstanding balance (%).',v_requested_advance,v_advance_total;
    end if;
    new.advance_deduction := v_requested_advance;
    new.net_salary := round(new.basic_salary+new.overtime_amount+new.attendance_bonus+new.bonus-new.deduction-v_requested_advance,2);
    if new.net_salary<0 then raise exception 'Advance and other deductions exceed this salary. Review the payroll amounts.'; end if;
    new.paid_at := coalesce(new.paid_at,now());
  end if;
  return new;
end;
$$;
revoke all on function public.prepare_worker_payroll_payment() from PUBLIC, anon, authenticated;
commit;