-- Change time_spent_seconds and last_watched_position_seconds from integer to numeric
-- This allows storing decimal values for precise video timestamps

ALTER TABLE user_learning_progress 
ALTER COLUMN time_spent_seconds TYPE NUMERIC(10,3);

ALTER TABLE user_learning_progress 
ALTER COLUMN last_watched_position_seconds TYPE NUMERIC(10,3);