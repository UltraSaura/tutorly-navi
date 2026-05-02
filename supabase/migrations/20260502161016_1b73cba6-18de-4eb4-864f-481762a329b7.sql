
-- Remove overly permissive ALL policy on lesson_sessions
DROP POLICY IF EXISTS "System can manage sessions" ON public.lesson_sessions;

-- Add scoped write policies for children managing their own sessions
CREATE POLICY "Children can insert own sessions"
ON public.lesson_sessions
FOR INSERT
TO authenticated
WITH CHECK (child_id IN (SELECT id FROM public.children WHERE user_id = auth.uid()));

CREATE POLICY "Children can update own sessions"
ON public.lesson_sessions
FOR UPDATE
TO authenticated
USING (child_id IN (SELECT id FROM public.children WHERE user_id = auth.uid()))
WITH CHECK (child_id IN (SELECT id FROM public.children WHERE user_id = auth.uid()));

CREATE POLICY "Children can delete own sessions"
ON public.lesson_sessions
FOR DELETE
TO authenticated
USING (child_id IN (SELECT id FROM public.children WHERE user_id = auth.uid()));

-- Fix mutable search_path on functions
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.enforce_single_model_function() SET search_path = public;
ALTER FUNCTION public.get_model_with_fallback() SET search_path = public;

-- Make view use invoker's permissions instead of definer
ALTER VIEW public.configured_models SET (security_invoker = true);
