-- Add subject font family control for admin-managed subject tiles
ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS font_family text NOT NULL DEFAULT 'Poppins, sans-serif';
