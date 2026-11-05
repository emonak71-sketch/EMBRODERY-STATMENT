-- Index the nullable sender reference used by support message audit and joins.
create index if not exists support_messages_sender_id_idx
  on public.support_messages(sender_id);