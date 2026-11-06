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
  -- Owner accounts are excluded from customer lookup. Retire only their obsolete
  -- contact reservation; never take a number from another customer.
  delete from private.owner_customer_contacts c
  using public.billing_admins a
  where c.user_id=a.user_id and c.phone_number=v_phone;
  insert into private.owner_customer_contacts(user_id,phone_number,updated_by)
  values(v_user_id,v_phone,auth.uid())
  on conflict(user_id) do update set phone_number=excluded.phone_number,updated_by=excluded.updated_by,updated_at=now();
 exception when unique_violation then
  raise exception using errcode='23505',message='This mobile number is already linked to another customer account.';
 end;
 return query select v_user_id,v_customer_email,v_phone;
end;
$function$;
revoke all on function public.owner_save_customer_phone(text,text) from public,anon,authenticated;
grant execute on function public.owner_save_customer_phone(text,text) to authenticated;
notify pgrst,'reload schema';
