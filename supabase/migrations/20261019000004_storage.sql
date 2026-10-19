-- =============================================================================
-- DhanDrashti · 0004 · Private receipt storage
-- Bucket "receipts" is private. Objects live under "<user_id>/<transaction_id>/<random>.<ext>".
-- Policies allow a user to touch only objects inside their own top-level folder.
-- Server-side code additionally validates MIME type, size and magic bytes.
-- =============================================================================

do $$
begin
  -- Hosted Supabase exposes bucket limits as columns; older local images do not.
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'storage' and table_name = 'buckets' and column_name = 'allowed_mime_types'
  ) then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values (
      'receipts',
      'receipts',
      false,
      5242880, -- 5 MB
      array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    )
    on conflict (id) do update
      set public = excluded.public,
          file_size_limit = excluded.file_size_limit,
          allowed_mime_types = excluded.allowed_mime_types;
  else
    insert into storage.buckets (id, name) values ('receipts', 'receipts')
    on conflict (id) do nothing;
  end if;
end
$$;


drop policy if exists "receipts: select own" on storage.objects;
create policy "receipts: select own" on storage.objects
  for select to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "receipts: insert own" on storage.objects;
create policy "receipts: insert own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "receipts: update own" on storage.objects;
create policy "receipts: update own" on storage.objects
  for update to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "receipts: delete own" on storage.objects;
create policy "receipts: delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);
