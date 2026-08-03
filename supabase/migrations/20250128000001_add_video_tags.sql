DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'learning_videos'
  ) THEN
    ALTER TABLE public.learning_videos
    ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

    CREATE INDEX IF NOT EXISTS idx_videos_tags
    ON public.learning_videos USING GIN(tags);

    COMMENT ON COLUMN public.learning_videos.tags IS 'Array of tags/keywords for this video (e.g., ["fractions", "addition", "algebra", "simplify"])';
  END IF;
END $$;
