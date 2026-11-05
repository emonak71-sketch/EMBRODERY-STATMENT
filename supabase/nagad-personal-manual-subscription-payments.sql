-- Manual Nagad Personal Send Money collection and admin-verified subscription activation.
begin;
create table if not exists public.billing_admins (
  user_id uuid primary key references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
insert into public.billing_admins(user_id) values ('54acecb8-fa12-4100-b327-ac0231580c6f'::uuid) on conflict(user_id) do nothing;
create table if not exists public.billing_payment_settings (
  id smallint primary key default 1 check (id=1),
  provider text not null default 'nagad' check (provider='nagad'),
  account_type text not null default 'personal' check (account_type='personal'),
  receiver_number text,
  instructions text not null default 'Send Money to the Nagad personal number, then submit your sender number and Nagad transaction ID. Subscription activates only after verification.',
  is_active boolean not null default false,
  updated_at timestamptz not null default now(),
  check (receiver_number is null or receiver_number ~ '^01[3-9][0-9]{8}$')
);
insert into public.billing_payment_settings(id,provider,account_type,receiver_number,is_active) values(1,'nagad','personal',null,false) on conflict(id) do nothing;
create table if not exists public.billing_payment_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  plan_id text not null references public.subscription_plans(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  receiver_number text not null,
  sender_number text not null check (sender_number ~ '^01[3-9][0-9]{8}$'),
  nagad_transaction_id text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewer_note text,
  reviewed_by uuid references auth.users(id) on delete restrict,
  reviewed_at timestamptz,
  billing_transaction_id uuid unique references public.billing_transactions(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (length(nagad_transaction_id) between 6 and 32)
);
create unique index if not exists billing_payment_submissions_txid_uidx on public.billing_payment_submissions(lower(nagad_transaction_id));
create unique index if not exists billing_payment_submissions_one_pending_plan_uidx on public.billing_payment_submissions(user_id,plan_id) where status='pending';
create index if not exists billing_payment_submissions_user_history_idx on public.billing_payment_submissions(user_id,created_at desc);
create index if not exists billing_payment_submissions_pending_idx on public.billing_payment_submissions(created_at) where status='pending';
create or replace function public.is_billing_admin()
returns boolean language sql stable security definer set search_path=public,pg_temp
as $$ select exists(select 1 from public.billing_admins a where a.user_id=auth.uid()); $$;
revoke all on function public.is_billing_admin() from public,anon;
grant execute on function public.is_billing_admin() to authenticated;
alter table public.billing_admins enable row level security;
alter table public.billing_payment_settings enable row level security;
alter table public.billing_payment_submissions enable row level security;
drop policy if exists "billing admins can read admin registry" on public.billing_admins;
create policy "billing admins can read admin registry" on public.billing_admins for select to authenticated using (public.is_billing_admin());
drop policy if exists "signed in users can read nagad payment settings" on public.billing_payment_settings;
create policy "signed in users can read nagad payment settings" on public.billing_payment_settings for select to authenticated using (is_active=true or public.is_billing_admin());
drop policy if exists "users and billing admins can read payment submissions" on public.billing_payment_submissions;
create policy "users and billing admins can read payment submissions" on public.billing_payment_submissions for select to authenticated using (user_id=auth.uid() or public.is_billing_admin());
revoke all on public.billing_admins,public.billing_payment_settings,public.billing_payment_submissions from anon,authenticated;
grant select on public.billing_admins,public.billing_payment_settings,public.billing_payment_submissions to authenticated;
create or replace function public.set_nagad_personal_receiver(p_number text)
returns text language plpgsql security definer set search_path=public,pg_temp
as $$
declare v_number text;
begin
 if not public.is_billing_admin() then raise exception 'Not authorized to change the payment receiver.'; end if;
 v_number:=regexp_replace(coalesce(p_number,''),'[^0-9]','','g');
 if left(v_number,3)='880' then v_number:='0'||substr(v_number,4); end if;
 if v_number !~ '^01[3-9][0-9]{8}$' then raise exception 'Enter a valid 11-digit Bangladesh Nagad mobile number.'; end if;
 update public.billing_payment_settings set receiver_number=v_number,is_active=true,updated_at=now() where id=1 and provider='nagad' and account_type='personal';
 if not found then raise exception 'Nagad payment settings are not initialized.'; end if;
 return v_number;
end; $$;
revoke all on function public.set_nagad_personal_receiver(text) from public,anon;
grant execute on function public.set_nagad_personal_receiver(text) to authenticated;
create or replace function public.submit_nagad_personal_payment(p_plan_id text,p_sender_number text,p_transaction_id text)
returns uuid language plpgsql security definer set search_path=public,pg_temp
as $$
declare v_user uuid:=auth.uid(); v_plan public.subscription_plans%rowtype; v_setting public.billing_payment_settings%rowtype; v_sender text; v_txid text; v_submission uuid;
begin
 if v_user is null then raise exception 'Please sign in before submitting a payment.'; end if;
 select * into v_plan from public.subscription_plans where id=p_plan_id and is_active=true;
 if not found then raise exception 'This subscription plan is not available.'; end if;
 select * into v_setting from public.billing_payment_settings where id=1 and is_active=true;
 if not found or v_setting.receiver_number is null then raise exception 'The Nagad personal receiver number has not been configured yet.'; end if;
 v_sender:=regexp_replace(coalesce(p_sender_number,''),'[^0-9]','','g');
 if left(v_sender,3)='880' then v_sender:='0'||substr(v_sender,4); end if;
 if v_sender !~ '^01[3-9][0-9]{8}$' then raise exception 'Enter a valid 11-digit Nagad sender number.'; end if;
 v_txid:=upper(regexp_replace(coalesce(p_transaction_id,''),'\s','','g'));
 if length(v_txid)<6 or length(v_txid)>32 or v_txid !~ '^[A-Z0-9]+$' then raise exception 'Enter the valid Nagad transaction ID from your receipt.'; end if;
 insert into public.billing_payment_submissions(user_id,plan_id,amount,receiver_number,sender_number,nagad_transaction_id)
 values(v_user,v_plan.id,v_plan.price_bdt,v_setting.receiver_number,v_sender,v_txid) returning id into v_submission;
 return v_submission;
end; $$;
revoke all on function public.submit_nagad_personal_payment(text,text,text) from public,anon;
grant execute on function public.submit_nagad_personal_payment(text,text,text) to authenticated;
create or replace function public.review_nagad_personal_payment(p_submission_id uuid,p_approve boolean,p_note text default null)
returns uuid language plpgsql security definer set search_path=public,auth,pg_temp
as $$
declare v_submission public.billing_payment_submissions%rowtype; v_plan public.subscription_plans%rowtype; v_subscription public.subscriptions%rowtype; v_subscription_id uuid; v_transaction_id uuid; v_period_start timestamptz; v_period_end timestamptz; v_email text; v_business_name text;
begin
 if not public.is_billing_admin() then raise exception 'Not authorized to review subscription payments.'; end if;
 select * into v_submission from public.billing_payment_submissions where id=p_submission_id for update;
 if not found then raise exception 'Payment submission not found.'; end if;
 if v_submission.status<>'pending' then raise exception 'This payment submission has already been reviewed.'; end if;
 if p_approve is not true then
  update public.billing_payment_submissions set status='rejected',reviewer_note=nullif(trim(coalesce(p_note,'')),''),reviewed_by=auth.uid(),reviewed_at=now() where id=v_submission.id;
  return null;
 end if;
 select * into v_plan from public.subscription_plans where id=v_submission.plan_id and is_active=true;
 if not found or v_plan.price_bdt<>v_submission.amount then raise exception 'Plan price changed or plan is inactive. Do not approve this payment.'; end if;
 select * into v_subscription from public.subscriptions where user_id=v_submission.user_id and status in ('trialing','active','past_due') order by current_period_end desc limit 1 for update;
 if found then
  v_subscription_id:=v_subscription.id;
  v_period_start:=greatest(v_subscription.current_period_end,now());
  v_period_end:=case when v_plan.billing_interval='month' then v_period_start+interval '1 month' else v_period_start+interval '1 year' end;
  update public.subscriptions set plan_id=v_plan.id,status='active',current_period_start=v_period_start,current_period_end=v_period_end,cancel_at_period_end=false,cancelled_at=null,updated_at=now() where id=v_subscription_id;
 else
  v_period_start:=now();
  v_period_end:=case when v_plan.billing_interval='month' then v_period_start+interval '1 month' else v_period_start+interval '1 year' end;
  insert into public.subscriptions(user_id,plan_id,status,provider,started_at,current_period_start,current_period_end)
  values(v_submission.user_id,v_plan.id,'active','nagad_personal',now(),v_period_start,v_period_end) returning id into v_subscription_id;
 end if;
 insert into public.billing_transactions(user_id,subscription_id,plan_id,provider,provider_transaction_id,payment_method,amount,currency,status,description,period_start,period_end,gateway_response,paid_at)
 values(v_submission.user_id,v_subscription_id,v_plan.id,'nagad_personal',v_submission.nagad_transaction_id,'Nagad Personal - Send Money',v_submission.amount,'BDT','paid',v_plan.name||' subscription payment',v_period_start,v_period_end,jsonb_build_object('verification','manually_verified_by_billing_admin','submission_id',v_submission.id),now())
 returning id into v_transaction_id;
 select email,coalesce(raw_user_meta_data->>'business_name','') into v_email,v_business_name from auth.users where id=v_submission.user_id;
 insert into public.billing_invoices(transaction_id,user_id,seller_snapshot,buyer_snapshot,line_items,subtotal,discount,tax,total,currency)
 values(v_transaction_id,v_submission.user_id,jsonb_build_object('name','Embroidery Statement'),jsonb_build_object('business_name',v_business_name,'email',coalesce(v_email,'')),jsonb_build_array(jsonb_build_object('description',v_plan.name||' subscription ('||case when v_plan.billing_interval='month' then '1 month' else '1 year' end||')','amount',v_submission.amount)),v_submission.amount,0,0,v_submission.amount,'BDT');
 update public.billing_payment_submissions set status='approved',reviewer_note=nullif(trim(coalesce(p_note,'')),''),reviewed_by=auth.uid(),reviewed_at=now(),billing_transaction_id=v_transaction_id where id=v_submission.id;
 return v_transaction_id;
end; $$;
revoke all on function public.review_nagad_personal_payment(uuid,boolean,text) from public,anon;
grant execute on function public.review_nagad_personal_payment(uuid,boolean,text) to authenticated;
insert into public.subscription_plans(id,name,billing_interval,duration_days,price_bdt,max_workers,description,features,is_active)
values
 ('monthly','Monthly Subscription','month',30,99,null,'Full access for one calendar month. Renew manually when you are ready.','[]'::jsonb,true),
 ('yearly','Yearly Subscription','year',365,999,null,'Full access for one calendar year. Renew manually when you are ready.','[]'::jsonb,true)
on conflict(id) do update set name=excluded.name,billing_interval=excluded.billing_interval,duration_days=excluded.duration_days,price_bdt=excluded.price_bdt,max_workers=excluded.max_workers,description=excluded.description,features=excluded.features,is_active=true,updated_at=now();
commit;