
-- Step 1: Normalize subjects
DO $$
BEGIN
  IF to_regclass('public.subjects') IS NOT NULL THEN
    UPDATE public.subjects SET slug = 'physics' WHERE slug = 'Physics';
  END IF;

  -- Step 2: Wipe curriculum content tables (preserves subjects, topics, videos, lessons)
  -- Order: children first (FK dependencies)
  IF to_regclass('public.tasks') IS NOT NULL THEN
    TRUNCATE TABLE public.tasks CASCADE;
  END IF;
  IF to_regclass('public.success_criteria') IS NOT NULL THEN
    TRUNCATE TABLE public.success_criteria CASCADE;
  END IF;
  IF to_regclass('public.topic_objective_links') IS NOT NULL THEN
    TRUNCATE TABLE public.topic_objective_links CASCADE;
  END IF;
  IF to_regclass('public.objectives') IS NOT NULL THEN
    TRUNCATE TABLE public.objectives CASCADE;
  END IF;
  IF to_regclass('public.subdomains') IS NOT NULL THEN
    TRUNCATE TABLE public.subdomains RESTART IDENTITY CASCADE;
  END IF;
  IF to_regclass('public.domains') IS NOT NULL THEN
    TRUNCATE TABLE public.domains CASCADE;
  END IF;

  -- Clear curriculum FKs on topics so they get rewired by the new import
  IF to_regclass('public.topics') IS NOT NULL THEN
    UPDATE public.topics SET
      curriculum_subject_id = NULL,
      curriculum_domain_id = NULL,
      curriculum_subdomain_id = NULL,
      curriculum_subject_id_uuid = NULL,
      curriculum_domain_id_uuid = NULL,
      curriculum_subdomain_id_uuid = NULL;
  END IF;

  -- Clear stale UUID FKs on objective_mastery / lesson_sessions
  IF to_regclass('public.objective_mastery') IS NOT NULL THEN
    UPDATE public.objective_mastery SET objective_id_uuid = NULL;
  END IF;
  IF to_regclass('public.lesson_sessions') IS NOT NULL THEN
    UPDATE public.lesson_sessions SET lesson_id_uuid = NULL;
  END IF;
END $$;
