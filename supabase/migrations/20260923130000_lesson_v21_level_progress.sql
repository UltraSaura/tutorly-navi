CREATE TABLE IF NOT EXISTS public.topic_lesson_level_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES public.learning_topics(id) ON DELETE CASCADE,
  level_id text NOT NULL,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('locked','in_progress','remediation','mastered')),
  score numeric CHECK (score >= 0 AND score <= 1),
  attempts integer NOT NULL DEFAULT 0,
  sequence_position integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  mastered_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, topic_id, level_id)
);
ALTER TABLE public.topic_lesson_level_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own V21 level progress" ON public.topic_lesson_level_progress
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_v21_level_progress_topic ON public.topic_lesson_level_progress(user_id, topic_id);
