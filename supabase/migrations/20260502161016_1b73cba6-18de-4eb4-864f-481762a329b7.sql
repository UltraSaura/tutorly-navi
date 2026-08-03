
DO $$
BEGIN
  IF to_regclass('public.lesson_sessions') IS NOT NULL
     AND to_regclass('public.children') IS NOT NULL THEN
    DROP POLICY IF EXISTS "System can manage sessions" ON public.lesson_sessions;

    DROP POLICY IF EXISTS "Children can insert own sessions" ON public.lesson_sessions;
    CREATE POLICY "Children can insert own sessions"
    ON public.lesson_sessions
    FOR INSERT
    TO authenticated
    WITH CHECK (child_id IN (SELECT id FROM public.children WHERE user_id = auth.uid()));

    DROP POLICY IF EXISTS "Children can update own sessions" ON public.lesson_sessions;
    CREATE POLICY "Children can update own sessions"
    ON public.lesson_sessions
    FOR UPDATE
    TO authenticated
    USING (child_id IN (SELECT id FROM public.children WHERE user_id = auth.uid()))
    WITH CHECK (child_id IN (SELECT id FROM public.children WHERE user_id = auth.uid()));

    DROP POLICY IF EXISTS "Children can delete own sessions" ON public.lesson_sessions;
    CREATE POLICY "Children can delete own sessions"
    ON public.lesson_sessions
    FOR DELETE
    TO authenticated
    USING (child_id IN (SELECT id FROM public.children WHERE user_id = auth.uid()));
  END IF;

  IF to_regprocedure('public.update_updated_at_column()') IS NOT NULL THEN
    ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
  END IF;
  IF to_regprocedure('public.enforce_single_model_function()') IS NOT NULL THEN
    ALTER FUNCTION public.enforce_single_model_function() SET search_path = public;
  END IF;
  IF to_regprocedure('public.get_model_with_fallback()') IS NOT NULL THEN
    ALTER FUNCTION public.get_model_with_fallback() SET search_path = public;
  END IF;

  IF to_regclass('public.configured_models') IS NOT NULL THEN
    ALTER VIEW public.configured_models SET (security_invoker = true);
  END IF;
END $$;
