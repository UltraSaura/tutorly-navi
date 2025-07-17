
-- Create a table to manage sidebar tab configurations
CREATE TABLE public.sidebar_tabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  path TEXT NOT NULL,
  icon_name TEXT,
  is_visible BOOLEAN DEFAULT true,
  user_type TEXT NOT NULL DEFAULT 'user',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sidebar_tabs_modtime
BEFORE UPDATE ON public.sidebar_tabs
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- Add Row Level Security
ALTER TABLE public.sidebar_tabs ENABLE ROW LEVEL SECURITY;

-- Policy to allow only admins to manage sidebar tabs
CREATE POLICY "Admins can manage sidebar tabs"
ON public.sidebar_tabs
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Initial seed data for default tabs
INSERT INTO public.sidebar_tabs (title, path, icon_name, user_type, sort_order)
VALUES 
  ('Dashboard', '/dashboard', 'LayoutDashboard', 'user', 0),
  ('Chat', '/chat', 'MessageCircle', 'user', 1),
  ('Learning Path', '/learning-path', 'Book', 'user', 2),
  ('Profile', '/profile', 'User', 'user', 3);
