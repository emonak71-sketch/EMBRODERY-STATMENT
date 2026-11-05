-- Add indexes for the payment submission foreign keys and cache auth.uid() once per RLS statement.
begin;
create index if not exists billing_payment_submissions_plan_id_idx on public.billing_payment_submissions(plan_id);
create index if not exists billing_payment_submissions_reviewed_by_idx on public.billing_payment_submissions(reviewed_by);
drop policy if exists "billing admins can read own admin registry row" on public.billing_admins;
create policy "billing admins can read own admin registry row" on public.billing_admins for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists "signed in users can read nagad payment settings" on public.billing_payment_settings;
create policy "signed in users can read nagad payment settings" on public.billing_payment_settings for select to authenticated using (is_active=true or exists(select 1 from public.billing_admins a where a.user_id=(select auth.uid())));
drop policy if exists "users and billing admins can read payment submissions" on public.billing_payment_submissions;
create policy "users and billing admins can read payment submissions" on public.billing_payment_submissions for select to authenticated using (user_id=(select auth.uid()) or exists(select 1 from public.billing_admins a where a.user_id=(select auth.uid())));
commit;