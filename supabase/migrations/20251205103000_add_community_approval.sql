-- Add join_policy to communities
alter table public.communities 
add column if not exists join_policy text check (join_policy in ('open', 'approval_required')) default 'open';

-- Add status to community_members
alter table public.community_members 
add column if not exists status text check (status in ('pending', 'approved', 'rejected')) default 'approved';

-- Update RLS for community_members
-- Admins can update members of their community (to approve/reject)
create policy "Admins can update members of their community"
  on public.community_members for update
  using (
    exists (
      select 1 from public.communities
      where id = community_members.community_id
      and admin_id = auth.uid()
    )
  );

-- Admins can delete members of their community (reject/remove)
create policy "Admins can delete members of their community"
  on public.community_members for delete
  using (
    exists (
      select 1 from public.communities
      where id = community_members.community_id
      and admin_id = auth.uid()
    )
  );
