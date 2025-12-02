-- Create follows table
CREATE TABLE IF NOT EXISTS public.follows (
    follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (follower_id, following_id)
);

-- Enable RLS
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Follows
CREATE POLICY "Everyone can view follows" ON public.follows
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can toggle follows" ON public.follows
    FOR ALL USING (auth.uid() = follower_id);

-- Add stats columns to profiles if they don't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;

-- Functions to update follow counts
CREATE OR REPLACE FUNCTION public.handle_new_follow()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET followers_count = followers_count + 1
  WHERE id = NEW.following_id;
  
  UPDATE public.profiles
  SET following_count = following_count + 1
  WHERE id = NEW.follower_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_un_follow()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET followers_count = followers_count - 1
  WHERE id = OLD.following_id;
  
  UPDATE public.profiles
  SET following_count = following_count - 1
  WHERE id = OLD.follower_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for follows
CREATE TRIGGER on_follow_added
  AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_follow();

CREATE TRIGGER on_follow_removed
  AFTER DELETE ON public.follows
  FOR EACH ROW EXECUTE PROCEDURE public.handle_un_follow();

-- Ensure Reels RLS allows update/delete for owners
CREATE POLICY "Users can update their own reels" ON public.reels
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reels" ON public.reels
    FOR DELETE USING (auth.uid() = user_id);
