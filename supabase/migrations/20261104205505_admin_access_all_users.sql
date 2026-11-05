-- Allow authorized administrators to promote any existing user from the
-- Admin page. This is additive: it does not assign or change any role.
CREATE OR REPLACE FUNCTION public.admin_list_accounts()
RETURNS TABLE (user_id uuid, email text, first_name text, last_name text, roles text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT u.id, u.email, u.first_name, u.last_name,
    COALESCE(array_agg(ur.role::text ORDER BY ur.role::text)
      FILTER (WHERE ur.role::text IN ('admin', 'content_manager', 'curriculum_manager', 'super_admin')), ARRAY[]::text[])
  FROM public.users u
  LEFT JOIN public.user_roles ur ON ur.user_id = u.id
  WHERE public.has_admin_permission(auth.uid(), 'roles.manage')
  GROUP BY u.id, u.email, u.first_name, u.last_name
  ORDER BY COALESCE(u.email, u.first_name, u.last_name, u.id::text);
$$;

REVOKE ALL ON FUNCTION public.admin_list_accounts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_accounts() TO authenticated;
