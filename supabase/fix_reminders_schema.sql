-- Ensure all columns exist in reminders table
ALTER TABLE public.reminders 
ADD COLUMN IF NOT EXISTS title text,
ADD COLUMN IF NOT EXISTS time timestamp with time zone,
ADD COLUMN IF NOT EXISTS for_group text DEFAULT 'All',
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();
