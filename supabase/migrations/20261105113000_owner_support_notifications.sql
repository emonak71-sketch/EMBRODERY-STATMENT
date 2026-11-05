-- Shared customer support, owner notifications and subscription activation notices.
begin;

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_email text,
  business_name text,
  subject text not null check (length(trim(subject)) between 3 and 140),
  category text not null default 'general' check (category in ('general','account','subscription','attendance','payroll','data','bug','other')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  status text not null default 'open' check (status in ('open','in_progress','waiting_customer','resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists support_tickets_user_updated_idx on public.support_tickets(user_id, updated_at desc);
create index if not exists support_tickets_status_updated_idx on public.support_tickets(status, updated_at desc);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  sender_role text not null check (sender_role in ('customer','owner','assistant')),
  body text not null check (length(trim(body)) between 1 and 6000),
  ai_model text,
  created_at timestamptz not null default now()
);
create index if not exists support_messages_ticket_created_idx on public.support_messages(ticket_id, created_at);

create table if not exists public.app_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_type text not null check (notification_type in ('subscription_activated','subscription_expiring','subscription_expired','support_ticket','support_reply','system')),
  title text not null check (length(trim(title)) between 1 and 140),
  body text not null check (length(trim(body)) between 1 and 1000),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists app_notifications_user_created_idx on public.app_notifications(user_id, created_at desc);

alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
alter table public.app_notifications enable row level security;

revoke all on public.support_tickets from public, anon;
revoke all on public.support_messages from public, anon;
revoke all on public.app_notifications from public, anon, authenticated;
grant select, insert, update on public.support_tickets to authenticated;
grant select, insert on public.support_messages to authenticated;
grant select on public.app_notifications to authenticated;
grant update(read_at) on public.app_notifications to authenticated;

drop policy if exists "support_tickets_select_own_or_owner" on public.support_tickets;
create policy "support_tickets_select_own_or_owner" on public.support_tickets
for select to authenticated using (user_id = (select auth.uid()) or (select private.is_billing_admin()));

drop policy if exists "support_tickets_insert_own" on public.support_tickets;
create policy "support_tickets_insert_own" on public.support_tickets
for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "support_tickets_update_owner" on public.support_tickets;
create policy "support_tickets_update_owner" on public.support_tickets
for update to authenticated using ((select private.is_billing_admin()))
with check ((select private.is_billing_admin()));

drop policy if exists "support_messages_select_ticket_owner" on public.support_messages;
create policy "support_messages_select_ticket_owner" on public.support_messages
for select to authenticated using (
  (select private.is_billing_admin())
  or exists (
    select 1 from public.support_tickets t
    where t.id = support_messages.ticket_id and t.user_id = (select auth.uid())
  )
);

drop policy if exists "support_messages_insert_customer_or_owner" on public.support_messages;
create policy "support_messages_insert_customer_or_owner" on public.support_messages
for insert to authenticated with check (
  sender_id = (select auth.uid())
  and (
    (sender_role = 'customer' and exists (
      select 1 from public.support_tickets t
      where t.id = support_messages.ticket_id and t.user_id = (select auth.uid())
    ))
    or (sender_role = 'owner' and (select private.is_billing_admin()))
  )
);

drop policy if exists "app_notifications_select_own" on public.app_notifications;
create policy "app_notifications_select_own" on public.app_notifications
for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "app_notifications_update_own" on public.app_notifications;
create policy "app_notifications_update_own" on public.app_notifications
for update to authenticated using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create or replace function private.capture_support_ticket_customer()
returns trigger language plpgsql security definer set search_path = ''
as $function$
begin
  select u.email::text, coalesce(u.raw_user_meta_data ->> 'business_name','EMBROIDERY STATEMENT')
    into new.customer_email, new.business_name
  from auth.users u where u.id = new.user_id;
  return new;
end;
$function$;

create or replace function private.notify_owner_new_support_ticket()
returns trigger language plpgsql security definer set search_path = ''
as $function$
declare v_owner record;
begin
  for v_owner in select a.user_id from public.billing_admins a loop
    insert into public.app_notifications(user_id,notification_type,title,body,payload)
    values (v_owner.user_id,'support_ticket','New customer support request',
      coalesce(new.customer_email,'A customer') || ' submitted: ' || new.subject,
      jsonb_build_object('ticket_id',new.id,'customer_id',new.user_id));
  end loop;
  return new;
end;
$function$;

create or replace function private.sync_support_message_activity()
returns trigger language plpgsql security definer set search_path = ''
as $function$
declare v_ticket public.support_tickets%rowtype;
begin
  update public.support_tickets set updated_at=now(), last_message_at=new.created_at
  where id=new.ticket_id returning * into v_ticket;
  if new.sender_role='owner' then
    insert into public.app_notifications(user_id,notification_type,title,body,payload)
    values (v_ticket.user_id,'support_reply','Support team replied',left(new.body,220),
      jsonb_build_object('ticket_id',v_ticket.id,'message_id',new.id));
  end if;
  return new;
end;
$function$;

create or replace function private.notify_customer_access_grant()
returns trigger language plpgsql security definer set search_path = ''
as $function$
begin
  insert into public.app_notifications(user_id,notification_type,title,body,payload)
  values (
    new.user_id,'subscription_activated','Your Pro access is activated',
    'Your ' || new.granted_days::text || '-day Pro access has been activated. It expires on ' ||
      to_char(new.ends_at at time zone 'Asia/Dhaka','DD Mon YYYY HH12:MI AM') || ' (Bangladesh time).',
    jsonb_build_object('grant_id',new.id,'days',new.granted_days,'starts_at',new.starts_at,'ends_at',new.ends_at)
  );
  return new;
end;
$function$;

drop trigger if exists support_ticket_capture_customer on public.support_tickets;
create trigger support_ticket_capture_customer before insert on public.support_tickets
for each row execute function private.capture_support_ticket_customer();

drop trigger if exists support_ticket_notify_owner on public.support_tickets;
create trigger support_ticket_notify_owner after insert on public.support_tickets
for each row execute function private.notify_owner_new_support_ticket();

drop trigger if exists support_message_activity on public.support_messages;
create trigger support_message_activity after insert on public.support_messages
for each row execute function private.sync_support_message_activity();

drop trigger if exists owner_grant_notify_customer on private.admin_access_grants;
create trigger owner_grant_notify_customer after insert on private.admin_access_grants
for each row execute function private.notify_customer_access_grant();

revoke all on function private.capture_support_ticket_customer() from public, anon, authenticated;
revoke all on function private.notify_owner_new_support_ticket() from public, anon, authenticated;
revoke all on function private.sync_support_message_activity() from public, anon, authenticated;
revoke all on function private.notify_customer_access_grant() from public, anon, authenticated;

do $publication$
begin
  if exists (select 1 from pg_publication where pubname='supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='support_tickets') then
      alter publication supabase_realtime add table public.support_tickets;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='support_messages') then
      alter publication supabase_realtime add table public.support_messages;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='app_notifications') then
      alter publication supabase_realtime add table public.app_notifications;
    end if;
  end if;
end;
$publication$;

comment on table public.support_tickets is 'Customer support tickets shared between customer apps and the Owner Control Center.';
comment on table public.support_messages is 'RLS-protected support conversation messages; assistant messages are server-inserted only.';
comment on table public.app_notifications is 'In-app notifications synchronized across web, PWA, Windows and Android clients.';

notify pgrst, 'reload schema';
commit;
