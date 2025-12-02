-- Create Classes table
CREATE TABLE IF NOT EXISTS public.classes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  instructor_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  session_id text NOT NULL UNIQUE, -- Used for live streaming channel
  price decimal(10,2) DEFAULT 0,
  max_students integer DEFAULT 50,
  scheduled_at timestamp with time zone,
  duration_minutes integer DEFAULT 60,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Class Enrollments table (junction table for students enrolled in classes)
CREATE TABLE IF NOT EXISTS public.class_enrollments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  student_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  enrolled_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  has_paid boolean DEFAULT false,
  payment_amount decimal(10,2),
  UNIQUE(class_id, student_id) -- Prevent duplicate enrollments
);

-- RLS for Classes
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Classes are viewable by everyone" 
  ON public.classes FOR SELECT 
  USING (true);

CREATE POLICY "Admins can create classes" 
  ON public.classes FOR INSERT 
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update their classes" 
  ON public.classes FOR UPDATE 
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete their classes" 
  ON public.classes FOR DELETE 
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- RLS for Class Enrollments
ALTER TABLE public.class_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own enrollments" 
  ON public.class_enrollments FOR SELECT 
  USING (
    auth.uid() = student_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage enrollments" 
  ON public.class_enrollments FOR ALL 
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_classes_instructor ON public.classes(instructor_id);
CREATE INDEX IF NOT EXISTS idx_classes_session ON public.classes(session_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class ON public.class_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON public.class_enrollments(student_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON public.classes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
