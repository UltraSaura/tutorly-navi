DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'users'
  )
  AND EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'learning_topics'
  )
  AND EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'update_updated_at_column'
  ) THEN
    CREATE TABLE IF NOT EXISTS public.quiz_banks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      time_limit_sec INTEGER,
      shuffle BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS public.quiz_bank_questions (
      id TEXT PRIMARY KEY,
      bank_id TEXT NOT NULL REFERENCES public.quiz_banks(id) ON DELETE CASCADE,
      payload JSONB NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS public.quiz_bank_assignments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bank_id TEXT NOT NULL REFERENCES public.quiz_banks(id) ON DELETE CASCADE,
      topic_id UUID REFERENCES public.learning_topics(id) ON DELETE CASCADE,
      trigger_after_n_videos INTEGER,
      video_ids TEXT[],
      min_completed_in_set INTEGER,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      CONSTRAINT chk_assignment CHECK (
        (topic_id IS NOT NULL AND trigger_after_n_videos IS NOT NULL) OR
        (video_ids IS NOT NULL AND min_completed_in_set IS NOT NULL)
      )
    );

    CREATE TABLE IF NOT EXISTS public.quiz_bank_attempts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bank_id TEXT NOT NULL REFERENCES public.quiz_banks(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      score INTEGER NOT NULL,
      max_score INTEGER NOT NULL,
      took_seconds INTEGER,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_quiz_bank_questions_bank_id ON public.quiz_bank_questions(bank_id);
    CREATE INDEX IF NOT EXISTS idx_quiz_bank_assignments_topic_id ON public.quiz_bank_assignments(topic_id);
    CREATE INDEX IF NOT EXISTS idx_quiz_bank_assignments_active ON public.quiz_bank_assignments(is_active);
    CREATE INDEX IF NOT EXISTS idx_quiz_bank_attempts_user_bank ON public.quiz_bank_attempts(user_id, bank_id);

    DROP TRIGGER IF EXISTS trg_quiz_banks_updated_at ON public.quiz_banks;
    CREATE TRIGGER trg_quiz_banks_updated_at
    BEFORE UPDATE ON public.quiz_banks
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

    DROP TRIGGER IF EXISTS trg_quiz_bank_questions_updated_at ON public.quiz_bank_questions;
    CREATE TRIGGER trg_quiz_bank_questions_updated_at
    BEFORE UPDATE ON public.quiz_bank_questions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

    DROP TRIGGER IF EXISTS trg_quiz_bank_assignments_updated_at ON public.quiz_bank_assignments;
    CREATE TRIGGER trg_quiz_bank_assignments_updated_at
    BEFORE UPDATE ON public.quiz_bank_assignments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

    ALTER TABLE public.quiz_banks ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.quiz_bank_questions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.quiz_bank_assignments ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.quiz_bank_attempts ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Public can read quiz banks" ON public.quiz_banks;
    CREATE POLICY "Public can read quiz banks" ON public.quiz_banks FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Public can read quiz bank questions" ON public.quiz_bank_questions;
    CREATE POLICY "Public can read quiz bank questions" ON public.quiz_bank_questions FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Public can read quiz bank assignments" ON public.quiz_bank_assignments;
    CREATE POLICY "Public can read quiz bank assignments" ON public.quiz_bank_assignments FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Users can read own attempts" ON public.quiz_bank_attempts;
    CREATE POLICY "Users can read own attempts" ON public.quiz_bank_attempts FOR SELECT USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can insert own attempts" ON public.quiz_bank_attempts;
    CREATE POLICY "Users can insert own attempts" ON public.quiz_bank_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
