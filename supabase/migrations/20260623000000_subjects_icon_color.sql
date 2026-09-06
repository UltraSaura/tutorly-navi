-- Add icon_color column to subjects for per-subject icon tinting
ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS icon_color text NOT NULL DEFAULT '#1e3a5f';
