-- Add for_group column if it's missing
ALTER TABLE public.reminders 
ADD COLUMN IF NOT EXISTS for_group text DEFAULT 'All';
