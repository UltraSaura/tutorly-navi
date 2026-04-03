-- Add topic_id to exercise_history to link exercises to learning topics
ALTER TABLE exercise_history 
ADD COLUMN topic_id uuid REFERENCES learning_topics(id);

-- Add index for better query performance
CREATE INDEX idx_exercise_history_topic_id 
ON exercise_history(topic_id);

-- Add comment explaining the column
COMMENT ON COLUMN exercise_history.topic_id IS 'Links the exercise to a specific learning topic for "View Full Lesson" navigation';