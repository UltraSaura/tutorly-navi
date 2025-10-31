-- Create learning tables with proper structure
CREATE TABLE IF NOT EXISTS public.learning_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  icon_name text NOT NULL,
  color_scheme text NOT NULL,
  order_index int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.learning_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.learning_subjects(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  icon_name text NOT NULL,
  description text,
  order_index int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.learning_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.learning_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  video_count int NOT NULL DEFAULT 0,
  quiz_count int NOT NULL DEFAULT 0,
  estimated_duration_minutes int NOT NULL DEFAULT 0,
  order_index int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.learning_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES public.learning_topics(id) ON DELETE CASCADE,
  title text NOT NULL,
  video_url text NOT NULL,
  thumbnail_url text,
  duration_minutes int NOT NULL DEFAULT 0,
  xp_reward int NOT NULL DEFAULT 0,
  description text,
  transcript text,
  order_index int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.video_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.learning_videos(id) ON DELETE CASCADE,
  question text NOT NULL,
  question_latex text,
  options text[] NOT NULL,
  correct_answer_index int NOT NULL,
  explanation text NOT NULL,
  timestamp_seconds int NOT NULL DEFAULT 0,
  xp_reward int NOT NULL DEFAULT 0,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_learning_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.learning_subjects(id) ON DELETE SET NULL,
  category_id uuid REFERENCES public.learning_categories(id) ON DELETE SET NULL,
  topic_id uuid REFERENCES public.learning_topics(id) ON DELETE SET NULL,
  video_id uuid REFERENCES public.learning_videos(id) ON DELETE SET NULL,
  progress_type text NOT NULL CHECK (progress_type IN ('video_started','video_completed','quiz_attempted','quiz_passed')),
  progress_percentage int NOT NULL DEFAULT 0,
  quiz_score int,
  time_spent_seconds int NOT NULL DEFAULT 0,
  last_watched_position_seconds int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_video UNIQUE (user_id, video_id)
);

-- Create triggers for updated_at
CREATE TRIGGER trg_subjects_updated_at
BEFORE UPDATE ON public.learning_subjects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_categories_updated_at
BEFORE UPDATE ON public.learning_categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_topics_updated_at
BEFORE UPDATE ON public.learning_topics
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_videos_updated_at
BEFORE UPDATE ON public.learning_videos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_quizzes_updated_at
BEFORE UPDATE ON public.video_quizzes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_progress_updated_at
BEFORE UPDATE ON public.user_learning_progress
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_categories_subject ON public.learning_categories(subject_id);
CREATE INDEX IF NOT EXISTS idx_topics_category ON public.learning_topics(category_id);
CREATE INDEX IF NOT EXISTS idx_videos_topic ON public.learning_videos(topic_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_video ON public.video_quizzes(video_id);
CREATE INDEX IF NOT EXISTS idx_progress_user ON public.user_learning_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_video ON public.user_learning_progress(video_id);

-- Enable RLS
ALTER TABLE public.learning_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_learning_progress ENABLE ROW LEVEL SECURITY;

-- Public read policies for content tables (no PII)
CREATE POLICY "Public can read subjects"
ON public.learning_subjects FOR SELECT
USING (true);

CREATE POLICY "Public can read categories"
ON public.learning_categories FOR SELECT
USING (true);

CREATE POLICY "Public can read topics"
ON public.learning_topics FOR SELECT
USING (true);

CREATE POLICY "Public can read videos"
ON public.learning_videos FOR SELECT
USING (true);

CREATE POLICY "Public can read video quizzes"
ON public.video_quizzes FOR SELECT
USING (true);

-- RLS for progress
CREATE POLICY "Users can read own progress"
ON public.user_learning_progress FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
ON public.user_learning_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
ON public.user_learning_progress FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Seed sample data
WITH s AS (
  INSERT INTO public.learning_subjects (name, slug, icon_name, color_scheme, order_index, is_active)
  VALUES ('Mathematics','mathematics','calculator','blue',1,true)
  RETURNING id
), c AS (
  INSERT INTO public.learning_categories (subject_id, name, slug, icon_name, description, order_index, is_active)
  SELECT id, 'Algebra','algebra','sigma','Foundations of algebra',1,true FROM s
  RETURNING id
), t AS (
  INSERT INTO public.learning_topics (category_id, name, slug, description, video_count, quiz_count, estimated_duration_minutes, order_index, is_active)
  SELECT id, 'Linear Equations','linear-equations','Basics of linear equations',1,1,10,1,true FROM c
  RETURNING id
), v AS (
  INSERT INTO public.learning_videos (topic_id, title, video_url, duration_minutes, xp_reward, order_index, is_active)
  SELECT id, 'What is a linear equation?','https://www.youtube.com/watch?v=5ANZw2FEVBc',10,50,1,true FROM t
  RETURNING id
)
INSERT INTO public.video_quizzes (video_id, question, options, correct_answer_index, explanation, timestamp_seconds, xp_reward, order_index)
SELECT id,
       'What is the solution of 2x + 3 = 7?',
       array['x = 1','x = 2','x = 3','x = 4'],
       1,
       '2x + 3 = 7 => 2x = 4 => x = 2',
       60,
       30,
       1
FROM v;