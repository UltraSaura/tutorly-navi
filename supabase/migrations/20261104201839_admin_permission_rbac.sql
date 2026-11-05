-- Additive administrator RBAC.
-- Legacy `admin` remains a full-access compatibility role until administrators
-- are explicitly reassigned during a later activation step.

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'content_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'curriculum_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

CREATE TABLE IF NOT EXISTS public.admin_permissions (
  capability text PRIMARY KEY,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_role_permissions (
  role_name text NOT NULL,
  capability text NOT NULL REFERENCES public.admin_permissions(capability) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role_name, capability),
  CONSTRAINT admin_role_permissions_role_check CHECK (role_name IN ('content_manager', 'curriculum_manager', 'super_admin'))
);

ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_role_permissions ENABLE ROW LEVEL SECURITY;

INSERT INTO public.admin_permissions (capability, description) VALUES
  ('content.read', 'Read pedagogical content and quizzes'),
  ('content.write', 'Create and edit pedagogical content and quizzes'),
  ('content.publish', 'Publish pedagogical content'),
  ('annales.read', 'Read imported examination papers and exercises'),
  ('annales.write', 'Import and edit examination papers and exercises'),
  ('subjects.read', 'Read learning-platform subjects'),
  ('subjects.write', 'Create and edit learning-platform subjects'),
  ('curriculum.read', 'Read curriculum structure and objectives'),
  ('curriculum.write', 'Import and edit curriculum structure and objectives'),
  ('users.manage', 'Manage user accounts and approvals'),
  ('roles.manage', 'Assign and revoke administrator roles'),
  ('ai.manage', 'Manage AI providers, models, and keys'),
  ('prompts.manage', 'Manage system prompt templates'),
  ('system.manage', 'Manage system settings and diagnostics')
ON CONFLICT (capability) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO public.admin_role_permissions (role_name, capability)
SELECT role_name, capability
FROM (VALUES
  ('content_manager', 'content.read'), ('content_manager', 'content.write'), ('content_manager', 'content.publish'),
  ('content_manager', 'annales.read'), ('content_manager', 'annales.write'),
  ('content_manager', 'subjects.read'), ('content_manager', 'subjects.write'),
  ('curriculum_manager', 'curriculum.read'), ('curriculum_manager', 'curriculum.write'),
  ('super_admin', 'content.read'), ('super_admin', 'content.write'), ('super_admin', 'content.publish'),
  ('super_admin', 'annales.read'), ('super_admin', 'annales.write'),
  ('super_admin', 'subjects.read'), ('super_admin', 'subjects.write'),
  ('super_admin', 'curriculum.read'), ('super_admin', 'curriculum.write'),
  ('super_admin', 'users.manage'), ('super_admin', 'roles.manage'), ('super_admin', 'ai.manage'),
  ('super_admin', 'prompts.manage'), ('super_admin', 'system.manage')
) AS seeded(role_name, capability)
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT (NOT family_private.is_family() OR family_private.parent_unlocked())
    AND EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.user_id = _user_id AND r.role::text IN ('admin', 'super_admin')
    );
$$;

