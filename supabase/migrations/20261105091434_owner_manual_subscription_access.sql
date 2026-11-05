-- Owner-controlled manual subscription access.
-- Customers register and verify their email. The owner searches by exact email,
-- verifies payment outside the app (e.g. Nagad Personal), then grants days.
-- No payment gateway or service-role key is exposed to the browser.

begin;

create table if not exists private.admin_access_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  granted_by uuid not null references auth.users(id),
  granted_days integer not null check (granted_days between 1 and 3650),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  note text,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint admin_access_grants_valid_period check (ends_at > starts_at)
);

create index if not exists admin_access_grants_user_period_idx
  on private.admin_access_grants(user_id, starts_at, ends_at desc)
  where revoked_at is null;

alter table private.admin_access_grants enable row level security;
revoke all on table private.admin_access_grants from public, anon, authenticated;

create or replace function private.has_paid_access()
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select private.is_billing_admin()
    or exists (
      select 1 from public.subscriptions s
      where s.user_id = auth.uid()
        and s.status in ('active', 'trialing')
        and s.current_period_end > now()
    )
    or exists (
      select 1 from public.account_trials t
      where t.user_id = auth.uid()
        and t.trial_ends_at > now()
    )
    or exists (
      select 1 from private.admin_access_grants g
      where g.user_id = auth.uid()
        and g.revoked_at is null
        and g.starts_at <= now()
        and g.ends_at > now()
    );
$function$;

