
-- 1. Tighten exercise_explanations_cache UPDATE policy (was using/check true)
DO $$
BEGIN
  IF to_regclass('public.exercise_explanations_cache') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Authenticated can update exercise explanations cache" ON public.exercise_explanations_cache;
    DROP POLICY IF EXISTS "Admins can update exercise explanations cache" ON public.exercise_explanations_cache;
    CREATE POLICY "Admins can update exercise explanations cache"
    ON public.exercise_explanations_cache
    FOR UPDATE
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

    DROP POLICY IF EXISTS "Authenticated can insert exercise explanations cache" ON public.exercise_explanations_cache;
    DROP POLICY IF EXISTS "Admins can insert exercise explanations cache" ON public.exercise_explanations_cache;
    CREATE POLICY "Admins can insert exercise explanations cache"
    ON public.exercise_explanations_cache
    FOR INSERT
    TO authenticated
    WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;

  IF to_regclass('public.admin_audit_log') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Authenticated can insert audit logs" ON public.admin_audit_log;
    DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_log;
    CREATE POLICY "Admins can insert audit logs"
    ON public.admin_audit_log
    FOR INSERT
    TO authenticated
    WITH CHECK (admin_id = auth.uid() AND public.has_role(auth.uid(), 'admin'::app_role));
  END IF;

  IF to_regclass('public.parent_child') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Parents can manage their parent-child relationships" ON public.parent_child;
    DROP POLICY IF EXISTS "Admins can manage parent_child" ON public.parent_child;
    CREATE POLICY "Admins can manage parent_child"
    ON public.parent_child
    FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;

  CREATE OR REPLACE FUNCTION public.update_app_feature_flags_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
  AS $function$
  BEGIN
    NEW.updated_at = now();
    RETURN NEW;
  END;
  $function$;

  IF to_regprocedure('public.create_vault_secret(text, text)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.create_vault_secret(text, text) FROM PUBLIC, anon, authenticated;
  END IF;
END $$;
