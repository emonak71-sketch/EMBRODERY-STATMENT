-- Enable account-scoped live synchronization for the existing application.
-- Supabase Realtime still applies each subscriber's SELECT privilege and RLS policy.
-- Internal reminder claims and password-recovery rate limits are intentionally excluded.
do $$
declare
  v_table text;
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    execute 'create publication supabase_realtime';
  end if;

  foreach v_table in array array[
    'Parties',
    'Transactions',
    'Products',
    'Expenses',
    'Sales',
    'Workers',
    'WorkerAttendance',
    'WorkerPayroll',
    'WorkerDocuments',
    'WorkerSalaryIncrements',
    'WorkerAdvances',
    'WorkerAdvanceRecoveries',
    'WorkerSmsLogs',
    'WorkerNightAttendance'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = v_table
    ) then
      execute format('alter publication supabase_realtime add table public.%I', v_table);
    end if;
  end loop;
end
$$;
