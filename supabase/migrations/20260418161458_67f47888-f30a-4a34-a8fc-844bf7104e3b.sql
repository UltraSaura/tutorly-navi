
-- Step 1: Normalize subjects
UPDATE public.subjects SET slug = 'physics' WHERE slug = 'Physics';

-- Step 2: Wipe curriculum content tables (preserves subjects, topics, videos, lessons)
-- Order: children first (FK dependencies)
TRUNCATE TABLE public.tasks CASCADE;
TRUNCATE TABLE public.success_criteria CASCADE;
TRUNCATE TABLE public.topic_objective_links CASCADE;
TRUNCATE TABLE public.objectives CASCADE;
TRUNCATE TABLE public.subdomains RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.domains CASCADE;

-- Clear curriculum FKs on topics so they get rewired by the new import
UPDATE public.topics SET
  curriculum_subject_id = NULL,
  curriculum_domain_id = NULL,
  curriculum_subdomain_id = NULL,
  curriculum_subject_id_uuid = NULL,
  curriculum_domain_id_uuid = NULL,
  curriculum_subdomain_id_uuid = NULL;

-- Clear stale UUID FKs on objective_mastery / lesson_sessions (objectives & lessons rows are gone or being rewired)
UPDATE public.objective_mastery SET objective_id_uuid = NULL;
UPDATE public.lesson_sessions SET lesson_id_uuid = NULL;
