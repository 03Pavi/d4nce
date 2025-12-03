-- Create storage buckets
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('reels', 'reels', true)
on conflict (id) do nothing;

-- Set up storage policies for avatars
create policy "Avatar images are publicly accessible."
  on storage.objects for select
  using ( bucket_id = 'avatars' );

create policy "Anyone can upload an avatar."
  on storage.objects for insert
  with check ( bucket_id = 'avatars' );

create policy "Anyone can update their own avatar."
  on storage.objects for update
  using ( bucket_id = 'avatars' );

-- Set up storage policies for reels
create policy "Reel videos are publicly accessible."
  on storage.objects for select
  using ( bucket_id = 'reels' );

create policy "Authenticated users can upload reels."
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'reels' );

create policy "Users can update their own reels."
  on storage.objects for update
  to authenticated
  using ( bucket_id = 'reels' AND auth.uid()::text = (storage.foldername(name))[1] );

create policy "Users can delete their own reels."
  on storage.objects for delete
  to authenticated
  using ( bucket_id = 'reels' AND auth.uid()::text = (storage.foldername(name))[1] );
