DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'objectives'
  ) THEN
    ALTER TABLE public.objectives
    ADD COLUMN IF NOT EXISTS subject_id TEXT,
    ADD COLUMN IF NOT EXISTS domain_id TEXT,
    ADD COLUMN IF NOT EXISTS subdomain_id TEXT,
    ADD COLUMN IF NOT EXISTS skill_id TEXT;

    CREATE INDEX IF NOT EXISTS idx_objectives_subject ON public.objectives(subject_id);
    CREATE INDEX IF NOT EXISTS idx_objectives_domain ON public.objectives(domain_id);
    CREATE INDEX IF NOT EXISTS idx_objectives_subdomain ON public.objectives(subdomain_id);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'success_criteria'
  ) THEN
    ALTER TABLE public.success_criteria
    ADD COLUMN IF NOT EXISTS subject_id TEXT,
    ADD COLUMN IF NOT EXISTS domain_id TEXT,
    ADD COLUMN IF NOT EXISTS subdomain_id TEXT,
    ADD COLUMN IF NOT EXISTS skill_id TEXT;

    CREATE INDEX IF NOT EXISTS idx_success_criteria_subject ON public.success_criteria(subject_id);
    CREATE INDEX IF NOT EXISTS idx_success_criteria_domain ON public.success_criteria(domain_id);
    CREATE INDEX IF NOT EXISTS idx_success_criteria_subdomain ON public.success_criteria(subdomain_id);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'tasks'
  ) THEN
    ALTER TABLE public.tasks
    ADD COLUMN IF NOT EXISTS subject_id TEXT,
    ADD COLUMN IF NOT EXISTS domain_id TEXT,
    ADD COLUMN IF NOT EXISTS subdomain_id TEXT,
    ADD COLUMN IF NOT EXISTS skill_id TEXT;

    CREATE INDEX IF NOT EXISTS idx_tasks_subject ON public.tasks(subject_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_domain ON public.tasks(domain_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_subdomain ON public.tasks(subdomain_id);
  END IF;
END $$;
