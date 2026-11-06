-- Auth email is authoritative; customer contact details remain owner-only.
create or replace function public.owner_list_customers(p_offset integer default 0)
returns table(customer_id uuid, customer_email text, business_name text,
 account_created_at timestamptz, email_verified boolean, customer_phone text)
language plpgsql stable security definer set search_path = ''
as $function$
begin
 if auth.uid() is null or not private.is_billing_admin() then
  raise exception using errcode='42501', message='Owner access required.';
 end if;
 if p_offset is null or p_offset < 0 then
  raise exception using errcode='22023', message='Invalid customer page.';
 end if;
 return query
 select u.id, u.email::text,
  coalesce(u.raw_user_meta_data->>'business_name','Customer Account'),
  u.created_at, u.email_confirmed_at is not null, c.phone_number
 from auth.users u
 left join private.owner_customer_contacts c on c.user_id=u.id
 where u.email is not null
  and not exists(select 1 from public.billing_admins a where a.user_id=u.id)
 order by u.created_at desc, u.id
 limit 51 offset p_offset;
end;
$function$;
revoke all on function public.owner_list_customers(integer) from public, anon, authenticated;
grant execute on function public.owner_list_customers(integer) to authenticated;
notify pgrst, 'reload schema';
