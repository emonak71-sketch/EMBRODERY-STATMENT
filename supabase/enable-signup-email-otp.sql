-- Enable real Supabase email OTP verification for NEW signups.
-- Safe for existing accounts: this removes only the BEFORE INSERT trigger.
-- It does not update, delete, recreate, or unconfirm any row in auth.users.
--
-- Hosted Supabase Auth must also have "Confirm email" enabled and the email
-- OTP length configured to 8. See IN_PLACE_UPDATE.md for the Dashboard steps.
begin;

drop trigger if exists auto_confirm_user_trigger on auth.users;

-- The trigger function is retained for rollback compatibility, but it must not
-- be directly callable by anon/authenticated users. It uses only pg_catalog.
alter function public.auto_confirm_user() set search_path = pg_catalog;
revoke all on function public.auto_confirm_user() from public, anon, authenticated;

commit;

-- Read-only verification: expected result is zero rows.
select t.tgname
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'auth'
  and c.relname = 'users'
  and t.tgname = 'auto_confirm_user_trigger'
  and not t.tgisinternal;
