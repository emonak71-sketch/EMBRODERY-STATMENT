begin;

create or replace function private.normalize_support_ticket_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  new.status := 'open';
  new.priority := 'normal';
  new.created_at := now();
  new.updated_at := now();
  new.last_message_at := now();
  new.resolved_at := null;
  return new;
end;
$function$;

create or replace function private.touch_support_ticket_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

create or replace function private.normalize_support_message_timestamp()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  new.created_at := now();
  return new;
end;
$function$;

drop trigger if exists support_ticket_normalize_insert on public.support_tickets;
create trigger support_ticket_normalize_insert
before insert on public.support_tickets
for each row execute function private.normalize_support_ticket_insert();

drop trigger if exists support_ticket_touch_updated_at on public.support_tickets;
create trigger support_ticket_touch_updated_at
before update on public.support_tickets
for each row execute function private.touch_support_ticket_updated_at();

drop trigger if exists support_message_normalize_timestamp on public.support_messages;
create trigger support_message_normalize_timestamp
before insert on public.support_messages
for each row execute function private.normalize_support_message_timestamp();

revoke all on function private.normalize_support_ticket_insert() from public, anon, authenticated;
revoke all on function private.touch_support_ticket_updated_at() from public, anon, authenticated;
revoke all on function private.normalize_support_message_timestamp() from public, anon, authenticated;

notify pgrst, 'reload schema';
commit;
