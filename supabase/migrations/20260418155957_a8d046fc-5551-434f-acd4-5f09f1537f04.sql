-- ============================================================
-- PHASE 1: Additive UUID columns on curriculum tables
-- No data loss. No breaking changes. App keeps working.
-- ============================================================

DO $$
BEGIN
  IF to_regclass('public.domains') IS NOT NULL THEN
    ALTER TABLE public.domains
      ADD COLUMN IF NOT EXISTS id uuid NOT NULL DEFAULT gen_random_uuid(),
      ADD COLUMN IF NOT EXISTS subject_id uuid,
      ADD COLUMN IF NOT EXISTS code text,
      ADD COLUMN IF NOT EXISTS label text;

    UPDATE public.domains
    SET code = COALESCE(code, domain),
        label = COALESCE(label, domain);

    CREATE INDEX IF NOT EXISTS idx_domains_code ON public.domains(code);
  END IF;

  IF to_regclass('public.subdomains') IS NOT NULL THEN
    ALTER TABLE public.subdomains
      ADD COLUMN IF NOT EXISTS id_new uuid NOT NULL DEFAULT gen_random_uuid(),
      ADD COLUMN IF NOT EXISTS subject_id uuid,
      ADD COLUMN IF NOT EXISTS domain_id_new uuid,
      ADD COLUMN IF NOT EXISTS code text,
      ADD COLUMN IF NOT EXISTS label text;

    UPDATE public.subdomains
    SET code = COALESCE(code, subdomain),
        label = COALESCE(label, subdomain);

    CREATE INDEX IF NOT EXISTS idx_subdomains_code ON public.subdomains(code);
  END IF;

  IF to_regclass('public.objectives') IS NOT NULL THEN
    ALTER TABLE public.objectives
      ADD COLUMN IF NOT EXISTS id_new uuid NOT NULL DEFAULT gen_random_uuid(),
      ADD COLUMN IF NOT EXISTS subject_id_uuid uuid,
      ADD COLUMN IF NOT EXISTS domain_id_uuid uuid,
      ADD COLUMN IF NOT EXISTS subdomain_id_uuid uuid;
  END IF;

  IF to_regclass('public.success_criteria') IS NOT NULL THEN
    ALTER TABLE public.success_criteria
      ADD COLUMN IF NOT EXISTS id_new uuid NOT NULL DEFAULT gen_random_uuid(),
      ADD COLUMN IF NOT EXISTS objective_id_uuid uuid,
      ADD COLUMN IF NOT EXISTS subject_id_uuid uuid,
      ADD COLUMN IF NOT EXISTS domain_id_uuid uuid,
      ADD COLUMN IF NOT EXISTS subdomain_id_uuid uuid;
  END IF;

  IF to_regclass('public.tasks') IS NOT NULL THEN
    ALTER TABLE public.tasks
      ADD COLUMN IF NOT EXISTS id_new uuid NOT NULL DEFAULT gen_random_uuid(),
      ADD COLUMN IF NOT EXISTS success_criterion_id_uuid uuid,
      ADD COLUMN IF NOT EXISTS subject_id_uuid uuid,
      ADD COLUMN IF NOT EXISTS domain_id_uuid uuid,
      ADD COLUMN IF NOT EXISTS subdomain_id_uuid uuid;
  END IF;

  IF to_regclass('public.topics') IS NOT NULL THEN
    ALTER TABLE public.topics
      ADD COLUMN IF NOT EXISTS curriculum_subject_id_uuid uuid,
      ADD COLUMN IF NOT EXISTS curriculum_domain_id_uuid uuid,
      ADD COLUMN IF NOT EXISTS curriculum_subdomain_id_uuid uuid;
  END IF;

  IF to_regclass('public.topic_objective_links') IS NOT NULL THEN
    ALTER TABLE public.topic_objective_links
      ADD COLUMN IF NOT EXISTS objective_id_uuid uuid;
  END IF;

  IF to_regclass('public.lessons') IS NOT NULL THEN
    ALTER TABLE public.lessons
      ADD COLUMN IF NOT EXISTS id_new uuid NOT NULL DEFAULT gen_random_uuid(),
      ADD COLUMN IF NOT EXISTS topic_id uuid;
  END IF;

  IF to_regclass('public.videos') IS NOT NULL THEN
    ALTER TABLE public.videos
      ADD COLUMN IF NOT EXISTS subject_id_uuid uuid;
  END IF;

  IF to_regclass('public.objective_mastery') IS NOT NULL THEN
    ALTER TABLE public.objective_mastery
      ADD COLUMN IF NOT EXISTS objective_id_uuid uuid;
  END IF;

  IF to_regclass('public.lesson_sessions') IS NOT NULL THEN
    ALTER TABLE public.lesson_sessions
      ADD COLUMN IF NOT EXISTS lesson_id_uuid uuid;
  END IF;

  IF to_regclass('public.subjects') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_subjects_slug ON public.subjects(slug);
  END IF;
END $$;
