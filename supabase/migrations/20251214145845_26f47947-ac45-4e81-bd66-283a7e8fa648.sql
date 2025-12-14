-- Add language column to learning_subjects
ALTER TABLE public.learning_subjects 
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';

-- Update existing subjects to have 'en' as default language
UPDATE public.learning_subjects 
SET language = 'en' 
WHERE language IS NULL;