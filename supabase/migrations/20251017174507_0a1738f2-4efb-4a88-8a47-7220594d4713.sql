-- Add correct_answer column if it doesn't exist
ALTER TABLE public.exercise_explanations_cache
ADD COLUMN IF NOT EXISTS correct_answer TEXT;

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_exercise_content 
ON public.exercise_explanations_cache(exercise_content);

CREATE INDEX IF NOT EXISTS idx_exercise_hash 
ON public.exercise_explanations_cache(exercise_hash);

-- Add comment for documentation
COMMENT ON COLUMN public.exercise_explanations_cache.correct_answer IS 
'Extracted correct answer from the currentExercise section for quick reference';