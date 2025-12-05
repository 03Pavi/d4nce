-- Create communities table
create table if not exists public.communities (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  tags text[] default array[]::text[],
  admin_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create community_members table
create table if not exists public.community_members (
  id uuid default gen_random_uuid() primary key,
  community_id uuid references public.communities(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(community_id, user_id)
);

-- Enable RLS
alter table public.communities enable row level security;
alter table public.community_members enable row level security;

-- Policies for communities
create policy "Communities are viewable by everyone"
  on public.communities for select
  using ( true );

create policy "Admins can insert their own community"
  on public.communities for insert
  with check ( auth.uid() = admin_id );

create policy "Admins can update their own community"
  on public.communities for update
  using ( auth.uid() = admin_id );

create policy "Admins can delete their own community"
  on public.communities for delete
  using ( auth.uid() = admin_id );

-- Policies for community_members
create policy "Memberships are viewable by everyone"
  on public.community_members for select
  using ( true );

create policy "Users can join communities"
  on public.community_members for insert
  with check ( auth.uid() = user_id );

create policy "Users can leave communities"
  on public.community_members for delete
  using ( auth.uid() = user_id );

-- Update handle_new_user function to create community for admins
create or replace function public.handle_new_user()
returns trigger as $$
declare
  new_community_id uuid;
  tags_json jsonb;
  tag_text text;
  tags_array text[];
begin
  -- Insert into profiles
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    coalesce(new.raw_user_meta_data->>'role', 'student')
  );

  -- If role is admin and community_name is present, create community
  if (new.raw_user_meta_data->>'role') = 'admin' and (new.raw_user_meta_data->>'community_name') is not null then
    
    -- Handle tags safely
    tags_array := array[]::text[];
    tags_json := new.raw_user_meta_data->'tags';
    
    if tags_json is not null and jsonb_typeof(tags_json) = 'array' then
      select array_agg(value) into tags_array
      from jsonb_array_elements_text(tags_json);
    end if;

    insert into public.communities (name, tags, admin_id)
    values (
      new.raw_user_meta_data->>'community_name',
      tags_array,
      new.id
    ) returning id into new_community_id;
  end if;

  return new;
end;
$$ language plpgsql security definer;
