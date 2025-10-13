-- Add time tracking to exercise attempts and history
ALTER TABLE exercise_attempts 
ADD COLUMN IF NOT EXISTS time_spent_seconds INTEGER DEFAULT 0;

ALTER TABLE exercise_history 
ADD COLUMN IF NOT EXISTS time_spent_seconds INTEGER DEFAULT 0;

-- Add explanation image support
ALTER TABLE exercise_explanations_cache 
ADD COLUMN IF NOT EXISTS explanation_image_url TEXT;