-- Owner-only customer mobile-number mapping. Gmail remains the login identifier.
begin;
create table if not exists private.owner_customer_contacts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  phone_number text not null unique,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint owner_customer_contacts_bd_phone_check check (phone_number ~ '^01[3-9][0-9]{8}$')
);
alter table private.owner_customer_contacts enable row level security;
revoke all on table private.owner_customer_contacts from public, anon, authenticated;
comment on table private.owner_customer_contacts is 'Private owner-only mapping from a customer auth user to a unique Bangladesh mobile number. Customers sign in with Gmail.';
create or replace function public.owner_save_customer_phone(p_email text,p_phone text)
returns table(customer_id uuid,customer_email text,customer_phone text)
language plpgsql security definer set search_path=''
as $function$
declare
 v_email text:=lower(trim(coalesce(p_email,'')));
 v_phone text:=regexp_replace(coalesce(p_phone,''),'[^0-9]','','g');
 v_user_id uuid; v_customer_email text; v_email_verified boolean;
begin
 if auth.uid() is null or not private.is_billing_admin() then
  raise exception using errcode='42501',message='Owner access required.';
 end if;
 if v_email='' or length(v_email)>254 or position('@' in v_email)<2 then
  raise exception using errcode='22023',message='Enter the customer Gmail address used for registration.';
 end if;
 if left(v_phone,5)='00880' then v_phone:='0'||substr(v_phone,6);
 elsif left(v_phone,3)='880' then v_phone:='0'||substr(v_phone,4); end if;
 if v_phone !~ '^01[3-9][0-9]{8}$' then
  raise exception using errcode='22023',message='Enter a valid Bangladesh mobile number, such as 017XXXXXXXX.';
 end if;
 select u.id,u.email::text,(u.email_confirmed_at is not null)
 into v_user_id,v_customer_email,v_email_verified
 from auth.users u
 where lower(u.email)=v_email
 and not exists(select 1 from public.billing_admins a where a.user_id=u.id)
 limit 1 for update;
 if v_user_id is null then
  raise exception using errcode='P0002',message='Customer account not found. The customer must register with this Gmail first.';
 end if;
 if not coalesce(v_email_verified,false) then
  raise exception using errcode='22023',message='Customer Gmail is not verified yet.';
 end if;
 begin
  insert into private.owner_customer_contacts(user_id,phone_number,updated_by)
  values(v_user_id,v_phone,auth.uid())
  on conflict(user_id) do update set phone_number=excluded.phone_number,updated_by=excluded.updated_by,updated_at=now();
 exception when unique_violation then
  raise exception using errcode='23505',message='This mobile number is already linked to another customer account.';
 end;
 return query select v_user_id,v_customer_email,v_phone;
end;
$function$;
create or replace function public.owner_search_customer(p_identifier text)
returns table(
 customer_id uuid,customer_email text,business_name text,account_created_at timestamptz,
 email_verified boolean,customer_phone text,trial_ends_at timestamptz,
 subscription_access_until timestamptz,manual_access_starts_at timestamptz,
 manual_access_until timestamptz,access_until timestamptz,access_source text
)
language plpgsql stable security definer set search_path=''
as $function$
declare
 v_identifier text:=trim(coalesce(p_identifier,''));
 v_email text; v_phone text;
begin
 if auth.uid() is null or not private.is_billing_admin() then
  raise exception using errcode='42501',message='Owner access required.';
 end if;
 if v_identifier='' or length(v_identifier)>254 then
  raise exception using errcode='22023',message='Enter a customer Gmail or mobile number.';
 end if;
 if position('@' in v_identifier)>0 then
  v_email:=lower(v_identifier);
  if position('@' in v_email)<2 then
   raise exception using errcode='22023',message='Enter a valid customer Gmail address.';
  end if;
 else
  v_phone:=regexp_replace(v_identifier,'[^0-9]','','g');
  if left(v_phone,5)='00880' then v_phone:='0'||substr(v_phone,6);
  elsif left(v_phone,3)='880' then v_phone:='0'||substr(v_phone,4); end if;
  if v_phone !~ '^01[3-9][0-9]{8}$' then
   raise exception using errcode='22023',message='Enter a valid Bangladesh mobile number, such as 017XXXXXXXX.';
  end if;
 end if;
 return query
 select u.id,u.email::text,coalesce(u.raw_user_meta_data->>'business_name','EMBROIDERY STATEMENT'),
 u.created_at,(u.email_confirmed_at is not null),c.phone_number,t.trial_ends_at,s.subscription_until,
 g.manual_starts_at,g.manual_until,
 case
  when g.manual_starts_at<=now() and g.manual_until>now()
   then greatest(g.manual_until,coalesce(s.subscription_until,'-infinity'::timestamptz),
    coalesce(case when t.trial_ends_at>now() then t.trial_ends_at end,'-infinity'::timestamptz))
  when s.subscription_until>now()
   then greatest(s.subscription_until,coalesce(case when t.trial_ends_at>now() then t.trial_ends_at end,'-infinity'::timestamptz))
  when t.trial_ends_at>now() then t.trial_ends_at else null end,
 case when g.manual_starts_at<=now() and g.manual_until>now() then 'owner_grant'
  when s.subscription_until>now() then 'subscription' when t.trial_ends_at>now() then 'free_trial' else 'expired' end
 from auth.users u
 left join private.owner_customer_contacts c on c.user_id=u.id
 left join public.account_trials t on t.user_id=u.id
 left join lateral(
  select max(sub.current_period_end) subscription_until from public.subscriptions sub
  where sub.user_id=u.id and sub.status in('active','trialing') and sub.current_period_end>now()
 ) s on true
 left join lateral(
  select min(gr.starts_at) manual_starts_at,max(gr.ends_at) manual_until
  from private.admin_access_grants gr where gr.user_id=u.id and gr.revoked_at is null and gr.ends_at>now()
 ) g on true
 where not exists(select 1 from public.billing_admins a where a.user_id=u.id)
 and ((v_email is not null and lower(u.email)=v_email) or (v_phone is not null and c.phone_number=v_phone))
 limit 1;
end;
$function$;
revoke all on function public.owner_save_customer_phone(text,text) from public,anon,authenticated;
revoke all on function public.owner_search_customer(text) from public,anon,authenticated;
grant execute on function public.owner_save_customer_phone(text,text) to authenticated;
grant execute on function public.owner_search_customer(text) to authenticated;
notify pgrst,'reload schema';
commit;
