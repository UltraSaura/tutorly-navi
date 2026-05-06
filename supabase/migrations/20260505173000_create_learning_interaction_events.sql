CREATE TABLE IF NOT EXISTS public.learning_interaction_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  event_name text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_learning_interaction_events_user_created
  ON public.learning_interaction_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_interaction_events_event_created
  ON public.learning_interaction_events(event_name, created_at DESC);

ALTER TABLE public.learning_interaction_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their learning interaction events"
  ON public.learning_interaction_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their learning interaction events"
  ON public.learning_interaction_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all learning interaction events"
  ON public.learning_interaction_events
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
