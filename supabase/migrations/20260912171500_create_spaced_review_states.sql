CREATE TABLE IF NOT EXISTS public.spaced_review_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  subject_id text NOT NULL,
  concept_id text NOT NULL,
  objective_id text,
  stage integer NOT NULL DEFAULT 0 CHECK (stage >= 0 AND stage <= 4),
  next_review_at timestamptz NOT NULL,
  last_reviewed_at timestamptz,
  last_result_correct boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, subject_id, concept_id)
);

ALTER TABLE public.spaced_review_states ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_spaced_review_states_student_due
  ON public.spaced_review_states(student_id, next_review_at ASC);

CREATE INDEX IF NOT EXISTS idx_spaced_review_states_student_subject
  ON public.spaced_review_states(student_id, subject_id);

DROP POLICY IF EXISTS "Students can view own spaced review states" ON public.spaced_review_states;
CREATE POLICY "Students can view own spaced review states"
  ON public.spaced_review_states FOR SELECT
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can insert own spaced review states" ON public.spaced_review_states;
CREATE POLICY "Students can insert own spaced review states"
  ON public.spaced_review_states FOR INSERT
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can update own spaced review states" ON public.spaced_review_states;
CREATE POLICY "Students can update own spaced review states"
  ON public.spaced_review_states FOR UPDATE
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Admins can view spaced review states" ON public.spaced_review_states;
CREATE POLICY "Admins can view spaced review states"
  ON public.spaced_review_states FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

COMMENT ON TABLE public.spaced_review_states IS
  'Durable 1/3/7/14/30-day spaced-review scheduling state for mastered concepts.';