create or replace function public.get_my_access_status()
returns table (
  has_access boolean,
  access_source text,
  access_until timestamptz,
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  manual_access_starts_at timestamptz,
  manual_access_until timestamptz,
  subscription_access_until timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_is_admin boolean := false;
  v_trial_started timestamptz;
  v_trial_ends timestamptz;
  v_manual_starts timestamptz;
  v_manual_ends timestamptz;
  v_subscription_ends timestamptz;
  v_has_access boolean;
  v_access_source text;
  v_access_until timestamptz;
begin
  if v_uid is null then
    raise exception using errcode = '42501', message = 'Sign in to view access status.';
  end if;
  v_is_admin := private.is_billing_admin();
  select t.trial_started_at, t.trial_ends_at into v_trial_started, v_trial_ends
  from public.account_trials t where t.user_id = v_uid;
  select max(s.current_period_end) into v_subscription_ends
  from public.subscriptions s
  where s.user_id = v_uid and s.status in ('active', 'trialing') and s.current_period_end > now();
  select min(g.starts_at), max(g.ends_at) into v_manual_starts, v_manual_ends
  from private.admin_access_grants g
  where g.user_id = v_uid and g.revoked_at is null and g.ends_at > now();

  v_has_access := v_is_admin
    or coalesce(v_trial_ends > now(), false)
    or coalesce(v_subscription_ends > now(), false)
    or (coalesce(v_manual_starts <= now(), false) and coalesce(v_manual_ends > now(), false));

  v_access_source := case
    when v_is_admin then 'owner_admin'
    when v_manual_starts <= now() and v_manual_ends > now() then 'owner_grant'
    when v_subscription_ends > now() then 'subscription'
    when v_trial_ends > now() then 'free_trial'
    else 'expired'
  end;

  if v_is_admin then
    v_access_until := null;
  else
    v_access_until := greatest(
      coalesce(case when v_trial_ends > now() then v_trial_ends end, '-infinity'::timestamptz),
      coalesce(v_subscription_ends, '-infinity'::timestamptz),
      coalesce(case when v_manual_starts <= now() and v_manual_ends > now() then v_manual_ends end, '-infinity'::timestamptz)
    );
    if v_access_until = '-infinity'::timestamptz then v_access_until := null; end if;
  end if;

  return query select v_has_access, v_access_source, v_access_until,
    v_trial_started, v_trial_ends, v_manual_starts, v_manual_ends, v_subscription_ends;
end;
$function$;

create or replace function public.owner_search_customer_by_email(p_email text)
returns table (
  customer_id uuid,
  customer_email text,
  business_name text,
  account_created_at timestamptz,
  email_verified boolean,
  trial_ends_at timestamptz,
  subscription_access_until timestamptz,
  manual_access_starts_at timestamptz,
  manual_access_until timestamptz,
  access_until timestamptz,
  access_source text
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
begin
  if auth.uid() is null or not private.is_billing_admin() then
    raise exception using errcode = '42501', message = 'Owner access required.';
  end if;
  if v_email = '' or length(v_email) > 254 or position('@' in v_email) < 2 then
    raise exception using errcode = '22023', message = 'Enter a valid customer email address.';
  end if;

  return query
  select u.id, u.email::text,
    coalesce(u.raw_user_meta_data ->> 'business_name', 'EMBROIDERY STATEMENT'),
    u.created_at, (u.email_confirmed_at is not null), t.trial_ends_at,
    s.subscription_until, g.manual_starts_at, g.manual_until,
    case
      when g.manual_starts_at <= now() and g.manual_until > now()
        then greatest(g.manual_until, coalesce(s.subscription_until, '-infinity'::timestamptz), coalesce(case when t.trial_ends_at > now() then t.trial_ends_at end, '-infinity'::timestamptz))
      when s.subscription_until > now()
        then greatest(s.subscription_until, coalesce(case when t.trial_ends_at > now() then t.trial_ends_at end, '-infinity'::timestamptz))
      when t.trial_ends_at > now() then t.trial_ends_at
      else null
    end,
    case
      when g.manual_starts_at <= now() and g.manual_until > now() then 'owner_grant'
      when s.subscription_until > now() then 'subscription'
      when t.trial_ends_at > now() then 'free_trial'
      else 'expired'
    end
  from auth.users u
  left join public.account_trials t on t.user_id = u.id
  left join lateral (
    select max(s.current_period_end) as subscription_until
    from public.subscriptions s
    where s.user_id = u.id and s.status in ('active', 'trialing') and s.current_period_end > now()
  ) s on true
  left join lateral (
    select min(g.starts_at) as manual_starts_at, max(g.ends_at) as manual_until
    from private.admin_access_grants g
    where g.user_id = u.id and g.revoked_at is null and g.ends_at > now()
  ) g on true
  where lower(u.email) = v_email
    and not exists (select 1 from public.billing_admins a where a.user_id = u.id)
  limit 1;
end;
$function$;

create or replace function public.owner_grant_customer_access(
  p_email text, p_days integer, p_note text default null
)
returns table (
  grant_id uuid, customer_id uuid, customer_email text,
  granted_days integer, starts_at timestamptz, ends_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_user_id uuid;
  v_customer_email text;
  v_email_confirmed_at timestamptz;
  v_trial_end timestamptz;
  v_subscription_end timestamptz;
  v_existing_grant_end timestamptz;
  v_start timestamptz;
  v_end timestamptz;
  v_grant_id uuid;
begin
  if auth.uid() is null or not private.is_billing_admin() then
    raise exception using errcode = '42501', message = 'Owner access required.';
  end if;
  if v_email = '' or length(v_email) > 254 or position('@' in v_email) < 2 then
    raise exception using errcode = '22023', message = 'Enter a valid customer email address.';
  end if;
  if p_days is null or p_days < 1 or p_days > 3650 then
    raise exception using errcode = '22023', message = 'Access duration must be between 1 and 3650 days.';
  end if;

  select u.id, u.email::text, u.email_confirmed_at
    into v_user_id, v_customer_email, v_email_confirmed_at
  from auth.users u
  where lower(u.email) = v_email
    and not exists (select 1 from public.billing_admins a where a.user_id = u.id)
  limit 1;

  if v_user_id is null then
    raise exception using errcode = 'P0002', message = 'Customer account not found. Ask the customer to register with this email first.';
  end if;
  if v_email_confirmed_at is null then
    raise exception using errcode = '22023', message = 'Customer email is not verified yet. Ask the customer to complete email verification first.';
  end if;

  select t.trial_ends_at into v_trial_end from public.account_trials t where t.user_id = v_user_id;
  select max(s.current_period_end) into v_subscription_end
  from public.subscriptions s
  where s.user_id = v_user_id and s.status in ('active', 'trialing') and s.current_period_end > now();
  select max(g.ends_at) into v_existing_grant_end
  from private.admin_access_grants g
  where g.user_id = v_user_id and g.revoked_at is null and g.ends_at > now();

  v_start := greatest(
    now(),
    coalesce(case when v_trial_end > now() then v_trial_end end, now()),
    coalesce(v_subscription_end, now()),
    coalesce(v_existing_grant_end, now())
  );
  v_end := v_start + make_interval(days => p_days);

  insert into private.admin_access_grants(user_id, granted_by, granted_days, starts_at, ends_at, note)
  values (v_user_id, auth.uid(), p_days, v_start, v_end, nullif(trim(coalesce(p_note, '')), ''))
  returning id into v_grant_id;

  return query select v_grant_id, v_user_id, v_customer_email, p_days, v_start, v_end;
end;
$function$;

create or replace function public.owner_get_customer_access_history(p_user_id uuid)
returns table (
  grant_id uuid, granted_days integer, starts_at timestamptz, ends_at timestamptz,
  note text, revoked_at timestamptz, created_at timestamptz, granted_by_email text
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null or not private.is_billing_admin() then
    raise exception using errcode = '42501', message = 'Owner access required.';
  end if;
  if p_user_id is null then
    raise exception using errcode = '22023', message = 'Customer account is required.';
  end if;

  return query
  select g.id, g.granted_days, g.starts_at, g.ends_at, g.note, g.revoked_at, g.created_at, u.email::text
  from private.admin_access_grants g
  left join auth.users u on u.id = g.granted_by
  where g.user_id = p_user_id
  order by g.created_at desc
  limit 50;
end;
$function$;

revoke all on function public.get_my_access_status() from public, anon, authenticated;
revoke all on function public.owner_search_customer_by_email(text) from public, anon, authenticated;
revoke all on function public.owner_grant_customer_access(text, integer, text) from public, anon, authenticated;
revoke all on function public.owner_get_customer_access_history(uuid) from public, anon, authenticated;
grant execute on function public.get_my_access_status() to authenticated;
grant execute on function public.owner_search_customer_by_email(text) to authenticated;
grant execute on function public.owner_grant_customer_access(text, integer, text) to authenticated;
grant execute on function public.owner_get_customer_access_history(uuid) to authenticated;

comment on function public.owner_search_customer_by_email(text) is 'Owner-only customer lookup; function body verifies billing_admins.';
comment on function public.owner_grant_customer_access(text, integer, text) is 'Owner-only manual access grant; function body verifies billing_admins.';
comment on function public.owner_get_customer_access_history(uuid) is 'Owner-only manual access audit history; function body verifies billing_admins.';
comment on function public.get_my_access_status() is 'Returns only the calling account access status.';

notify pgrst, 'reload schema';
commit;
