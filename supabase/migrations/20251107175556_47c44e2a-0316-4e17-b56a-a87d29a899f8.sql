-- Create quiz banks tables

-- Main quiz banks table
CREATE TABLE IF NOT EXISTS public.quiz_banks (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text,
  time_limit_sec integer DEFAULT 0,
  shuffle boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Quiz bank questions table
CREATE TABLE IF NOT EXISTS public.quiz_bank_questions (
  id text PRIMARY KEY,
  bank_id text NOT NULL REFERENCES public.quiz_banks(id) ON DELETE CASCADE,
  payload jsonb NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Quiz bank assignments table
CREATE TABLE IF NOT EXISTS public.quiz_bank_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id text NOT NULL REFERENCES public.quiz_banks(id) ON DELETE CASCADE,
  topic_id text,
  trigger_after_n_videos integer,
  video_ids text[],
  min_completed_in_set integer,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT valid_trigger CHECK (
    (topic_id IS NOT NULL AND trigger_after_n_videos IS NOT NULL) OR
    (video_ids IS NOT NULL AND min_completed_in_set IS NOT NULL)
  )
);

-- Quiz bank attempts table
CREATE TABLE IF NOT EXISTS public.quiz_bank_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id text NOT NULL REFERENCES public.quiz_banks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  score integer NOT NULL,
  max_score integer NOT NULL,
  took_seconds integer,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quiz_bank_questions_bank_id ON public.quiz_bank_questions(bank_id);
CREATE INDEX IF NOT EXISTS idx_quiz_bank_questions_position ON public.quiz_bank_questions(bank_id, position);
CREATE INDEX IF NOT EXISTS idx_quiz_bank_assignments_bank_id ON public.quiz_bank_assignments(bank_id);
CREATE INDEX IF NOT EXISTS idx_quiz_bank_assignments_topic_id ON public.quiz_bank_assignments(topic_id);
CREATE INDEX IF NOT EXISTS idx_quiz_bank_attempts_bank_id ON public.quiz_bank_attempts(bank_id);
CREATE INDEX IF NOT EXISTS idx_quiz_bank_attempts_user_id ON public.quiz_bank_attempts(user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_quiz_banks_updated_at
  BEFORE UPDATE ON public.quiz_banks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quiz_bank_questions_updated_at
  BEFORE UPDATE ON public.quiz_bank_questions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quiz_bank_assignments_updated_at
  BEFORE UPDATE ON public.quiz_bank_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.quiz_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_bank_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_bank_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_bank_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quiz_banks
CREATE POLICY "Public can read quiz banks"
  ON public.quiz_banks
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage quiz banks"
  ON public.quiz_banks
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for quiz_bank_questions
CREATE POLICY "Public can read quiz bank questions"
  ON public.quiz_bank_questions
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage quiz bank questions"
  ON public.quiz_bank_questions
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for quiz_bank_assignments
CREATE POLICY "Public can read quiz bank assignments"
  ON public.quiz_bank_assignments
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage quiz bank assignments"
  ON public.quiz_bank_assignments
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for quiz_bank_attempts
CREATE POLICY "Users can view their own attempts"
  ON public.quiz_bank_attempts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own attempts"
  ON public.quiz_bank_attempts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all attempts"
  ON public.quiz_bank_attempts
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Guardians can view children attempts"
  ON public.quiz_bank_attempts
  FOR SELECT
  USING (
    user_id IN (
      SELECT c.user_id
      FROM children c
      JOIN guardian_child_links gcl ON gcl.child_id = c.id
      JOIN guardians g ON g.id = gcl.guardian_id
      WHERE g.user_id = auth.uid()
    )
  );