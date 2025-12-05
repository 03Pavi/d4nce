-- Add community_id to reels table
alter table public.reels 
add column if not exists community_id uuid references public.communities(id) on delete set null;

-- Update RLS for reels
-- Users can view reels from communities they are members of (or if it's public/open?)
-- For now, let's assume community reels are viewable if you have access to the community.
-- Existing policy "Reels are viewable by everyone" might be too broad if we want private community reels, 
-- but for now let's keep it simple and just allow filtering.

-- We might want to update the insert policy if needed, but "Users can insert their own reels" usually checks auth.uid() = user_id, which is fine.
