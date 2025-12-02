-- Update Reels table RLS
drop policy if exists "Admins can insert reels" on public.reels;

create policy "Authenticated users can insert reels"
on public.reels for insert
with check ( auth.role() = 'authenticated' );

-- Ensure 'reels' bucket exists (this is a best-effort attempt, usually requires superuser or dashboard)
insert into storage.buckets (id, name, public)
values ('reels', 'reels', true)
on conflict (id) do nothing;

-- Storage policies for 'reels' bucket
-- Allow public access to view reels
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'reels' );

-- Allow authenticated users to upload to 'reels' bucket
create policy "Authenticated users can upload reels"
on storage.objects for insert
with check (
  bucket_id = 'reels' and
  auth.role() = 'authenticated'
);

-- Allow users to update/delete their own reels
create policy "Users can update own reels"
on storage.objects for update
using (
  bucket_id = 'reels' and
  auth.uid() = owner
);

create policy "Users can delete own reels"
on storage.objects for delete
using (
  bucket_id = 'reels' and
  auth.uid() = owner
);
