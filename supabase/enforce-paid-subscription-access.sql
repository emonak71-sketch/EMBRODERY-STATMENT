-- Subscription access enforcement: customers retain read access to their own records,
-- but write operations require an active subscription or registered billing-owner access.
begin;
create or replace function private.has_paid_access()
returns boolean language sql stable security definer set search_path=public,pg_temp
as $$
 select private.is_billing_admin()
    or exists(select 1 from public.subscriptions s where s.user_id=auth.uid() and s.status in ('active','trialing') and s.current_period_end>now());
$$;
grant usage on schema private to authenticated;
grant execute on function private.has_paid_access() to authenticated;
do $$
declare r record;
begin
 for r in
  select * from (values
   ('Parties','Users can manage their own parties','parties'),
   ('Products','Users can manage their own products','products'),
   ('Sales','Users can manage their own sales','sales'),
   ('Expenses','Users can manage their own expenses','expenses'),
   ('Transactions','Users can manage their own transactions','transactions'),
   ('Workers','Workers owner access','workers'),
   ('WorkerAttendance','WorkerAttendance owner access','worker_attendance'),
   ('WorkerPayroll','WorkerPayroll owner access','worker_payroll'),
   ('WorkerNightAttendance','WorkerNightAttendance owner access','worker_night_attendance'),
   ('WorkerReminderDeliveries','WorkerReminderDeliveries owner access','worker_reminder_deliveries')
  ) as x(tablename,old_policy,slug)
 loop
  execute format('drop policy if exists %I on public.%I',r.old_policy,r.tablename);
  execute format('create policy %I on public.%I for select to authenticated using (user_id=(select auth.uid()))',r.slug||'_owner_select',r.tablename);
  execute format('create policy %I on public.%I for insert to authenticated with check (user_id=(select auth.uid()) and (select private.has_paid_access()))',r.slug||'_paid_insert',r.tablename);
  execute format('create policy %I on public.%I for update to authenticated using (user_id=(select auth.uid()) and (select private.has_paid_access())) with check (user_id=(select auth.uid()) and (select private.has_paid_access()))',r.slug||'_paid_update',r.tablename);
  execute format('create policy %I on public.%I for delete to authenticated using (user_id=(select auth.uid()) and (select private.has_paid_access()))',r.slug||'_paid_delete',r.tablename);
 end loop;
end $$;
drop policy if exists "WorkerAdvances owner insert" on public."WorkerAdvances";
create policy "WorkerAdvances paid insert" on public."WorkerAdvances" for insert to authenticated with check (user_id=(select auth.uid()) and (select private.has_paid_access()));
drop policy if exists "WorkerDocuments owner insert" on public."WorkerDocuments";
create policy "WorkerDocuments paid insert" on public."WorkerDocuments" for insert to authenticated with check (user_id=(select auth.uid()) and (select private.has_paid_access()));
drop policy if exists "WorkerSalaryIncrements owner insert" on public."WorkerSalaryIncrements";
create policy "WorkerSalaryIncrements paid insert" on public."WorkerSalaryIncrements" for insert to authenticated with check (user_id=(select auth.uid()) and (select private.has_paid_access()));
commit;