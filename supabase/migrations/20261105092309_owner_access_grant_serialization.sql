-- Serialize manual owner grants and validate the optional payment note.
begin;

create index if not exists admin_access_grants_granted_by_idx
  on private.admin_access_grants(granted_by, created_at desc);

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
  if length(coalesce(p_note, '')) > 160 then
    raise exception using errcode = '22023', message = 'Payment note must be 160 characters or fewer.';
  end if;

  -- Lock the account row so two simultaneous grants cannot overlap.
  select u.id, u.email::text, u.email_confirmed_at
    into v_user_id, v_customer_email, v_email_confirmed_at
  from auth.users u
  where lower(u.email) = v_email
    and not exists (select 1 from public.billing_admins a where a.user_id = u.id)
  limit 1
  for update;

  if v_user_id is null then
    raise exception using errcode = 'P0002', message = 'Customer account not found. Ask the customer to register with this email first.';
  end if;
  if v_email_confirmed_at is null then
    raise exception using errcode = '22023', message = 'Customer email is not verified yet. Ask the customer to complete email verification first.';
  end if;

  select t.trial_ends_at into v_trial_end
  from public.account_trials t where t.user_id = v_user_id;
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

  insert into private.admin_access_grants(
    user_id, granted_by, granted_days, starts_at, ends_at, note
  )
  values (
    v_user_id, auth.uid(), p_days, v_start, v_end,
    nullif(trim(coalesce(p_note, '')), '')
  )
  returning id into v_grant_id;

  return query select v_grant_id, v_user_id, v_customer_email, p_days, v_start, v_end;
end;
$function$;

notify pgrst, 'reload schema';
commit;
