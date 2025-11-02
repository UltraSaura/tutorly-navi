-- Add age range columns to learning_videos
ALTER TABLE public.learning_videos 
ADD COLUMN IF NOT EXISTS min_age INTEGER,
ADD COLUMN IF NOT EXISTS max_age INTEGER,
ADD COLUMN IF NOT EXISTS school_levels TEXT[] DEFAULT '{}';

-- Add age range columns to video_quizzes  
ALTER TABLE public.video_quizzes
ADD COLUMN IF NOT EXISTS min_age INTEGER,
ADD COLUMN IF NOT EXISTS max_age INTEGER,
ADD COLUMN IF NOT EXISTS school_levels TEXT[] DEFAULT '{}';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_videos_age_range 
ON public.learning_videos(min_age, max_age);

CREATE INDEX IF NOT EXISTS idx_videos_school_levels 
ON public.learning_videos USING GIN(school_levels);

CREATE INDEX IF NOT EXISTS idx_quizzes_age_range 
ON public.video_quizzes(min_age, max_age);

CREATE INDEX IF NOT EXISTS idx_quizzes_school_levels 
ON public.video_quizzes USING GIN(school_levels);

-- Add comments
COMMENT ON COLUMN public.learning_videos.min_age IS 'Minimum age for this video (inclusive)';
COMMENT ON COLUMN public.learning_videos.max_age IS 'Maximum age for this video (inclusive)';
COMMENT ON COLUMN public.learning_videos.school_levels IS 'Array of school level codes this video is suitable for (e.g., ["grade_1", "grade_2", "year_1"])';
COMMENT ON COLUMN public.video_quizzes.min_age IS 'Minimum age for this quiz (inclusive)';
COMMENT ON COLUMN public.video_quizzes.max_age IS 'Maximum age for this quiz (inclusive)';
COMMENT ON COLUMN public.video_quizzes.school_levels IS 'Array of school level codes this quiz is suitable for';
