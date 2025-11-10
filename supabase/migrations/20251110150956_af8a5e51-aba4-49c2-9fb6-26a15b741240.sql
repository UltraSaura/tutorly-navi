-- Add tags column to learning_videos table for homework matching
ALTER TABLE learning_videos 
ADD COLUMN tags text[] DEFAULT ARRAY[]::text[];