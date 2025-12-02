-- Fix foreign key relationships to allow joining with profiles
-- Drop existing constraints referencing auth.users
ALTER TABLE public.comments
DROP CONSTRAINT IF EXISTS comments_user_id_fkey;

ALTER TABLE public.likes
DROP CONSTRAINT IF EXISTS likes_user_id_fkey;

-- Add new constraints referencing public.profiles
-- This assumes public.profiles.id is the same as auth.users.id (which it is in our setup)
ALTER TABLE public.comments
ADD CONSTRAINT comments_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;

ALTER TABLE public.likes
ADD CONSTRAINT likes_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;
