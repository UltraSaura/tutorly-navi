-- Add lesson_content JSONB column to learning_topics
ALTER TABLE public.learning_topics 
ADD COLUMN lesson_content JSONB DEFAULT NULL;

-- Add index for efficient JSON queries
CREATE INDEX idx_learning_topics_lesson_content 
ON public.learning_topics USING GIN (lesson_content);

-- Comment
COMMENT ON COLUMN public.learning_topics.lesson_content IS 
'Auto-generated lesson content including explanation, example, common mistakes, and selected tasks';

-- Example structure:
-- {
--   "explanation": "Student-friendly concept explanation",
--   "example": "Worked example with step-by-step solution",
--   "common_mistakes": ["Mistake 1", "Mistake 2", "Mistake 3"],
--   "guided_practice": ["task-id-1", "task-id-2", "task-id-3"],
--   "exit_ticket": ["task-id-4", "task-id-5"],
--   "generated_at": "2024-01-15T10:30:00Z",
--   "generated_by_model": "openai/gpt-4"
-- }