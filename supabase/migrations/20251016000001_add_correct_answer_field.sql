-- Add correct_answer column to exercise_history
ALTER TABLE public.exercise_history 
ADD COLUMN IF NOT EXISTS correct_answer TEXT;

-- Add explanation_metadata to store AI response metadata (mode, revealAnswer, etc.)
ALTER TABLE public.exercise_history 
ADD COLUMN IF NOT EXISTS explanation_metadata JSONB DEFAULT '{}';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_exercise_history_correct_answer 
ON public.exercise_history(correct_answer);

-- Update exercise_explanations_cache to support correct answers
ALTER TABLE public.exercise_explanations_cache 
ADD COLUMN IF NOT EXISTS correct_answer TEXT;
