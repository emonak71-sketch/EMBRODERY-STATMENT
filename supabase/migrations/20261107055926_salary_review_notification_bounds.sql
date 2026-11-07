-- Bound notification content so one long worker name cannot block the daily batch.
create or replace function private.enqueue_salary_review_notifications(p_user_id uuid default null) returns integer language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare n integer; today_dhaka date:=(now() at time zone 'Asia/Dhaka')::date;
begin
 if auth.uid() is not null and (p_user_id is null or p_user_id<>auth.uid()) then raise exception 'Account mismatch.'; end if;
 insert into public.app_notifications(user_id,notification_type,title,body,payload)
 select r.user_id,'system','Salary increment review: '||left(r.full_name,90),
 left(r.full_name,150)||' — annual salary review is due on '||to_char(r.next_review_date,'DD Mon YYYY')||'. Reminder starts 15 days before the review. Salary will change only after you approve an increment.',
 jsonb_build_object('kind','salary_review','worker_id',r.worker_id,'review_due_date',r.next_review_date,'reminder_date',r.reminder_date)
 from public.worker_salary_reviews r where (p_user_id is null or r.user_id=p_user_id) and r.reminder_date<=today_dhaka
 on conflict do nothing;
 get diagnostics n=row_count; return n;
end $$;
