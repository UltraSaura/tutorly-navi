CREATE TABLE IF NOT EXISTS public.learning_interaction_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  event_name text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
DECLARE
  has_user_id boolean;
  has_event_name boolean;
BEGIN
  IF to_regclass('public.learning_interaction_events') IS NULL THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'learning_interaction_events'
      AND column_name = 'user_id'
  ) INTO has_user_id;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'learning_interaction_events'
      AND column_name = 'event_name'
  ) INTO has_event_name;

  IF has_user_id THEN
    CREATE INDEX IF NOT EXISTS idx_learning_interaction_events_user_created
      ON public.learning_interaction_events(user_id, created_at DESC);
  END IF;

  IF has_event_name THEN
    CREATE INDEX IF NOT EXISTS idx_learning_interaction_events_event_created
      ON public.learning_interaction_events(event_name, created_at DESC);
  END IF;

  ALTER TABLE public.learning_interaction_events ENABLE ROW LEVEL SECURITY;

  IF has_user_id THEN
    DROP POLICY IF EXISTS "Users can insert their learning interaction events" ON public.learning_interaction_events;
    CREATE POLICY "Users can insert their learning interaction events"
      ON public.learning_interaction_events
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can read their learning interaction events" ON public.learning_interaction_events;
    CREATE POLICY "Users can read their learning interaction events"
      ON public.learning_interaction_events
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  DROP POLICY IF EXISTS "Admins can read all learning interaction events" ON public.learning_interaction_events;
  CREATE POLICY "Admins can read all learning interaction events"
    ON public.learning_interaction_events
    FOR SELECT
    TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role));
END $$;
