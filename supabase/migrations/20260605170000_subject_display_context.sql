ALTER TABLE public.subjects
ADD COLUMN IF NOT EXISTS display_context text NOT NULL DEFAULT 'both';

ALTER TABLE public.subjects
DROP CONSTRAINT IF EXISTS subjects_display_context_check;

ALTER TABLE public.subjects
ADD CONSTRAINT subjects_display_context_check
CHECK (display_context IN ('learn', 'practice', 'both'));

UPDATE public.subjects
SET display_context = 'both'
WHERE display_context IS NULL;
