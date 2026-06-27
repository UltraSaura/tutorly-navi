-- Split subject text styling by Learn/Lesson and Practice contexts
ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS lesson_text_color text NOT NULL DEFAULT '#050B34',
  ADD COLUMN IF NOT EXISTS lesson_font_size integer NOT NULL DEFAULT 18,
  ADD COLUMN IF NOT EXISTS lesson_font_family text NOT NULL DEFAULT 'Poppins, sans-serif',
  ADD COLUMN IF NOT EXISTS practice_text_color text NOT NULL DEFAULT '#050B34',
  ADD COLUMN IF NOT EXISTS practice_font_size integer NOT NULL DEFAULT 18,
  ADD COLUMN IF NOT EXISTS practice_font_family text NOT NULL DEFAULT 'Poppins, sans-serif';

UPDATE public.subjects
SET
  lesson_text_color = COALESCE(NULLIF(text_color, ''), '#050B34'),
  lesson_font_size = COALESCE(font_size, 18),
  lesson_font_family = COALESCE(NULLIF(font_family, ''), 'Poppins, sans-serif'),
  practice_text_color = COALESCE(NULLIF(text_color, ''), '#050B34'),
  practice_font_size = COALESCE(font_size, 18),
  practice_font_family = COALESCE(NULLIF(font_family, ''), 'Poppins, sans-serif')
WHERE
  lesson_text_color IS DISTINCT FROM COALESCE(NULLIF(text_color, ''), '#050B34')
  OR lesson_font_size IS DISTINCT FROM COALESCE(font_size, 18)
  OR lesson_font_family IS DISTINCT FROM COALESCE(NULLIF(font_family, ''), 'Poppins, sans-serif')
  OR practice_text_color IS DISTINCT FROM COALESCE(NULLIF(text_color, ''), '#050B34')
  OR practice_font_size IS DISTINCT FROM COALESCE(font_size, 18)
  OR practice_font_family IS DISTINCT FROM COALESCE(NULLIF(font_family, ''), 'Poppins, sans-serif');

ALTER TABLE public.subjects
  DROP CONSTRAINT IF EXISTS subjects_lesson_font_size_check;

ALTER TABLE public.subjects
  ADD CONSTRAINT subjects_lesson_font_size_check
  CHECK (lesson_font_size BETWEEN 12 AND 36);

ALTER TABLE public.subjects
  DROP CONSTRAINT IF EXISTS subjects_practice_font_size_check;

ALTER TABLE public.subjects
  ADD CONSTRAINT subjects_practice_font_size_check
  CHECK (practice_font_size BETWEEN 12 AND 36);
