-- Create quiz banks table
CREATE TABLE IF NOT EXISTS public.quiz_banks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  time_limit_sec INTEGER,
  shuffle BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create quiz bank questions table
CREATE TABLE IF NOT EXISTS public.quiz_bank_questions (
  id TEXT PRIMARY KEY,
  bank_id TEXT NOT NULL REFERENCES public.quiz_banks(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create quiz bank assignments table (controls when "Test yourself" appears)
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

-- Create quiz bank attempts table
CREATE TABLE IF NOT EXISTS public.quiz_bank_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id TEXT NOT NULL REFERENCES public.quiz_banks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  took_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_quiz_bank_questions_bank_id ON public.quiz_bank_questions(bank_id);
CREATE INDEX IF NOT EXISTS idx_quiz_bank_assignments_topic_id ON public.quiz_bank_assignments(topic_id);
CREATE INDEX IF NOT EXISTS idx_quiz_bank_assignments_active ON public.quiz_bank_assignments(is_active);
CREATE INDEX IF NOT EXISTS idx_quiz_bank_attempts_user_bank ON public.quiz_bank_attempts(user_id, bank_id);

-- Create triggers for updated_at
CREATE TRIGGER trg_quiz_banks_updated_at
BEFORE UPDATE ON public.quiz_banks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_quiz_bank_questions_updated_at
BEFORE UPDATE ON public.quiz_bank_questions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_quiz_bank_assignments_updated_at
BEFORE UPDATE ON public.quiz_bank_assignments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.quiz_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_bank_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_bank_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_bank_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Public can read quiz banks
CREATE POLICY "Public can read quiz banks" ON public.quiz_banks FOR SELECT USING (true);

-- Public can read quiz bank questions
CREATE POLICY "Public can read quiz bank questions" ON public.quiz_bank_questions FOR SELECT USING (true);

-- Public can read quiz bank assignments
CREATE POLICY "Public can read quiz bank assignments" ON public.quiz_bank_assignments FOR SELECT USING (true);

-- Users can read own attempts
CREATE POLICY "Users can read own attempts" ON public.quiz_bank_attempts FOR SELECT USING (auth.uid() = user_id);

-- Users can insert own attempts
CREATE POLICY "Users can insert own attempts" ON public.quiz_bank_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);

