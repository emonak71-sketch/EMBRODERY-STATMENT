-- Read-only verification after worker-management-additive.sql has been run.
-- These queries do not change any data.

select 'auth.users' as object_name, count(*)::bigint as row_count from auth.users
union all select 'Parties', count(*) from public."Parties"
union all select 'Transactions', count(*) from public."Transactions"
union all select 'Products', count(*) from public."Products"
union all select 'Expenses', count(*) from public."Expenses"
union all select 'Sales', count(*) from public."Sales"
union all select 'Workers', count(*) from public."Workers"
union all select 'WorkerAttendance', count(*) from public."WorkerAttendance"
union all select 'WorkerPayroll', count(*) from public."WorkerPayroll"
union all select 'WorkerDocuments', count(*) from public."WorkerDocuments"
union all select 'WorkerSalaryIncrements', count(*) from public."WorkerSalaryIncrements"
union all select 'WorkerAdvances', count(*) from public."WorkerAdvances"
union all select 'WorkerAdvanceRecoveries', count(*) from public."WorkerAdvanceRecoveries"
order by object_name;

-- Existing legacy integrity checks. The ownerless Party row is intentionally preserved.
select
  (select count(*) from public."Parties" where user_id is null) as parties_without_owner,
  (select count(*) from public."Transactions" t
     left join public."Parties" p on p.id = t.party_id
    where p.id is null) as transactions_without_party,
  (select count(*) from public."Transactions" t
     join public."Parties" p on p.id = t.party_id
    where p.user_id is null) as transactions_linked_to_ownerless_party,
  (select count(*) from public."Transactions" t
     join public."Parties" p on p.id = t.party_id
    where p.user_id is distinct from t.user_id) as cross_account_party_mismatches;

-- Private worker file bucket must be private.
select id, name, public, file_size_limit
from storage.buckets
where id = 'worker-documents';

-- RLS must be enabled on every new worker table.
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'WorkerDocuments', 'WorkerSalaryIncrements',
    'WorkerAdvances', 'WorkerAdvanceRecoveries'
  )
order by c.relname;

-- OTP confirmation: the legacy auto-confirm trigger must no longer exist.
select t.tgname
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'auth'
  and c.relname = 'users'
  and t.tgname = 'auto_confirm_user_trigger'
  and not t.tgisinternal;