CREATE OR REPLACE FUNCTION public.has_admin_permission(_user_id uuid, _capability text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT (NOT family_private.is_family() OR family_private.parent_unlocked())
    AND (
      EXISTS (
        SELECT 1 FROM public.user_roles r
        WHERE r.user_id = _user_id AND r.role::text IN ('admin', 'super_admin')
      )
      OR EXISTS (
        SELECT 1
        FROM public.user_roles r
        JOIN public.admin_role_permissions rp ON rp.role_name = r.role::text
        WHERE r.user_id = _user_id AND rp.capability = _capability
      )
    );
$$;

REVOKE ALL ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.has_admin_permission(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_admin_permission(uuid, text) TO authenticated;

CREATE POLICY admin_permissions_read
  ON public.admin_permissions FOR SELECT TO authenticated
  USING (public.has_admin_permission(auth.uid(), 'system.manage'));

CREATE POLICY admin_role_permissions_read
  ON public.admin_role_permissions FOR SELECT TO authenticated
  USING (public.has_admin_permission(auth.uid(), 'system.manage'));

DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY administrator_role_managers_can_manage
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_admin_permission(auth.uid(), 'roles.manage'))
  WITH CHECK (public.has_admin_permission(auth.uid(), 'roles.manage'));

CREATE OR REPLACE FUNCTION public.prevent_unsafe_admin_role_change()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  actor uuid := auth.uid();
  effective_admin_count integer;
  removing_effective_admin boolean := false;
BEGIN
  -- Leave teacher/learner role changes on their existing path. This trigger
  -- protects only administrator roles and must not block normal onboarding.
  IF (TG_OP = 'INSERT' AND NEW.role::text NOT IN ('admin', 'content_manager', 'curriculum_manager', 'super_admin'))
     OR (TG_OP = 'DELETE' AND OLD.role::text NOT IN ('admin', 'content_manager', 'curriculum_manager', 'super_admin'))
     OR (TG_OP = 'UPDATE'
         AND OLD.role::text NOT IN ('admin', 'content_manager', 'curriculum_manager', 'super_admin')
         AND NEW.role::text NOT IN ('admin', 'content_manager', 'curriculum_manager', 'super_admin')) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF actor IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF NOT public.has_admin_permission(actor, 'roles.manage') THEN
    RAISE EXCEPTION 'Only a Super Admin can change administrator roles' USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'DELETE' THEN
    removing_effective_admin := OLD.role::text IN ('admin', 'super_admin');
  ELSIF TG_OP = 'UPDATE' THEN
    removing_effective_admin := OLD.role::text IN ('admin', 'super_admin')
      AND NEW.role::text NOT IN ('admin', 'super_admin');
  END IF;

  IF removing_effective_admin THEN
    SELECT count(DISTINCT user_id)::integer INTO effective_admin_count
    FROM public.user_roles
    WHERE role::text IN ('admin', 'super_admin')
      AND user_id <> OLD.user_id;
    IF effective_admin_count < 1 THEN
      RAISE EXCEPTION 'The last Super Admin cannot be removed' USING ERRCODE = '23514';
    END IF;
  END IF;

  INSERT INTO public.admin_audit_log (admin_id, action, target_table, target_id, details)
  VALUES (
    actor,
    CASE TG_OP WHEN 'INSERT' THEN 'administrator_role_granted' WHEN 'UPDATE' THEN 'administrator_role_changed' ELSE 'administrator_role_revoked' END,
    'user_roles',
    COALESCE(NEW.user_id, OLD.user_id),
    jsonb_build_object('previous_role', CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.role::text END,
                       'new_role', CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE NEW.role::text END)
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS protect_admin_role_changes ON public.user_roles;
CREATE TRIGGER protect_admin_role_changes
  BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_unsafe_admin_role_change();

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
  IF _role IS NOT NULL AND _role NOT IN ('content_manager', 'curriculum_manager', 'super_admin') THEN
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

CREATE OR REPLACE FUNCTION public.admin_list_accounts()
RETURNS TABLE (user_id uuid, email text, first_name text, last_name text, roles text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT u.id, u.email, u.first_name, u.last_name,
    COALESCE(array_agg(ur.role::text ORDER BY ur.role::text) FILTER (WHERE ur.role::text IN ('admin', 'content_manager', 'curriculum_manager', 'super_admin')), ARRAY[]::text[])
  FROM public.users u
  LEFT JOIN public.user_roles ur ON ur.user_id = u.id
  WHERE public.has_admin_permission(auth.uid(), 'roles.manage')
  GROUP BY u.id, u.email, u.first_name, u.last_name
  HAVING count(ur.role) FILTER (WHERE ur.role::text IN ('admin', 'content_manager', 'curriculum_manager', 'super_admin')) > 0
  ORDER BY u.email;
$$;

REVOKE ALL ON FUNCTION public.admin_list_accounts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_accounts() TO authenticated;

-- Publishing is a distinct capability: content managers may publish validated
-- lesson versions, while curriculum managers must not be able to do so.
CREATE OR REPLACE FUNCTION public.publish_topic_lesson_version(
  p_version_id uuid,
  p_topic_id uuid,
  p_confirm boolean DEFAULT false
)
RETURNS public.topic_lesson_versions
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, auth
AS $$
DECLARE
  version_row public.topic_lesson_versions;
  published_row public.topic_lesson_versions;
BEGIN
  IF NOT p_confirm THEN
    RAISE EXCEPTION 'Explicit confirmation is required to publish a lesson version' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_admin_permission(auth.uid(), 'content.publish') THEN
    RAISE EXCEPTION 'Only administrators with content publishing permission can publish lesson versions' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO version_row
  FROM public.topic_lesson_versions
  WHERE id = p_version_id
    AND topic_id = p_topic_id
    AND status = 'validated'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only a validated version for the intended topic can be published' USING ERRCODE = '23514';
  END IF;

  UPDATE public.topics
  SET lesson_content = version_row.lesson_content,
      updated_at = now()
  WHERE id = p_topic_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target topic was not found or is not writable' USING ERRCODE = '42501';
  END IF;

  UPDATE public.topic_lesson_versions
  SET status = 'published',
      published_at = now(),
      published_by = auth.uid(),
      updated_at = now()
  WHERE id = p_version_id
  RETURNING * INTO published_row;

  RETURN published_row;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_topic_lesson_version(uuid, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_topic_lesson_version(uuid, uuid, boolean) TO authenticated;

-- Additive write policies. Existing legacy-admin policies remain in place,
-- preserving every current administrator's access during rollout.
DO $$
DECLARE
  table_name text;
  table_names text[] := ARRAY[
    'subjects', 'learning_categories', 'topics', 'videos', 'video_quizzes',
    'quiz_banks', 'quiz_bank_questions', 'quiz_bank_assignments',
    'topic_lesson_versions'
  ];
BEGIN
  FOREACH table_name IN ARRAY table_names LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format('CREATE POLICY admin_content_write_%I ON public.%I FOR ALL TO authenticated USING (public.has_admin_permission(auth.uid(), ''content.write'')) WITH CHECK (public.has_admin_permission(auth.uid(), ''content.write''))', table_name, table_name);
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE
  table_name text;
  table_names text[] := ARRAY['domains', 'subdomains', 'objectives', 'success_criteria', 'tasks', 'units', 'lessons', 'curriculum_editions', 'curriculum_sources'];
BEGIN
  FOREACH table_name IN ARRAY table_names LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format('CREATE POLICY admin_curriculum_write_%I ON public.%I FOR ALL TO authenticated USING (public.has_admin_permission(auth.uid(), ''curriculum.write'')) WITH CHECK (public.has_admin_permission(auth.uid(), ''curriculum.write''))', table_name, table_name);
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE
  table_name text;
  table_names text[] := ARRAY['exam_papers', 'exam_exercises', 'exam_assets', 'exam_question_corrections', 'exam_training_items', 'training_item_answers'];
BEGIN
  FOREACH table_name IN ARRAY table_names LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format('CREATE POLICY admin_annales_write_%I ON public.%I FOR ALL TO authenticated USING (public.has_admin_permission(auth.uid(), ''annales.write'')) WITH CHECK (public.has_admin_permission(auth.uid(), ''annales.write''))', table_name, table_name);
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE
  table_name text;
  table_names text[] := ARRAY['ai_models', 'ai_model_providers', 'ai_model_keys', 'prompt_templates', 'subject_prompt_assignments', 'app_feature_flags'];
BEGIN
  FOREACH table_name IN ARRAY table_names LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format('CREATE POLICY admin_system_write_%I ON public.%I FOR ALL TO authenticated USING (public.has_admin_permission(auth.uid(), ''system.manage'')) WITH CHECK (public.has_admin_permission(auth.uid(), ''system.manage''))', table_name, table_name);
    END IF;
  END LOOP;
END $$;

CREATE POLICY admin_users_manage
  ON public.users FOR ALL TO authenticated
  USING (public.has_admin_permission(auth.uid(), 'users.manage'))
  WITH CHECK (public.has_admin_permission(auth.uid(), 'users.manage'));

CREATE POLICY admin_audit_read
  ON public.admin_audit_log FOR SELECT TO authenticated
  USING (public.has_admin_permission(auth.uid(), 'roles.manage'));
