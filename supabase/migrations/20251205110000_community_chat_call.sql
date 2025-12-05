-- Add description to communities if not exists (already in create_communities but ensuring it's used)
-- It was in the original create table, so we are good.

-- Create community_messages table
create table if not exists public.community_messages (
  id uuid default gen_random_uuid() primary key,
  community_id uuid references public.communities(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.community_messages enable row level security;

-- Policies for messages
create policy "Community members can view messages"
  on public.community_messages for select
  using (
    exists (
      select 1 from public.community_members
      where community_id = community_messages.community_id
      and user_id = auth.uid()
      and status = 'approved'
    )
    or
    exists (
      select 1 from public.communities
      where id = community_messages.community_id
      and admin_id = auth.uid()
    )
  );

create policy "Community members can insert messages"
  on public.community_messages for insert
  with check (
    exists (
      select 1 from public.community_members
      where community_id = community_messages.community_id
      and user_id = auth.uid()
      and status = 'approved'
    )
    or
    exists (
      select 1 from public.communities
      where id = community_messages.community_id
      and admin_id = auth.uid()
    )
  );

-- Create call_invites table
create table if not exists public.call_invites (
  id uuid default gen_random_uuid() primary key,
  community_id uuid references public.communities(id) on delete cascade not null,
  caller_id uuid references public.profiles(id) on delete cascade not null,
  receiver_id uuid references public.profiles(id) on delete cascade not null,
  room_id text not null,
  status text check (status in ('pending', 'accepted', 'rejected', 'ended')) default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.call_invites enable row level security;

create policy "Users can view their own invites"
  on public.call_invites for select
  using ( auth.uid() = receiver_id or auth.uid() = caller_id );

create policy "Users can create invites"
  on public.call_invites for insert
  with check ( auth.uid() = caller_id );

create policy "Users can update their own invites"
  on public.call_invites for update
  using ( auth.uid() = receiver_id or auth.uid() = caller_id );
