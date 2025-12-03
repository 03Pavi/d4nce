-- Create reminders table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.reminders (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    scheduled_time timestamp with time zone, -- Using scheduled_time as preferred column
    for_group text DEFAULT 'All',
    created_by uuid REFERENCES auth.users(id),
    created_at timestamp with time zone DEFAULT now()
);

-- Handle migration from 'time' to 'scheduled_time' if 'time' exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reminders' AND column_name = 'time') THEN
        -- If scheduled_time doesn't exist, create it
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reminders' AND column_name = 'scheduled_time') THEN
            ALTER TABLE public.reminders ADD COLUMN scheduled_time timestamp with time zone;
        END IF;

        -- Move data
        UPDATE public.reminders SET scheduled_time = "time" WHERE scheduled_time IS NULL;

        -- Drop old column
        ALTER TABLE public.reminders DROP COLUMN "time";
    END IF;
END $$;

-- Ensure scheduled_time is NOT NULL (after migration)
ALTER TABLE public.reminders ALTER COLUMN scheduled_time SET NOT NULL;

-- Enable RLS
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Everyone can view reminders" ON public.reminders;
CREATE POLICY "Everyone can view reminders" 
ON public.reminders FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert reminders" ON public.reminders;
CREATE POLICY "Authenticated users can insert reminders" 
ON public.reminders FOR INSERT 
TO authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete reminders" ON public.reminders;
CREATE POLICY "Authenticated users can delete reminders" 
ON public.reminders FOR DELETE 
TO authenticated 
USING (true);
