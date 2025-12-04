-- Create Recordings table
CREATE TABLE IF NOT EXISTS public.recordings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  video_url text NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for Recordings
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Recordings are viewable by everyone" ON public.recordings;
CREATE POLICY "Recordings are viewable by everyone" 
  ON public.recordings FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Admins can manage recordings" ON public.recordings;
CREATE POLICY "Admins can manage recordings" 
  ON public.recordings FOR ALL 
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Create storage bucket for recordings
INSERT INTO storage.buckets (id, name, public)
VALUES ('recordings', 'recordings', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for recordings
DROP POLICY IF EXISTS "Recording videos are publicly accessible." ON storage.objects;
CREATE POLICY "Recording videos are publicly accessible."
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'recordings' );

DROP POLICY IF EXISTS "Authenticated users can upload recordings." ON storage.objects;
CREATE POLICY "Authenticated users can upload recordings."
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK ( bucket_id = 'recordings' );

DROP POLICY IF EXISTS "Users can update their own recordings." ON storage.objects;
CREATE POLICY "Users can update their own recordings."
  ON storage.objects FOR UPDATE
  TO authenticated
  USING ( bucket_id = 'recordings' AND auth.uid()::text = (storage.foldername(name))[1] );

DROP POLICY IF EXISTS "Users can delete their own recordings." ON storage.objects;
CREATE POLICY "Users can delete their own recordings."
  ON storage.objects FOR DELETE
  TO authenticated
  USING ( bucket_id = 'recordings' AND auth.uid()::text = (storage.foldername(name))[1] );
