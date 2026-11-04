-- Additive security and performance hardening for the existing application.
-- No business, worker, payroll, statement or attendance rows are deleted or rewritten.

-- Restrict app data policies to authenticated owners and use an init-plan for auth.uid().
alter table public."Parties" enable row level security;
drop policy if exists "Users can manage their own parties" on public."Parties";
create policy "Users can manage their own parties"
  on public."Parties" for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter table public."Transactions" enable row level security;
drop policy if exists "Users can manage their own transactions" on public."Transactions";
create policy "Users can manage their own transactions"
  on public."Transactions" for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter table public."Products" enable row level security;
drop policy if exists "Users can manage their own products" on public."Products";
create policy "Users can manage their own products"
  on public."Products" for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter table public."Expenses" enable row level security;
drop policy if exists "Users can manage their own expenses" on public."Expenses";
create policy "Users can manage their own expenses"
  on public."Expenses" for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter table public."Sales" enable row level security;
drop policy if exists "Users can manage their own sales" on public."Sales";
create policy "Users can manage their own sales"
  on public."Sales" for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter table public."Workers" enable row level security;
drop policy if exists "Workers owner access" on public."Workers";
create policy "Workers owner access"
  on public."Workers" for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter table public."WorkerAttendance" enable row level security;
drop policy if exists "WorkerAttendance owner access" on public."WorkerAttendance";
create policy "WorkerAttendance owner access"
  on public."WorkerAttendance" for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter table public."WorkerPayroll" enable row level security;
drop policy if exists "WorkerPayroll owner access" on public."WorkerPayroll";
create policy "WorkerPayroll owner access"
  on public."WorkerPayroll" for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- The completion RPC is SECURITY INVOKER, so it needs UPDATE permission.
-- RLS still limits every update to the authenticated owner's own delivery row.
grant update on public."WorkerReminderDeliveries" to authenticated;

-- Reminder RPCs must not be callable by anonymous users and use no mutable search path.
alter function public.claim_worker_attendance_reminder(date, text) set search_path = '';
alter function public.complete_worker_attendance_reminder(date, text) set search_path = '';
revoke all on function public.claim_worker_attendance_reminder(date, text) from PUBLIC, anon;
revoke all on function public.complete_worker_attendance_reminder(date, text) from PUBLIC, anon;
grant execute on function public.claim_worker_attendance_reminder(date, text) to authenticated;
grant execute on function public.complete_worker_attendance_reminder(date, text) to authenticated;

-- Cover existing user/foreign-key relationships to avoid sequential scans as records grow.
create index if not exists idx_parties_user_id on public."Parties"(user_id);
create index if not exists idx_transactions_user_id on public."Transactions"(user_id);
create index if not exists idx_transactions_party_id on public."Transactions"(party_id);
create index if not exists idx_products_user_id on public."Products"(user_id);
create index if not exists idx_expenses_user_id on public."Expenses"(user_id);
create index if not exists idx_sales_user_id on public."Sales"(user_id);
