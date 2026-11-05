-- Record the actual payment date, amount, method and transaction reference
-- alongside every owner-granted customer subscription.
begin;

alter table private.admin_access_grants
  add column if not exists payment_date date,
  add column if not exists payment_amount_bdt numeric(12,2),
  add column if not exists payment_method text,
  add column if not exists payment_reference text;

update private.admin_access_grants
set payment_date = coalesce(payment_date, (created_at at time zone 'Asia/Dhaka')::date),
    payment_method = coalesce(payment_method, 'Nagad Personal'),
    payment_reference = coalesce(payment_reference, note)
where payment_date is null or payment_method is null;

alter table private.admin_access_grants
  alter column payment_date set default (now() at time zone 'Asia/Dhaka')::date,
  alter column payment_method set default 'Nagad Personal';

do $constraints$
begin
  if not exists (select 1 from pg_constraint where conname='admin_access_grants_payment_amount_check') then
    alter table private.admin_access_grants add constraint admin_access_grants_payment_amount_check
      check (payment_amount_bdt is null or payment_amount_bdt >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname='admin_access_grants_payment_method_check') then
    alter table private.admin_access_grants add constraint admin_access_grants_payment_method_check
      check (payment_method in ('Nagad Personal','Cash','Bank Transfer','Other'));
  end if;
end;
$constraints$;

create or replace function public.owner_grant_customer_access(
  p_email text,
  p_days integer,
  p_note text,
  p_payment_date date,
  p_payment_amount_bdt numeric,
  p_payment_method text,
  p_payment_reference text
)
returns table (
  grant_id uuid,
  customer_id uuid,
  customer_email text,
  granted_days integer,
  starts_at timestamptz,
  ends_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_grant record;
  v_method text := trim(coalesce(p_payment_method,''));
  v_reference text := nullif(trim(coalesce(p_payment_reference,'')),'');
begin
  if auth.uid() is null or not private.is_billing_admin() then
    raise exception using errcode='42501', message='Owner access required.';
  end if;
  if p_payment_date is null or p_payment_date > (now() at time zone 'Asia/Dhaka')::date then
    raise exception using errcode='22023', message='Payment date must be today or earlier.';
  end if;
  if p_payment_amount_bdt is null or p_payment_amount_bdt < 0 or p_payment_amount_bdt > 99999999 then
    raise exception using errcode='22023', message='Enter a valid payment amount in BDT.';
  end if;
  if v_method not in ('Nagad Personal','Cash','Bank Transfer','Other') then
    raise exception using errcode='22023', message='Select a supported payment method.';
  end if;
  if length(coalesce(p_payment_reference,'')) > 160 then
    raise exception using errcode='22023', message='Payment reference must be 160 characters or fewer.';
  end if;

  select * into v_grant
  from public.owner_grant_customer_access(p_email,p_days,p_note);

  update private.admin_access_grants
  set payment_date=p_payment_date,
      payment_amount_bdt=p_payment_amount_bdt,
      payment_method=v_method,
      payment_reference=v_reference
  where id=v_grant.grant_id;

  return query select v_grant.grant_id,v_grant.customer_id,v_grant.customer_email,
    v_grant.granted_days,v_grant.starts_at,v_grant.ends_at;
end;
$function$;

drop function if exists public.owner_get_customer_access_history(uuid);
create function public.owner_get_customer_access_history(p_user_id uuid)
returns table (
  grant_id uuid,
  granted_days integer,
  payment_date date,
  payment_amount_bdt numeric,
  payment_method text,
  payment_reference text,
  starts_at timestamptz,
  ends_at timestamptz,
  note text,
  revoked_at timestamptz,
  created_at timestamptz,
  granted_by_email text
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null or not private.is_billing_admin() then
    raise exception using errcode='42501', message='Owner access required.';
  end if;
  if p_user_id is null then
    raise exception using errcode='22023', message='Customer account is required.';
  end if;

  return query
  select g.id,g.granted_days,g.payment_date,g.payment_amount_bdt,g.payment_method,
    g.payment_reference,g.starts_at,g.ends_at,g.note,g.revoked_at,g.created_at,u.email::text
  from private.admin_access_grants g
  left join auth.users u on u.id=g.granted_by
  where g.user_id=p_user_id
  order by g.created_at desc
  limit 50;
end;
$function$;

revoke all on function public.owner_grant_customer_access(text,integer,text,date,numeric,text,text) from public,anon,authenticated;
revoke all on function public.owner_get_customer_access_history(uuid) from public,anon,authenticated;
grant execute on function public.owner_grant_customer_access(text,integer,text,date,numeric,text,text) to authenticated;
grant execute on function public.owner_get_customer_access_history(uuid) to authenticated;

comment on column private.admin_access_grants.payment_date is 'Payment date recorded by the Owner in Bangladesh local date.';
comment on column private.admin_access_grants.payment_amount_bdt is 'Payment amount in Bangladeshi Taka, entered by the Owner after verification.';
comment on column private.admin_access_grants.payment_reference is 'Optional external payment transaction reference such as a Nagad TxnID.';

notify pgrst, 'reload schema';
commit;
