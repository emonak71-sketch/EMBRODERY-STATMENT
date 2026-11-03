-- Enable Supabase email OTP for NEW signups only.
-- Safe for existing accounts: this removes only the BEFORE INSERT trigger.
-- It does not update, delete, recreate, or unconfirm any row in auth.users.
-- Keep public.auto_confirm_user() in place; it is harmless while the trigger is absent.

begin;

drop trigger if exists auto_confirm_user_trigger on auth.users;

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
