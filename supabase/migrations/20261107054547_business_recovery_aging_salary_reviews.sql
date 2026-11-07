-- Additive recovery and annual-review features; existing balances and payroll stay unchanged.
create table public."DeletedBusinessRecords" (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 table_name text not null check(table_name in ('Parties','Transactions','Expenses','Sales')),
 record_id uuid not null, record_data jsonb not null, dependent_data jsonb not null default '[]',
 deleted_at timestamptz not null default now(), recover_until timestamptz not null default (now()+interval '30 days'),
 restored_at timestamptz
);
alter table public."DeletedBusinessRecords" enable row level security;
create policy recovery_owner_read on public."DeletedBusinessRecords" for select to authenticated using(user_id=(select auth.uid()));
revoke all on public."DeletedBusinessRecords" from public,anon,authenticated;
grant select on public."DeletedBusinessRecords" to authenticated;
create index recovery_owner_date on public."DeletedBusinessRecords"(user_id,deleted_at desc);

create function private.capture_deleted_business_record() returns trigger language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare children jsonb:='[]';
begin
 -- A party archive already contains its cascading transaction rows.
 if tg_table_name='Transactions' and pg_trigger_depth()>1 then return old; end if;
 if auth.uid() is distinct from old.user_id then raise exception 'Recovery archive requires the account owner.'; end if;
 if tg_table_name='Parties' then
   select coalesce(jsonb_agg(to_jsonb(t)),'[]') into children from public."Transactions" t where party_id=old.id and user_id=old.user_id;
 end if;
 insert into public."DeletedBusinessRecords"(user_id,table_name,record_id,record_data,dependent_data)
 values(old.user_id,tg_table_name,old.id,to_jsonb(old),children);
 return old;
end $$;
revoke all on function private.capture_deleted_business_record() from public,anon,authenticated;
create trigger recovery_parties before delete on public."Parties" for each row execute function private.capture_deleted_business_record();
create trigger recovery_transactions before delete on public."Transactions" for each row execute function private.capture_deleted_business_record();
create trigger recovery_expenses before delete on public."Expenses" for each row execute function private.capture_deleted_business_record();
create trigger recovery_sales before delete on public."Sales" for each row execute function private.capture_deleted_business_record();

create function private.restore_business_record(p_id uuid) returns void language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare r public."DeletedBusinessRecords"; child jsonb; parent_owner uuid;
begin
 if auth.uid() is null or not private.has_paid_access() then raise exception 'Active account access required.'; end if;
 select * into r from public."DeletedBusinessRecords" where id=p_id and user_id=auth.uid() for update;
 if not found or r.restored_at is not null then raise exception 'Deleted record not available.'; end if;
 if r.recover_until<=now() then raise exception 'The 30-day recovery period has expired.'; end if;
 if r.record_data->>'user_id' is distinct from auth.uid()::text then raise exception 'Account mismatch.'; end if;
 if r.table_name='Parties' then
  insert into public."Parties" select * from jsonb_populate_record(null::public."Parties",r.record_data||'{"is_deleted":false}');
  for child in select value from jsonb_array_elements(r.dependent_data) loop
   if child->>'user_id' is distinct from auth.uid()::text or child->>'party_id' is distinct from r.record_id::text then raise exception 'Invalid dependent record.'; end if;
   insert into public."Transactions" select * from jsonb_populate_record(null::public."Transactions",child);
  end loop;
 elsif r.table_name='Transactions' then
  select user_id into parent_owner from public."Parties" where id=(r.record_data->>'party_id')::uuid;
  if parent_owner is distinct from auth.uid() then raise exception 'Restore the customer first.'; end if;
  update public."Parties" set is_deleted=false where id=(r.record_data->>'party_id')::uuid and user_id=auth.uid();
  insert into public."Transactions" select * from jsonb_populate_record(null::public."Transactions",r.record_data);
 elsif r.table_name='Expenses' then
  insert into public."Expenses" select * from jsonb_populate_record(null::public."Expenses",r.record_data);
 elsif r.table_name='Sales' then
  insert into public."Sales" select * from jsonb_populate_record(null::public."Sales",r.record_data);
 else raise exception 'Unsupported recovery type.';
 end if;
 update public."DeletedBusinessRecords" set restored_at=now() where id=r.id;
end $$;
revoke all on function private.restore_business_record(uuid) from public,anon;
grant execute on function private.restore_business_record(uuid) to authenticated;
create function public.restore_business_record(p_id uuid) returns void language sql security invoker set search_path=pg_catalog as $$select private.restore_business_record(p_id)$$;
revoke all on function public.restore_business_record(uuid) from public,anon;
grant execute on function public.restore_business_record(uuid) to authenticated;

alter table public."Workers" add column salary_review_base_date date check(salary_review_base_date<=(now() at time zone 'Asia/Dhaka')::date);
create view public.worker_salary_reviews with(security_invoker=true) as
 select w.id as worker_id,w.user_id,w.full_name,w.worker_code,w.monthly_salary,w.joining_date,w.salary_review_base_date,
 b.base_date as last_increment_date,(b.base_date+interval '1 year')::date as next_review_date,
 (b.base_date+interval '1 year')::date-15 as reminder_date
 from public."Workers" w
 left join lateral(select max(effective_date) as last_date from public."WorkerSalaryIncrements" i where i.worker_id=w.id and i.user_id=w.user_id) i on true
 cross join lateral(select coalesce(greatest(i.last_date,w.salary_review_base_date),w.joining_date) as base_date) b
 where w.is_active;
revoke all on public.worker_salary_reviews from public,anon;
grant select on public.worker_salary_reviews to authenticated;
create unique index salary_review_notice_once on public.app_notifications(user_id,(payload->>'worker_id'),(payload->>'review_due_date')) where payload->>'kind'='salary_review';

create function private.enqueue_salary_review_notifications(p_user_id uuid default null) returns integer language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare n integer; today_dhaka date:=(now() at time zone 'Asia/Dhaka')::date;
begin
 if auth.uid() is not null and (p_user_id is null or p_user_id<>auth.uid()) then raise exception 'Account mismatch.'; end if;
 insert into public.app_notifications(user_id,notification_type,title,body,payload)
 select r.user_id,'system','Salary increment review: '||left(r.full_name,90),
 r.full_name||' — annual salary review is due on '||to_char(r.next_review_date,'DD Mon YYYY')||'. Reminder starts 15 days before the review. Salary will change only after you approve an increment.',
 jsonb_build_object('kind','salary_review','worker_id',r.worker_id,'review_due_date',r.next_review_date,'reminder_date',r.reminder_date)
 from public.worker_salary_reviews r where (p_user_id is null or r.user_id=p_user_id) and r.reminder_date<=today_dhaka
 on conflict do nothing;
 get diagnostics n=row_count; return n;
end $$;
revoke all on function private.enqueue_salary_review_notifications(uuid) from public,anon;
grant execute on function private.enqueue_salary_review_notifications(uuid) to authenticated;
create function public.sync_salary_review_notifications() returns integer language plpgsql security invoker set search_path=pg_catalog as $$
begin
 if auth.uid() is null then raise exception 'Sign in required.'; end if;
 return private.enqueue_salary_review_notifications(auth.uid());
end $$;
revoke all on function public.sync_salary_review_notifications() from public,anon;
grant execute on function public.sync_salary_review_notifications() to authenticated;
create extension if not exists pg_cron;
select cron.schedule('salary-review-daily-9am-dhaka','0 3 * * *','select private.enqueue_salary_review_notifications(null);');
