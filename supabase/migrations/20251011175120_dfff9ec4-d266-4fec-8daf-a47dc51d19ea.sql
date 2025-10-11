-- Phase 1.4: Enhanced Explanations for Parents

-- Add columns to track explanation visibility
ALTER TABLE public.exercise_history
ADD COLUMN IF NOT EXISTS show_correct_answer_to_child boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS explanation_generated_at timestamp with time zone;

-- Create explanations cache table (for parent view)
CREATE TABLE IF NOT EXISTS public.explanations_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.exercise_attempts(id) ON DELETE CASCADE,
  steps_json jsonb NOT NULL,
  correct_answer text NOT NULL,
  tips_for_parent text,
  generated_at timestamp with time zone DEFAULT now(),
  UNIQUE(attempt_id)
);

-- Enable RLS
ALTER TABLE public.explanations_cache ENABLE ROW LEVEL SECURITY;

-- Parents can view explanations for their children's attempts
CREATE POLICY "Guardians can view children explanations"
ON public.explanations_cache FOR SELECT
USING (
  attempt_id IN (
    SELECT ea.id 
    FROM public.exercise_attempts ea
    INNER JOIN public.exercise_history eh ON eh.id = ea.exercise_history_id
    INNER JOIN public.children c ON c.user_id = eh.user_id
    INNER JOIN public.guardian_child_links gcl ON gcl.child_id = c.id
    INNER JOIN public.guardians g ON g.id = gcl.guardian_id
    WHERE g.user_id = auth.uid()
  )
);

-- System can create explanations
CREATE POLICY "System can create explanations"
ON public.explanations_cache FOR INSERT
WITH CHECK (true);

-- Admins can view all explanations
CREATE POLICY "Admins can view all explanations"
ON public.explanations_cache FOR SELECT
USING (has_role(auth.uid(), 'admin'));