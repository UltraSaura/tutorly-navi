-- Add teacher role to enum if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role' AND 'teacher'::text = ANY(enum_range(NULL::app_role)::text[])) THEN
    ALTER TYPE public.app_role ADD VALUE 'teacher';
  END IF;
END $$;

-- Teachers table
CREATE TABLE IF NOT EXISTS public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Classes/Classrooms table
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  level_code TEXT,
  country_code TEXT,
  subject_id TEXT,
  school_year TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Many-to-many: Students in Classes
CREATE TABLE IF NOT EXISTS public.class_student_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(class_id, student_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON public.teachers(user_id);
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON public.classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_class_student_links_class ON public.class_student_links(class_id);
CREATE INDEX IF NOT EXISTS idx_class_student_links_student ON public.class_student_links(student_id);

-- RLS Policies
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_student_links ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Teachers can view own profile" ON public.teachers;
DROP POLICY IF EXISTS "Teachers can update own profile" ON public.teachers;
DROP POLICY IF EXISTS "Teachers can view own classes" ON public.classes;
DROP POLICY IF EXISTS "Teachers can manage own classes" ON public.classes;
DROP POLICY IF EXISTS "Teachers can view class students" ON public.class_student_links;
DROP POLICY IF EXISTS "Teachers can manage class students" ON public.class_student_links;
DROP POLICY IF EXISTS "Admins can manage teachers" ON public.teachers;
DROP POLICY IF EXISTS "Admins can manage classes" ON public.classes;
DROP POLICY IF EXISTS "Admins can manage class links" ON public.class_student_links;

-- Teachers can view/manage their own profile
CREATE POLICY "Teachers can view own profile"
ON public.teachers FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Teachers can update own profile"
ON public.teachers FOR UPDATE
USING (user_id = auth.uid());

-- Teachers can view/manage their own classes
CREATE POLICY "Teachers can view own classes"
ON public.classes FOR SELECT
USING (teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid()));

CREATE POLICY "Teachers can manage own classes"
ON public.classes FOR ALL
USING (teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid()));

-- Teachers can view students in their classes
CREATE POLICY "Teachers can view class students"
ON public.class_student_links FOR SELECT
USING (
  class_id IN (
    SELECT c.id FROM public.classes c
    JOIN public.teachers t ON t.id = c.teacher_id
    WHERE t.user_id = auth.uid()
  )
);

-- Teachers can manage students in their classes
CREATE POLICY "Teachers can manage class students"
ON public.class_student_links FOR ALL
USING (
  class_id IN (
    SELECT c.id FROM public.classes c
    JOIN public.teachers t ON t.id = c.teacher_id
    WHERE t.user_id = auth.uid()
  )
);

-- Admins can do everything
CREATE POLICY "Admins can manage teachers"
ON public.teachers FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

CREATE POLICY "Admins can manage classes"
ON public.classes FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

CREATE POLICY "Admins can manage class links"
ON public.class_student_links FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- Function to auto-create teacher profile
CREATE OR REPLACE FUNCTION public.auto_create_teacher_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_type = 'teacher' THEN
    INSERT INTO public.teachers (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to auto-assign teacher role
CREATE OR REPLACE FUNCTION public.auto_assign_teacher_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.user_id, 'teacher'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Triggers
DROP TRIGGER IF EXISTS on_user_created_create_teacher_profile ON public.users;
CREATE TRIGGER on_user_created_create_teacher_profile
AFTER INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION auto_create_teacher_profile();

DROP TRIGGER IF EXISTS on_teacher_created_assign_role ON public.teachers;
CREATE TRIGGER on_teacher_created_assign_role
AFTER INSERT ON public.teachers
FOR EACH ROW
EXECUTE FUNCTION auto_assign_teacher_role();

DROP TRIGGER IF EXISTS update_teachers_updated_at ON public.teachers;
CREATE TRIGGER update_teachers_updated_at
BEFORE UPDATE ON public.teachers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_classes_updated_at ON public.classes;
CREATE TRIGGER update_classes_updated_at
BEFORE UPDATE ON public.classes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE public.teachers IS 'Teacher profiles linked to auth users';
COMMENT ON TABLE public.classes IS 'Classes or classrooms managed by teachers';
COMMENT ON TABLE public.class_student_links IS 'Many-to-many relationship between classes and students';