-- Ensure expired or unpaid accounts cannot upload new worker documents.
-- Existing document reads and stored files remain unchanged.
begin;

revoke all on function private.has_paid_access() from public, anon;
grant execute on function private.has_paid_access() to authenticated;

drop policy if exists "Worker documents owner upload" on storage.objects;
drop policy if exists "Worker documents paid owner upload" on storage.objects;
create policy "Worker documents paid owner upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'worker-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (select private.has_paid_access())
);

commit;
