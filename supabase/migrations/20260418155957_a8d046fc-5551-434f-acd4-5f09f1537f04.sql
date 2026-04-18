-- ============================================================
-- PHASE 1: Additive UUID columns on curriculum tables
-- No data loss. No breaking changes. App keeps working.
-- ============================================================

-- domains: no id today, add one
ALTER TABLE public.domains
  ADD COLUMN IF NOT EXISTS id uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS subject_id uuid,
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS label text;

UPDATE public.domains SET code = COALESCE(code, domain), label = COALESCE(label, domain);

-- subdomains: id is bigint, add uuid id_new + uuid FKs
ALTER TABLE public.subdomains
  ADD COLUMN IF NOT EXISTS id_new uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS subject_id uuid,
  ADD COLUMN IF NOT EXISTS domain_id_new uuid,
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS label text;

UPDATE public.subdomains SET code = COALESCE(code, subdomain), label = COALESCE(label, subdomain);

-- objectives: text PK -> add uuid id_new and uuid FK columns
ALTER TABLE public.objectives
  ADD COLUMN IF NOT EXISTS id_new uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS subject_id_uuid uuid,
  ADD COLUMN IF NOT EXISTS domain_id_uuid uuid,
  ADD COLUMN IF NOT EXISTS subdomain_id_uuid uuid;

-- success_criteria
ALTER TABLE public.success_criteria
  ADD COLUMN IF NOT EXISTS id_new uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS objective_id_uuid uuid,
  ADD COLUMN IF NOT EXISTS subject_id_uuid uuid,
  ADD COLUMN IF NOT EXISTS domain_id_uuid uuid,
  ADD COLUMN IF NOT EXISTS subdomain_id_uuid uuid;

-- tasks
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS id_new uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS success_criterion_id_uuid uuid,
  ADD COLUMN IF NOT EXISTS subject_id_uuid uuid,
  ADD COLUMN IF NOT EXISTS domain_id_uuid uuid,
  ADD COLUMN IF NOT EXISTS subdomain_id_uuid uuid;

-- topics: curriculum_*_id are text today, add uuid versions
ALTER TABLE public.topics
  ADD COLUMN IF NOT EXISTS curriculum_subject_id_uuid uuid,
  ADD COLUMN IF NOT EXISTS curriculum_domain_id_uuid uuid,
  ADD COLUMN IF NOT EXISTS curriculum_subdomain_id_uuid uuid;

-- topic_objective_links
ALTER TABLE public.topic_objective_links
  ADD COLUMN IF NOT EXISTS objective_id_uuid uuid;

-- lessons: text PK + invalid unit_id, add uuid id_new + uuid topic_id
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS id_new uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS topic_id uuid;

-- videos: subject_id is text, add uuid version
ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS subject_id_uuid uuid;

-- objective_mastery: objective_id text, add uuid version
ALTER TABLE public.objective_mastery
  ADD COLUMN IF NOT EXISTS objective_id_uuid uuid;

-- lesson_sessions: lesson_id text, add uuid version
ALTER TABLE public.lesson_sessions
  ADD COLUMN IF NOT EXISTS lesson_id_uuid uuid;

-- Helpful indexes for the upcoming backfill
CREATE INDEX IF NOT EXISTS idx_domains_code ON public.domains(code);
CREATE INDEX IF NOT EXISTS idx_subdomains_code ON public.subdomains(code);
CREATE INDEX IF NOT EXISTS idx_subjects_slug ON public.subjects(slug);
