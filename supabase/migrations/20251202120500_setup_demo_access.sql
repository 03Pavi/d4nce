-- 1. Insert a mock profile for the demo user if it doesn't exist
-- We need to handle the foreign key constraint from public.profiles to auth.users
-- Since we can't easily insert into auth.users via SQL without admin privileges or bypassing triggers,
-- we will try to insert into public.profiles directly. 
-- However, public.profiles.id references auth.users.id.
-- If we cannot insert into auth.users, we might need to drop the FK constraint for the demo to work, 
-- OR (better) we just make the user_id in reels nullable or not a foreign key? 
-- No, let's try to insert a fake user into auth.users if possible, or just assume the constraint exists.

-- Actually, for a pure demo with 'anon' access, the cleanest way is to:
-- A. Allow anon access to reels table.
-- B. Ensure the mock UUID exists in profiles.
-- C. To exist in profiles, it must exist in auth.users (usually).

-- Let's try to insert into auth.users first (this requires superuser/service_role, which migrations usually run as).
INSERT INTO auth.users (id, email)
VALUES ('11111111-1111-1111-1111-111111111111', 'demo@d4nce.com')
ON CONFLICT (id) DO NOTHING;

-- Now insert into profiles
INSERT INTO public.profiles (id, email, full_name, role)
VALUES ('11111111-1111-1111-1111-111111111111', 'demo@d4nce.com', 'Demo User', 'student')
ON CONFLICT (id) DO NOTHING;

-- 2. Update RLS for Reels to allow ANON inserts
DROP POLICY IF EXISTS "Authenticated users can insert reels" ON public.reels;
CREATE POLICY "Everyone can insert reels"
ON public.reels FOR INSERT
WITH CHECK (true); -- Allow anyone (including anon) to insert

-- 3. Update Storage RLS for Reels bucket to allow ANON uploads
DROP POLICY IF EXISTS "Authenticated users can upload reels" ON storage.objects;
CREATE POLICY "Everyone can upload reels"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'reels' );
