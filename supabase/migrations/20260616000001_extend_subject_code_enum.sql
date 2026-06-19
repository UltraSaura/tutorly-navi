-- Extend the subject_code enum with all French primary curriculum subjects.
-- This allows curriculum_edition rows to be created for any subject taught in cycle 2 / cycle 3.

ALTER TYPE subject_code ADD VALUE IF NOT EXISTS 'histoire';
ALTER TYPE subject_code ADD VALUE IF NOT EXISTS 'geographie';
ALTER TYPE subject_code ADD VALUE IF NOT EXISTS 'sciences';
ALTER TYPE subject_code ADD VALUE IF NOT EXISTS 'emc';
ALTER TYPE subject_code ADD VALUE IF NOT EXISTS 'arts_plastiques';
ALTER TYPE subject_code ADD VALUE IF NOT EXISTS 'education_musicale';
ALTER TYPE subject_code ADD VALUE IF NOT EXISTS 'eps';
ALTER TYPE subject_code ADD VALUE IF NOT EXISTS 'langues_vivantes';
ALTER TYPE subject_code ADD VALUE IF NOT EXISTS 'technologie';

-- Add a direct FK from curriculum_edition to the subjects table so the
-- ingest function can resolve subject_id without a slug-mapping lookup.
ALTER TABLE public.curriculum_edition
  ADD COLUMN IF NOT EXISTS subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL;

-- Back-fill for the two subjects already seeded.
UPDATE public.curriculum_edition ce
SET subject_id = s.id
FROM public.subjects s
WHERE (ce.subject = 'francais' AND s.slug = 'francais')
   OR (ce.subject = 'mathematiques' AND s.slug = 'mathematiques');

-- Add a job_queue table so Hermes can track ingest jobs without needing pg_cron.
CREATE TABLE IF NOT EXISTS public.hermes_jobs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id   uuid NOT NULL REFERENCES public.curriculum_edition(id) ON DELETE CASCADE,
  status       text NOT NULL DEFAULT 'pending'  CHECK (status IN ('pending','running','done','failed')),
  started_at   timestamptz,
  finished_at  timestamptz,
  error        text,
  stats        jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS hermes_jobs_edition_pending_idx
  ON public.hermes_jobs (edition_id)
  WHERE status IN ('pending', 'running');

-- RLS: only service role can read/write
ALTER TABLE public.hermes_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.hermes_jobs
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
