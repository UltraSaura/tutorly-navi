-- Create user roles system to prevent privilege escalation
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'student', 'parent');

-- Create user_roles table (separate from users to prevent direct manipulation)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create admin audit log table
CREATE TABLE public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id) NOT NULL,
  action TEXT NOT NULL,
  target_table TEXT,
  target_id UUID,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
ON public.admin_audit_log
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert audit logs"
ON public.admin_audit_log
FOR INSERT
WITH CHECK (true);

-- Update ai_model_keys RLS policies to use role system
DROP POLICY IF EXISTS "Allow admins to manage AI model keys" ON public.ai_model_keys;
DROP POLICY IF EXISTS "Allow only admin users to manage AI model keys" ON public.ai_model_keys;

CREATE POLICY "Only admins with role can manage AI model keys"
ON public.ai_model_keys
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Update other admin policies to use role system
DROP POLICY IF EXISTS "Allow admins to manage AI models" ON public.ai_models;
CREATE POLICY "Only admins with role can manage AI models"
ON public.ai_models
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Allow admins to manage AI model providers" ON public.ai_model_providers;
CREATE POLICY "Only admins with role can manage AI model providers"
ON public.ai_model_providers
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Allow admins to manage prompt templates" ON public.prompt_templates;
CREATE POLICY "Only admins with role can manage prompt templates"
ON public.prompt_templates
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Allow admins to manage subject assignments" ON public.subject_prompt_assignments;
CREATE POLICY "Only admins with role can manage subject assignments"
ON public.subject_prompt_assignments
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Update sidebar_tabs policy only if table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sidebar_tabs') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow admins to manage sidebar tabs" ON public.sidebar_tabs';
    EXECUTE 'CREATE POLICY "Only admins with role can manage sidebar tabs"
    ON public.sidebar_tabs
    FOR ALL
    USING (public.has_role(auth.uid(), ''admin''))';
  END IF;
END $$;

-- Migrate existing admin users to role system
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM public.users
WHERE user_type = 'admin'
ON CONFLICT (user_id, role) DO NOTHING;

-- Migrate existing parents and students
INSERT INTO public.user_roles (user_id, role)
SELECT id, 
  CASE 
    WHEN user_type = 'parent' THEN 'parent'::app_role
    ELSE 'student'::app_role
  END
FROM public.users
WHERE user_type IN ('parent', 'student')
ON CONFLICT (user_id, role) DO NOTHING;