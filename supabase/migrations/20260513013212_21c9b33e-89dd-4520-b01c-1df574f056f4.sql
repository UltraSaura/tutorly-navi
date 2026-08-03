
-- student_mastery: drop overly-permissive ALL policy
DO $$
BEGIN
  IF to_regclass('public.student_mastery') IS NOT NULL THEN
    DROP POLICY IF EXISTS "System can manage mastery" ON public.student_mastery;
  END IF;

  IF to_regclass('public.delegation_tokens') IS NOT NULL
     AND to_regclass('public.guardians') IS NOT NULL THEN
    DROP POLICY IF EXISTS "System can update delegation tokens" ON public.delegation_tokens;
    DROP POLICY IF EXISTS "Guardians can update their delegation tokens" ON public.delegation_tokens;
    CREATE POLICY "Guardians can update their delegation tokens"
    ON public.delegation_tokens
    FOR UPDATE
    TO authenticated
    USING (guardian_id IN (SELECT id FROM public.guardians WHERE user_id = auth.uid()))
    WITH CHECK (guardian_id IN (SELECT id FROM public.guardians WHERE user_id = auth.uid()));
  END IF;

  IF to_regclass('public.curriculum_task_attempts') IS NOT NULL
     AND to_regclass('public.children') IS NOT NULL
     AND to_regclass('public.guardian_child_links') IS NOT NULL
     AND to_regclass('public.guardians') IS NOT NULL THEN
    DROP POLICY IF EXISTS "System can insert attempts" ON public.curriculum_task_attempts;
    DROP POLICY IF EXISTS "Authenticated can insert own attempts" ON public.curriculum_task_attempts;
    CREATE POLICY "Authenticated can insert own attempts"
    ON public.curriculum_task_attempts
    FOR INSERT
    TO authenticated
    WITH CHECK (
      child_id IN (SELECT id FROM public.children WHERE user_id = auth.uid())
      OR child_id IN (
        SELECT gcl.child_id FROM public.guardian_child_links gcl
        JOIN public.guardians g ON g.id = gcl.guardian_id
        WHERE g.user_id = auth.uid()
      )
      OR public.has_role(auth.uid(), 'admin'::app_role)
    );
  END IF;

  IF to_regclass('public.exercise_explanations_cache') IS NOT NULL THEN
    DROP POLICY IF EXISTS "System can create exercise explanations cache" ON public.exercise_explanations_cache;
    DROP POLICY IF EXISTS "System can update exercise explanations cache" ON public.exercise_explanations_cache;
    DROP POLICY IF EXISTS "Authenticated can insert exercise explanations cache" ON public.exercise_explanations_cache;
    DROP POLICY IF EXISTS "Authenticated can update exercise explanations cache" ON public.exercise_explanations_cache;
    CREATE POLICY "Authenticated can insert exercise explanations cache"
    ON public.exercise_explanations_cache
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
    CREATE POLICY "Authenticated can update exercise explanations cache"
    ON public.exercise_explanations_cache
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);
  END IF;

  IF to_regclass('public.admin_audit_log') IS NOT NULL THEN
    DROP POLICY IF EXISTS "System can insert audit logs" ON public.admin_audit_log;
    DROP POLICY IF EXISTS "Authenticated can insert audit logs" ON public.admin_audit_log;
    CREATE POLICY "Authenticated can insert audit logs"
    ON public.admin_audit_log
    FOR INSERT
    TO authenticated
    WITH CHECK (admin_id = auth.uid());
  END IF;

  IF to_regclass('public.children') IS NOT NULL
     AND to_regclass('public.guardians') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Guardians can insert children" ON public.children;
    DROP POLICY IF EXISTS "Users can insert own child profile" ON public.children;
    CREATE POLICY "Users can insert own child profile"
    ON public.children
    FOR INSERT
    TO authenticated
    WITH CHECK (
      user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.guardians g WHERE g.user_id = auth.uid())
    );
  END IF;
END $$;
