DO $$
BEGIN
  IF to_regclass('public.objectives') IS NOT NULL THEN
    ALTER TABLE public.objectives
      ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

    CREATE INDEX IF NOT EXISTS idx_objectives_subject_created
      ON public.objectives (subject_id_uuid, created_at DESC);
  END IF;

  IF to_regclass('public.success_criteria') IS NOT NULL THEN
    ALTER TABLE public.success_criteria
      ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
  END IF;

  IF to_regclass('public.tasks') IS NOT NULL THEN
    ALTER TABLE public.tasks
      ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
  END IF;

  IF to_regclass('public.lessons') IS NOT NULL THEN
    ALTER TABLE public.lessons
      ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;
