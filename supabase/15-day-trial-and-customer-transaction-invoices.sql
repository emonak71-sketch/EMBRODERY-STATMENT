-- 15-day account trial and customer-transaction invoice separation.
-- Existing accounts receive a fresh 15-day launch trial; future accounts start
-- their trial at auth.users.created_at. No existing business or billing data is deleted.

begin;

create table if not exists public.account_trials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  trial_started_at timestamptz not null,
  trial_ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint account_trials_valid_period check (trial_ends_at > trial_started_at)
);

alter table public.account_trials enable row level security;
revoke all on table public.account_trials from anon, authenticated;
grant select on table public.account_trials to authenticated;
drop policy if exists "Users can read their own account trial" on public.account_trials;
create policy "Users can read their own account trial"
on public.account_trials
for select
to authenticated
using ((select auth.uid()) = user_id);

create or replace function private.start_trial_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_started_at timestamptz := coalesce(new.created_at, now());
begin
  insert into public.account_trials(user_id, trial_started_at, trial_ends_at)
  values (new.id, v_started_at, v_started_at + interval '15 days')
  on conflict (user_id) do nothing;
  return new;
end;
$function$;

revoke all on function private.start_trial_for_new_user() from public, anon, authenticated;

drop trigger if exists account_trial_on_auth_user_created on auth.users;
create trigger account_trial_on_auth_user_created
after insert on auth.users
for each row execute function private.start_trial_for_new_user();

-- Give accounts that already existed when the trial feature launches a full
-- 15 days from rollout rather than retroactively expiring them from signup date.
insert into public.account_trials(user_id, trial_started_at, trial_ends_at)
select u.id, now(), now() + interval '15 days'
from auth.users u
on conflict (user_id) do nothing;

create or replace function private.has_paid_access()
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select private.is_billing_admin()
    or exists (
      select 1
      from public.subscriptions s
      where s.user_id = auth.uid()
        and s.status in ('active', 'trialing')
        and s.current_period_end > now()
    )
    or exists (
      select 1
      from public.account_trials t
      where t.user_id = auth.uid()
        and t.trial_ends_at > now()
    );
$function$;

-- Subscription payments remain in verified billing transaction history.
-- They do not create customer/business invoices. Existing billing_invoices
-- records, if any, are retained for historical reference.
create or replace function public.review_nagad_personal_payment(
  p_submission_id uuid,
  p_approve boolean,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $function$
declare
  v_submission public.billing_payment_submissions%rowtype;
  v_plan public.subscription_plans%rowtype;
  v_subscription public.subscriptions%rowtype;
  v_subscription_id uuid;
  v_transaction_id uuid;
  v_period_start timestamptz;
  v_period_end timestamptz;
begin
  if not private.is_billing_admin() then
    raise exception 'Not authorized to review subscription payments.';
  end if;

  select * into v_submission
  from public.billing_payment_submissions
  where id = p_submission_id
  for update;

  if not found then raise exception 'Payment submission not found.'; end if;
  if v_submission.status <> 'pending' then
    raise exception 'This payment submission has already been reviewed.';
  end if;

  if p_approve is not true then
    update public.billing_payment_submissions
    set status = 'rejected',
        reviewer_note = nullif(trim(coalesce(p_note, '')), ''),
        reviewed_by = auth.uid(),
        reviewed_at = now()
    where id = v_submission.id;
    return null;
  end if;

  select * into v_plan
  from public.subscription_plans
  where id = v_submission.plan_id and is_active = true;

  if not found or v_plan.price_bdt <> v_submission.amount then
    raise exception 'Plan price changed or plan is inactive. Do not approve this payment.';
  end if;

  select * into v_subscription
  from public.subscriptions
  where user_id = v_submission.user_id
    and status in ('trialing', 'active', 'past_due')
  order by current_period_end desc
  limit 1
  for update;

  if found then
    v_subscription_id := v_subscription.id;
    v_period_start := greatest(v_subscription.current_period_end, now());
    v_period_end := case
      when v_plan.billing_interval = 'month' then v_period_start + interval '1 month'
      else v_period_start + interval '1 year'
    end;

    update public.subscriptions
    set plan_id = v_plan.id,
        status = 'active',
        current_period_start = v_period_start,
        current_period_end = v_period_end,
        cancel_at_period_end = false,
        cancelled_at = null,
        updated_at = now()
    where id = v_subscription_id;
  else
    v_period_start := now();
    v_period_end := case
      when v_plan.billing_interval = 'month' then v_period_start + interval '1 month'
      else v_period_start + interval '1 year'
    end;

    insert into public.subscriptions(
      user_id, plan_id, status, provider, started_at,
      current_period_start, current_period_end
    )
    values (
      v_submission.user_id, v_plan.id, 'active', 'nagad_personal', now(),
      v_period_start, v_period_end
    )
    returning id into v_subscription_id;
  end if;

  insert into public.billing_transactions(
    user_id, subscription_id, plan_id, provider, provider_transaction_id,
    payment_method, amount, currency, status, description,
    period_start, period_end, gateway_response, paid_at
  )
  values (
    v_submission.user_id, v_subscription_id, v_plan.id, 'nagad_personal',
    v_submission.nagad_transaction_id, 'Nagad Personal - Send Money',
    v_submission.amount, 'BDT', 'paid',
    v_plan.name || ' subscription payment',
    v_period_start, v_period_end,
    jsonb_build_object(
      'verification', 'manually_verified_by_billing_admin',
      'submission_id', v_submission.id
    ),
    now()
  )
  returning id into v_transaction_id;

  update public.billing_payment_submissions
  set status = 'approved',
      reviewer_note = nullif(trim(coalesce(p_note, '')), ''),
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      billing_transaction_id = v_transaction_id
  where id = v_submission.id;

  return v_transaction_id;
end;
$function$;

commit;
