-- Add age and school level filtering columns to learning_videos table
ALTER TABLE public.learning_videos
ADD COLUMN min_age integer,
ADD COLUMN max_age integer,
ADD COLUMN school_levels text[] DEFAULT ARRAY[]::text[];