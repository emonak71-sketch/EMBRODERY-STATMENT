begin;

-- Remove inherited/default table privileges and re-grant only the operations
-- required by the customer and owner interfaces. RLS remains the row boundary.
revoke all on table public.support_tickets from public, anon, authenticated;
revoke all on table public.support_messages from public, anon, authenticated;
revoke all on table public.app_notifications from public, anon, authenticated;

grant select, insert, update on table public.support_tickets to authenticated;
grant select, insert on table public.support_messages to authenticated;
grant select on table public.app_notifications to authenticated;
grant update (read_at) on table public.app_notifications to authenticated;

-- Customers may open normal tickets only; ticket priority and workflow status
-- remain controlled by the support system and owner.
drop policy if exists support_tickets_insert_own on public.support_tickets;
create policy support_tickets_insert_own
on public.support_tickets
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and status = 'open'
  and priority = 'normal'
);

notify pgrst, 'reload schema';
commit;
