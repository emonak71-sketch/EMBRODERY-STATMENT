begin;

create or replace function private.notify_owner_customer_reply()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_ticket public.support_tickets%rowtype;
begin
  if new.sender_role <> 'customer' then
    return new;
  end if;

  select * into v_ticket
  from public.support_tickets
  where id = new.ticket_id;

  if not found or v_ticket.status = 'open' then
    -- New tickets already notify the Owner when the ticket row is created.
    return new;
  end if;

  insert into public.app_notifications(user_id, notification_type, title, body, payload)
  select
    a.user_id,
    'support_ticket',
    'Customer replied and needs support',
    coalesce(v_ticket.customer_email, 'A customer') || ' replied: ' || v_ticket.subject,
    jsonb_build_object('ticket_id', v_ticket.id, 'customer_id', v_ticket.user_id)
  from public.billing_admins a;

  return new;
end;
$function$;

drop trigger if exists support_message_notify_owner_customer_reply on public.support_messages;
create trigger support_message_notify_owner_customer_reply
after insert on public.support_messages
for each row execute function private.notify_owner_customer_reply();

revoke all on function private.notify_owner_customer_reply() from public, anon, authenticated;

notify pgrst, 'reload schema';
commit;
