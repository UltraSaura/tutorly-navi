-- Add language column to learning_videos
ALTER TABLE learning_videos 
ADD COLUMN language text DEFAULT 'en';

-- Add language column to video_quizzes
ALTER TABLE video_quizzes 
ADD COLUMN language text DEFAULT 'en';