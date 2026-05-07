CREATE TABLE IF NOT EXISTS public.learning_interaction_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  event_type text NOT NULL,
  learning_style_used text CHECK (learning_style_used IS NULL OR learning_style_used IN ('visual', 'auditory', 'kinesthetic', 'mixed')),
  support_type text CHECK (support_type IS NULL OR support_type IN ('visual', 'auditory', 'kinesthetic', 'mixed')),
  practice_style text CHECK (practice_style IS NULL OR practice_style IN ('visual', 'auditory', 'kinesthetic', 'mixed')),
  subject text,
  concept text,
  skill_tag text,
  topic_id uuid,
  objective_id uuid,
  quiz_id text,
  question_id text,
  question_kind text CHECK (question_kind IS NULL OR question_kind IN ('single', 'multi', 'numeric', 'ordering', 'visual', 'multiple_choice', 'short_answer')),
  visual_subtype text,
  difficulty text,
  was_correct boolean,
  attempt_number integer CHECK (attempt_number IS NULL OR attempt_number > 0),
  hint_used boolean,
  time_to_answer_ms integer CHECK (time_to_answer_ms IS NULL OR time_to_answer_ms >= 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.learning_interaction_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_learning_interaction_events_student_created
  ON public.learning_interaction_events(student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_interaction_events_event_type
  ON public.learning_interaction_events(event_type);

CREATE INDEX IF NOT EXISTS idx_learning_interaction_events_skill
  ON public.learning_interaction_events(student_id, subject, skill_tag, concept);

DROP POLICY IF EXISTS "Students can insert own learning interaction events"
  ON public.learning_interaction_events;
CREATE POLICY "Students can insert own learning interaction events"
  ON public.learning_interaction_events
  FOR INSERT
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can view own learning interaction events"
  ON public.learning_interaction_events;
CREATE POLICY "Students can view own learning interaction events"
  ON public.learning_interaction_events
  FOR SELECT
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Admins can view learning interaction events"
  ON public.learning_interaction_events;
CREATE POLICY "Admins can view learning interaction events"
  ON public.learning_interaction_events
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

COMMENT ON TABLE public.learning_interaction_events IS
  'Runtime learning analytics events for explanation supports, mini-practice, quizzes, remediation, and preference changes. Avoids storing prompts, raw AI responses, and full free-text answers.';
