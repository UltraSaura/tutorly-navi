-- Create exercise_history table for personal user history
CREATE TABLE IF NOT EXISTS public.exercise_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  exercise_content TEXT NOT NULL,
  user_answer TEXT,
  is_correct BOOLEAN,
  subject_id TEXT,
  attempts_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create exercise_explanations_cache table for shared canonical explanations
CREATE TABLE IF NOT EXISTS public.exercise_explanations_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exercise_hash TEXT NOT NULL UNIQUE,
  exercise_content TEXT NOT NULL,
  subject_id TEXT,
  explanation_data JSONB NOT NULL,
  quality_score INTEGER DEFAULT 0,
  usage_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create exercise_attempts table for detailed attempt tracking
CREATE TABLE IF NOT EXISTS public.exercise_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exercise_history_id UUID NOT NULL,
  user_answer TEXT NOT NULL,
  is_correct BOOLEAN,
  explanation_id UUID,
  attempt_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  FOREIGN KEY (exercise_history_id) REFERENCES public.exercise_history(id) ON DELETE CASCADE,
  FOREIGN KEY (explanation_id) REFERENCES public.exercise_explanations_cache(id) ON DELETE SET NULL
);

-- Enable Row Level Security
ALTER TABLE public.exercise_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_explanations_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for exercise_history
DROP POLICY IF EXISTS "Users can view their own exercise history" ON public.exercise_history;
CREATE POLICY "Users can view their own exercise history" 
ON public.exercise_history 
FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own exercise history" ON public.exercise_history;
CREATE POLICY "Users can create their own exercise history" 
ON public.exercise_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own exercise history" ON public.exercise_history;
CREATE POLICY "Users can update their own exercise history" 
ON public.exercise_history 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for exercise_explanations_cache (shared read, admin write)
DROP POLICY IF EXISTS "Users can view exercise explanations cache" ON public.exercise_explanations_cache;
CREATE POLICY "Users can view exercise explanations cache" 
ON public.exercise_explanations_cache 
FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "System can create exercise explanations cache" ON public.exercise_explanations_cache;
CREATE POLICY "System can create exercise explanations cache" 
ON public.exercise_explanations_cache 
FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "System can update exercise explanations cache" ON public.exercise_explanations_cache;
CREATE POLICY "System can update exercise explanations cache" 
ON public.exercise_explanations_cache 
FOR UPDATE 
USING (true);

-- RLS Policies for exercise_attempts
DROP POLICY IF EXISTS "Users can view their own exercise attempts" ON public.exercise_attempts;
CREATE POLICY "Users can view their own exercise attempts" 
ON public.exercise_attempts 
FOR SELECT 
USING (auth.uid() = (SELECT user_id FROM public.exercise_history WHERE id = exercise_history_id));

DROP POLICY IF EXISTS "Users can create their own exercise attempts" ON public.exercise_attempts;
CREATE POLICY "Users can create their own exercise attempts" 
ON public.exercise_attempts 
FOR INSERT 
WITH CHECK (auth.uid() = (SELECT user_id FROM public.exercise_history WHERE id = exercise_history_id));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_exercise_history_user_id ON public.exercise_history(user_id);
CREATE INDEX IF NOT EXISTS idx_exercise_history_created_at ON public.exercise_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exercise_explanations_cache_hash ON public.exercise_explanations_cache(exercise_hash);
CREATE INDEX IF NOT EXISTS idx_exercise_explanations_cache_usage ON public.exercise_explanations_cache(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_exercise_attempts_history_id ON public.exercise_attempts(exercise_history_id);

-- Create triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_exercise_history_updated_at ON public.exercise_history;
CREATE TRIGGER update_exercise_history_updated_at
BEFORE UPDATE ON public.exercise_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_exercise_explanations_cache_updated_at ON public.exercise_explanations_cache;
CREATE TRIGGER update_exercise_explanations_cache_updated_at
BEFORE UPDATE ON public.exercise_explanations_cache
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();