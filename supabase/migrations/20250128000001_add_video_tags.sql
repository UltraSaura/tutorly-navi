-- Add tags column to learning_videos
ALTER TABLE public.learning_videos 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Create index for tag search (using GIN for array searches)
CREATE INDEX IF NOT EXISTS idx_videos_tags 
ON public.learning_videos USING GIN(tags);

-- Add comment
COMMENT ON COLUMN public.learning_videos.tags IS 'Array of tags/keywords for this video (e.g., ["fractions", "addition", "algebra", "simplify"])';
