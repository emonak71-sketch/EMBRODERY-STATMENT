-- Index the contact updater foreign key and remove an unused timestamp index.
begin;
drop index if exists private.owner_customer_contacts_updated_at_idx;
create index if not exists owner_customer_contacts_updated_by_idx
  on private.owner_customer_contacts(updated_by);
commit;
