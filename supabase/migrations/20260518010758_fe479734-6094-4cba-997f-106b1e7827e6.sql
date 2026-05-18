
-- 1. Tighten exercise_explanations_cache UPDATE policy (was using/check true)
DROP POLICY IF EXISTS "Authenticated can update exercise explanations cache" ON public.exercise_explanations_cache;
CREATE POLICY "Admins can update exercise explanations cache"
ON public.exercise_explanations_cache
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Also tighten INSERT (was with check true). Keep open to authenticated since edge functions populate cache,
-- but additionally allow the broad insert. Edge functions use service_role and bypass RLS anyway.
DROP POLICY IF EXISTS "Authenticated can insert exercise explanations cache" ON public.exercise_explanations_cache;
CREATE POLICY "Admins can insert exercise explanations cache"
ON public.exercise_explanations_cache
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Restrict admin_audit_log inserts to admins only
DROP POLICY IF EXISTS "Authenticated can insert audit logs" ON public.admin_audit_log;
CREATE POLICY "Admins can insert audit logs"
ON public.admin_audit_log
FOR INSERT
TO authenticated
WITH CHECK (admin_id = auth.uid() AND public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Restrict parent_child inserts; legacy table — lock to admin only
DROP POLICY IF EXISTS "Parents can manage their parent-child relationships" ON public.parent_child;
CREATE POLICY "Admins can manage parent_child"
ON public.parent_child
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 4. Fix mutable search_path on trigger function
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

-- 5. Lock down create_vault_secret SECURITY DEFINER function — should not be callable by clients
REVOKE EXECUTE ON FUNCTION public.create_vault_secret(text, text) FROM PUBLIC, anon, authenticated;
