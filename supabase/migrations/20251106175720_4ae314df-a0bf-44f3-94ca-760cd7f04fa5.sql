DO $$
BEGIN
  -- min_age column
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'learning_videos'
      AND column_name = 'min_age'
  ) THEN
    ALTER TABLE public.learning_videos
      ADD COLUMN min_age integer;
  END IF;

  -- max_age column
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'learning_videos'
      AND column_name = 'max_age'
  ) THEN
    ALTER TABLE public.learning_videos
      ADD COLUMN max_age integer;
  END IF;

  -- school_levels column
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'learning_videos'
      AND column_name = 'school_levels'
  ) THEN
    ALTER TABLE public.learning_videos
      ADD COLUMN school_levels text[] DEFAULT ARRAY[]::text[];
  END IF;
END $$;