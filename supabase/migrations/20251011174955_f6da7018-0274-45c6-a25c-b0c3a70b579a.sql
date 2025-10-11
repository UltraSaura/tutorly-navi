-- Phase 1.2: Guardian and Children Tables

-- Guardian extended profile
CREATE TABLE IF NOT EXISTS public.guardians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  billing_customer_id text,
  phone text,
  address_json jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Child extended profile
CREATE TABLE IF NOT EXISTS public.children (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  contact_email text,
  grade text,
  curriculum text,
  settings_json jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'active',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Guardian-child linking table
CREATE TABLE IF NOT EXISTS public.guardian_child_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_id uuid NOT NULL REFERENCES public.guardians(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  relation text DEFAULT 'parent',
  permissions_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(guardian_id, child_id)
);

-- Enable RLS
ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardian_child_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for guardians table
CREATE POLICY "Guardians can view their own profile"
ON public.guardians FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Guardians can update their own profile"
ON public.guardians FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Guardians can insert their own profile"
ON public.guardians FOR INSERT
WITH CHECK (user_id = auth.uid());

-- RLS Policies for children table
CREATE POLICY "Children can view their own profile"
ON public.children FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Guardians can view their children"
ON public.children FOR SELECT
USING (
  id IN (
    SELECT gcl.child_id 
    FROM public.guardian_child_links gcl
    INNER JOIN public.guardians g ON g.id = gcl.guardian_id
    WHERE g.user_id = auth.uid()
  )
);

CREATE POLICY "Guardians can update their children"
ON public.children FOR UPDATE
USING (
  id IN (
    SELECT gcl.child_id 
    FROM public.guardian_child_links gcl
    INNER JOIN public.guardians g ON g.id = gcl.guardian_id
    WHERE g.user_id = auth.uid()
  )
);

CREATE POLICY "Guardians can insert children"
ON public.children FOR INSERT
WITH CHECK (true);

-- RLS Policies for guardian_child_links
CREATE POLICY "Guardians can view their links"
ON public.guardian_child_links FOR SELECT
USING (
  guardian_id IN (
    SELECT id FROM public.guardians WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Guardians can create links"
ON public.guardian_child_links FOR INSERT
WITH CHECK (
  guardian_id IN (
    SELECT id FROM public.guardians WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Guardians can delete their links"
ON public.guardian_child_links FOR DELETE
USING (
  guardian_id IN (
    SELECT id FROM public.guardians WHERE user_id = auth.uid()
  )
);

-- Create trigger for updated_at columns
CREATE TRIGGER update_guardians_updated_at
BEFORE UPDATE ON public.guardians
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_children_updated_at
BEFORE UPDATE ON public.children
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();