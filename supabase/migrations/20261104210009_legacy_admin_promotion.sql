-- Restore the legacy full-administrator workflow while keeping the existing
-- protected role-management RPC and audit/last-admin safeguards.
CREATE OR REPLACE FUNCTION public.admin_set_role(_target_user uuid, _role text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_admin_permission(auth.uid(), 'roles.manage') THEN
    RAISE EXCEPTION 'Only a Super Admin can assign administrator roles' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _target_user) THEN
    RAISE EXCEPTION 'Target user does not exist' USING ERRCODE = '23503';
  END IF;
  IF _role IS NOT NULL AND _role NOT IN ('admin', 'content_manager', 'curriculum_manager', 'super_admin') THEN
    RAISE EXCEPTION 'Unsupported administrator role' USING ERRCODE = '22P02';
  END IF;

  DELETE FROM public.user_roles
  WHERE user_id = _target_user
    AND role::text IN ('admin', 'content_manager', 'curriculum_manager', 'super_admin');

  IF _role IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role, created_by)
    VALUES (_target_user, _role::public.app_role, auth.uid());
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_role(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_role(uuid, text) TO authenticated;
