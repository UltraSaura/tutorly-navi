-- Add sidebar_tabs column to the Supabase database schema if it doesn't exist
-- This is needed for the sidebar tab management functionality
CREATE TABLE IF NOT EXISTS public.sidebar_tabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  path TEXT NOT NULL,
  icon_name TEXT NOT NULL,
  is_visible BOOLEAN DEFAULT true,
  user_type TEXT NOT NULL DEFAULT 'user',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up Row Level Security
ALTER TABLE public.sidebar_tabs ENABLE ROW LEVEL SECURITY;

-- Create policy allowing authenticated users to read tabs
CREATE POLICY IF NOT EXISTS "Allow users to view sidebar tabs" 
ON public.sidebar_tabs 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Create policy allowing only authenticated users with admin privileges to modify tabs
CREATE POLICY IF NOT EXISTS "Allow admins to manage sidebar tabs" 
ON public.sidebar_tabs 
FOR ALL 
USING (auth.role() = 'authenticated' AND auth.uid() IN (
  SELECT id FROM public.users WHERE user_type = 'admin'
));

-- Insert initial data if the table is empty
INSERT INTO public.sidebar_tabs (title, path, icon_name, is_visible, user_type, sort_order)
SELECT 'Dashboard', '/dashboard', 'LayoutDashboard', true, 'user', 10
WHERE NOT EXISTS (SELECT 1 FROM public.sidebar_tabs WHERE path = '/dashboard');

INSERT INTO public.sidebar_tabs (title, path, icon_name, is_visible, user_type, sort_order)
SELECT 'Chat', '/chat', 'MessageCircle', true, 'user', 20
WHERE NOT EXISTS (SELECT 1 FROM public.sidebar_tabs WHERE path = '/chat');

INSERT INTO public.sidebar_tabs (title, path, icon_name, is_visible, user_type, sort_order)
SELECT 'Grades', '/grades', 'GraduationCap', true, 'user', 30
WHERE NOT EXISTS (SELECT 1 FROM public.sidebar_tabs WHERE path = '/grades');

INSERT INTO public.sidebar_tabs (title, path, icon_name, is_visible, user_type, sort_order)
SELECT 'Skills', '/skills', 'Sparkles', true, 'user', 40
WHERE NOT EXISTS (SELECT 1 FROM public.sidebar_tabs WHERE path = '/skills');

INSERT INTO public.sidebar_tabs (title, path, icon_name, is_visible, user_type, sort_order)
SELECT 'Support', '/support', 'LifeBuoy', true, 'user', 50
WHERE NOT EXISTS (SELECT 1 FROM public.sidebar_tabs WHERE path = '/support');

INSERT INTO public.sidebar_tabs (title, path, icon_name, is_visible, user_type, sort_order)
SELECT 'Profile', '/profile', 'User', true, 'user', 60
WHERE NOT EXISTS (SELECT 1 FROM public.sidebar_tabs WHERE path = '/profile');