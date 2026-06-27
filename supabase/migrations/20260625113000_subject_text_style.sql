-- Add subject text styling controls for admin subject management
ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS text_color text NOT NULL DEFAULT '#050B34',
  ADD COLUMN IF NOT EXISTS font_size integer NOT NULL DEFAULT 18;

ALTER TABLE public.subjects
  DROP CONSTRAINT IF EXISTS subjects_font_size_check;

ALTER TABLE public.subjects
  ADD CONSTRAINT subjects_font_size_check
  CHECK (font_size BETWEEN 12 AND 36);
