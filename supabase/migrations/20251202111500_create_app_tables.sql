-- Create Reels table
create table if not exists public.reels (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  url text not null,
  description text,
  likes_count integer default 0,
  comments_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Reminders table
create table if not exists public.reminders (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  scheduled_time timestamp with time zone not null,
  target_group text check (target_group in ('All', 'Advanced', 'Beginner', 'Intermediate')) default 'All',
  created_by uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Live Sessions table
create table if not exists public.live_sessions (
  id uuid default gen_random_uuid() primary key,
  host_id uuid references public.profiles(id) on delete cascade not null,
  is_live boolean default false,
  channel_name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Reels
alter table public.reels enable row level security;
create policy "Reels are viewable by everyone" on public.reels for select using (true);
create policy "Admins can insert reels" on public.reels for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- RLS for Reminders
alter table public.reminders enable row level security;
create policy "Reminders are viewable by everyone" on public.reminders for select using (true);
create policy "Admins can manage reminders" on public.reminders for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- RLS for Live Sessions
alter table public.live_sessions enable row level security;
create policy "Live sessions are viewable by everyone" on public.live_sessions for select using (true);
create policy "Admins can manage live sessions" on public.live_sessions for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
