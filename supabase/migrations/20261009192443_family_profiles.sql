-- Family mode uses existing users/children/guardian_child_links. No Auth impersonation.
BEGIN;
CREATE SCHEMA IF NOT EXISTS family_private;
REVOKE ALL ON SCHEMA family_private FROM PUBLIC, anon, authenticated;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Disabled by default. Only an operator may enroll an explicitly approved family.
CREATE TABLE family_private.rollout_accounts (
  account_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE family_private.rollout_accounts ENABLE ROW LEVEL SECURITY;
CREATE TABLE family_private.pins (
  account_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pin_hash text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE family_private.grants (
  account_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES auth.sessions(id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('parent', 'child')),
  child_id uuid REFERENCES public.children(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (account_id, session_id),
  CHECK ((mode = 'child') = (child_id IS NOT NULL))
);
CREATE TABLE family_private.attempts (
  account_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  purpose text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now(),
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (account_id, purpose)
);
REVOKE ALL ON ALL TABLES IN SCHEMA family_private FROM PUBLIC, anon, authenticated;

CREATE FUNCTION family_private.is_family(account uuid DEFAULT auth.uid()) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT account IS NOT NULL AND EXISTS (SELECT 1 FROM public.guardians g JOIN family_private.rollout_accounts r ON r.account_id = g.user_id WHERE g.user_id = account);
$$;
CREATE FUNCTION family_private.legacy_guardian() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT NOT family_private.is_family() AND EXISTS(SELECT 1 FROM public.guardians g WHERE g.user_id=auth.uid());
$$;
CREATE FUNCTION family_private.session_exists() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM auth.sessions s WHERE s.id = (auth.jwt()->>'session_id')::uuid AND s.user_id = auth.uid()
  );
$$;
CREATE FUNCTION family_private.session_live() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT family_private.session_exists() AND EXISTS(SELECT 1 FROM public.users u WHERE u.id=auth.uid() AND u.approval_status='approved');
$$;
CREATE FUNCTION family_private.owns_child(child uuid, account uuid DEFAULT auth.uid()) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.children c
    JOIN public.guardian_child_links l ON l.child_id = c.id
    JOIN public.guardians g ON g.id = l.guardian_id
    WHERE c.id = child AND g.user_id = account);
$$;
CREATE FUNCTION family_private.current_grant() RETURNS family_private.grants
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT g FROM family_private.grants g
  WHERE g.account_id = auth.uid() AND g.session_id = (auth.jwt()->>'session_id')::uuid
    AND g.expires_at > now() AND family_private.session_live()
    AND g.token_hash = encode(extensions.digest(
      COALESCE(NULLIF(current_setting('request.headers', true), '')::jsonb->>'x-family-grant', ''), 'sha256'), 'hex')
    AND (g.mode = 'parent' OR EXISTS (SELECT 1 FROM public.children c JOIN public.users u ON u.id = c.user_id
      WHERE c.id = g.child_id AND c.status = 'active'
        AND u.approval_status = 'approved' AND family_private.owns_child(c.id)));
$$;
CREATE FUNCTION family_private.parent_unlocked() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT COALESCE((family_private.current_grant()).mode = 'parent', false);
$$;
CREATE FUNCTION family_private.learner_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT CASE WHEN family_private.is_family() THEN
    (SELECT c.user_id FROM public.children c WHERE c.id = (family_private.current_grant()).child_id)
    ELSE CASE WHEN family_private.session_live() THEN auth.uid() END END;
$$;
CREATE FUNCTION family_private.child_learner(child uuid) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT COALESCE((SELECT c.user_id FROM public.children c WHERE c.id = child), child);
$$;
CREATE FUNCTION family_private.can_read_learner(learner uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT CASE WHEN family_private.is_family() THEN
    COALESCE(learner = family_private.learner_id(), false) OR (family_private.parent_unlocked() AND (
      learner = auth.uid()
      OR EXISTS (SELECT 1 FROM public.children c WHERE c.user_id = learner AND family_private.owns_child(c.id))
      OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role = 'admin')
      OR EXISTS (SELECT 1 FROM public.class_student_links l JOIN public.classes cl ON cl.id = l.class_id
        JOIN public.teachers t ON t.id = cl.teacher_id WHERE family_private.child_learner(l.student_id) = learner AND t.user_id = auth.uid())))
  ELSE family_private.session_live() AND ((family_private.legacy_guardian() AND EXISTS(SELECT 1 FROM public.children c WHERE c.user_id=learner AND family_private.owns_child(c.id))) OR learner = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role = 'admin')
    OR EXISTS (SELECT 1 FROM public.class_student_links l JOIN public.classes cl ON cl.id = l.class_id
      JOIN public.teachers t ON t.id = cl.teacher_id WHERE family_private.child_learner(l.student_id) = learner AND t.user_id = auth.uid())) END;
$$;
CREATE FUNCTION family_private.can_write_learner(learner uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT CASE WHEN family_private.is_family() THEN COALESCE(learner = family_private.learner_id(), false)
    OR (family_private.parent_unlocked() AND (
      learner = auth.uid()
      OR EXISTS (SELECT 1 FROM public.children c WHERE c.user_id = learner AND family_private.owns_child(c.id))
      OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role = 'admin')))
    ELSE family_private.session_live() AND ((family_private.legacy_guardian() AND EXISTS(SELECT 1 FROM public.children c WHERE c.user_id=learner AND family_private.owns_child(c.id))) OR learner = auth.uid()
      OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role = 'admin')) END;
$$;
CREATE FUNCTION family_private.spend_attempt(account uuid, use_for text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE n integer;
BEGIN
  INSERT INTO family_private.attempts(account_id, purpose, count) VALUES(account, use_for, 1)
  ON CONFLICT (account_id, purpose) DO UPDATE SET
    count = CASE WHEN family_private.attempts.window_start < now() - interval '15 minutes' THEN 1 ELSE family_private.attempts.count + 1 END,
    window_start = CASE WHEN family_private.attempts.window_start < now() - interval '15 minutes' THEN now() ELSE family_private.attempts.window_start END
  RETURNING count INTO n;
  RETURN n <= 5;
END;
$$;
CREATE FUNCTION family_private.issue_grant(kind text, child uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE secret text := encode(extensions.gen_random_bytes(32), 'hex'); expiry timestamptz;
BEGIN
  IF NOT family_private.is_family() OR NOT family_private.session_live() THEN RAISE EXCEPTION 'Not a family session' USING ERRCODE = '42501'; END IF;
  expiry := now() + CASE WHEN kind = 'parent' THEN interval '15 minutes' ELSE interval '8 hours' END;
  INSERT INTO family_private.grants(account_id, session_id, mode, child_id, token_hash, expires_at)
    VALUES(auth.uid(), (auth.jwt()->>'session_id')::uuid, kind, child, encode(extensions.digest(secret, 'sha256'), 'hex'), expiry)
  ON CONFLICT (account_id, session_id) DO UPDATE SET mode = EXCLUDED.mode, child_id = EXCLUDED.child_id,
    token_hash = EXCLUDED.token_hash, expires_at = EXCLUDED.expires_at;
  RETURN jsonb_build_object('token', secret, 'expiresAt', expiry);
END;
$$;

-- Auth approval checking and the chooser expose no parent details or learner records.
CREATE FUNCTION public.family_bootstrap() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT jsonb_build_object('isFamily', family_private.is_family(), 'isGuardian', EXISTS(SELECT 1 FROM public.guardians g WHERE g.user_id=auth.uid()), 'approvalStatus', u.approval_status,
    'pinConfigured', EXISTS(SELECT 1 FROM family_private.pins p WHERE p.account_id = auth.uid()))
    FROM public.users u WHERE u.id = auth.uid() AND family_private.session_exists();
$$;
CREATE FUNCTION public.family_profiles() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT family_private.is_family() OR NOT family_private.session_live() THEN RAISE EXCEPTION 'Not a family session' USING ERRCODE = '42501'; END IF;
  RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object('id', c.id, 'learnerId', c.user_id,
    'firstName', u.first_name, 'grade', c.grade, 'avatarUrl', a.raw_user_meta_data->>'avatar_url',
    'available', c.status = 'active' AND u.approval_status = 'approved') ORDER BY u.first_name)
    FROM public.children c JOIN public.users u ON u.id = c.user_id JOIN auth.users a ON a.id = u.id
    WHERE family_private.owns_child(c.id)), '[]'::jsonb);
END;
$$;
CREATE FUNCTION public.family_select_child(child uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT family_private.is_family() OR NOT family_private.session_live() OR NOT family_private.owns_child(child)
    OR NOT EXISTS(SELECT 1 FROM public.children c JOIN public.users u ON u.id = c.user_id
      WHERE c.id = child AND c.status = 'active' AND u.approval_status = 'approved') THEN
    RAISE EXCEPTION 'Child unavailable' USING ERRCODE = '42501';
  END IF;
  RETURN family_private.issue_grant('child', child);
END;
$$;
CREATE FUNCTION public.family_unlock_parent(pin text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE hashed text;
BEGIN
  IF NOT family_private.is_family() OR NOT family_private.session_live() THEN RAISE EXCEPTION 'Not a family session' USING ERRCODE = '42501'; END IF;
  -- Committed failure result, not an exception: failed attempts cannot roll back their limiter.
  IF NOT family_private.spend_attempt(auth.uid(), 'pin') THEN RETURN jsonb_build_object('error', 'rate_limited'); END IF;
  SELECT p.pin_hash INTO hashed FROM family_private.pins p WHERE p.account_id = auth.uid();
  IF pin !~ '^[0-9]{6}$' OR hashed IS NULL OR extensions.crypt(pin, hashed) IS DISTINCT FROM hashed THEN
    RETURN jsonb_build_object('error', 'invalid_pin');
  END IF;
  RETURN family_private.issue_grant('parent');
END;
$$;
CREATE FUNCTION public.family_lock() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  DELETE FROM family_private.grants WHERE account_id = auth.uid() AND session_id = (auth.jwt()->>'session_id')::uuid;
END;
$$;
CREATE FUNCTION public.family_current_profile() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE g family_private.grants; learner jsonb;
BEGIN
  g := family_private.current_grant();
  IF g.account_id IS NULL THEN RETURN NULL; END IF;
  IF g.mode = 'child' THEN
    SELECT to_jsonb(u) || jsonb_build_object('avatar_url', a.raw_user_meta_data->>'avatar_url') INTO learner
    FROM public.children c JOIN public.users u ON u.id = c.user_id JOIN auth.users a ON a.id = u.id WHERE c.id = g.child_id;
  END IF;
  RETURN jsonb_build_object('kind', g.mode, 'familyAccountId', auth.uid(), 'childId', g.child_id,
    'learner', learner, 'expiresAt', g.expires_at);
END;
$$;
CREATE FUNCTION public.family_current_learner() RETURNS uuid LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$ SELECT family_private.learner_id(); $$;
CREATE FUNCTION public.family_parent_authorized() RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$ SELECT family_private.parent_unlocked(); $$;

-- Only the password-reauthenticating Edge Function can call these service-only RPCs.
CREATE FUNCTION public.family_pin_reauth_attempt(account uuid, sid uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM auth.sessions s WHERE s.id = sid AND s.user_id = account) OR NOT family_private.is_family(account) THEN RETURN false; END IF;
  RETURN family_private.spend_attempt(account, 'password');
END;
$$;
CREATE FUNCTION public.family_set_pin(account uuid, sid uuid, new_pin text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF new_pin !~ '^[0-9]{6}$' OR NOT family_private.is_family(account)
    OR NOT EXISTS(SELECT 1 FROM auth.sessions s WHERE s.id = sid AND s.user_id = account) THEN RAISE EXCEPTION 'Invalid PIN setup' USING ERRCODE = '42501'; END IF;
  INSERT INTO family_private.pins(account_id, pin_hash) VALUES(account, extensions.crypt(new_pin, extensions.gen_salt('bf', 12)))
    ON CONFLICT(account_id) DO UPDATE SET pin_hash = EXCLUDED.pin_hash, updated_at = now();
  DELETE FROM family_private.grants WHERE account_id = account;
END;
$$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA family_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA family_private TO authenticated;
GRANT EXECUTE ON FUNCTION family_private.is_family(uuid), family_private.legacy_guardian(), family_private.session_live(), family_private.current_grant(),
  family_private.parent_unlocked(), family_private.learner_id(), family_private.can_read_learner(uuid),
  family_private.can_write_learner(uuid), family_private.child_learner(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.family_pin_reauth_attempt(uuid, uuid), public.family_set_pin(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.family_pin_reauth_attempt(uuid, uuid), public.family_set_pin(uuid, uuid, text) TO service_role;
DO $$ DECLARE f record; BEGIN
  FOR f IN SELECT oid::regprocedure AS signature FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname LIKE 'family_%'
    AND proname NOT IN ('family_pin_reauth_attempt', 'family_set_pin') LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', f.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f.signature);
  END LOOP;
END $$;

-- Keep the old cache and global hash uniqueness for un-enrolled old clients.
-- New clients use a separate private cache; do not guess owners of legacy data.
CREATE TABLE public.learner_explanations_cache (LIKE public.exercise_explanations_cache INCLUDING DEFAULTS);
ALTER TABLE public.learner_explanations_cache ADD PRIMARY KEY (id);
ALTER TABLE public.learner_explanations_cache ADD COLUMN learner_user_id uuid NOT NULL
  REFERENCES public.users(id) ON DELETE CASCADE DEFAULT family_private.learner_id();
CREATE UNIQUE INDEX family_learner_explanation_hash ON public.learner_explanations_cache(learner_user_id, exercise_hash);
ALTER TABLE public.learner_explanations_cache ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learner_explanations_cache TO authenticated;
CREATE POLICY learner_cache_read ON public.learner_explanations_cache FOR SELECT TO authenticated
  USING (family_private.can_read_learner(learner_user_id));
CREATE POLICY learner_cache_write ON public.learner_explanations_cache FOR ALL TO authenticated
  USING (family_private.can_write_learner(learner_user_id)) WITH CHECK (family_private.can_write_learner(learner_user_id));
-- Enrolled families cannot use the legacy unowned cache to bypass child isolation.
CREATE POLICY family_legacy_cache_lock ON public.exercise_explanations_cache AS RESTRICTIVE FOR ALL TO authenticated
  USING (NOT family_private.is_family()) WITH CHECK (NOT family_private.is_family());

-- Restrictive policies AND with existing policies. A normal family JWT cannot bypass the PIN.
-- Direct learner columns cover optional chat/points tables as well as current progress tables.
DO $$ DECLARE r record; col text; owner_expr text; BEGIN
  FOR r IN SELECT c.table_name, c.column_name FROM information_schema.columns c
    JOIN pg_class pc ON pc.oid = format('public.%I', c.table_name)::regclass AND pc.relkind IN ('r','p')
    WHERE c.table_schema = 'public' AND c.data_type = 'uuid' AND c.column_name IN ('user_id','student_id','child_id','learner_user_id')
    AND c.table_name NOT IN ('guardians','teachers','user_roles','guardian_child_links','delegation_tokens','parent_child','exercise_explanations_cache')
    ORDER BY c.table_name, CASE c.column_name WHEN 'user_id' THEN 0 WHEN 'student_id' THEN 1 ELSE 2 END
  LOOP
    -- A table may have multiple learner columns; one policy per column keeps every owner constrained.
    owner_expr := CASE WHEN r.column_name = 'child_id' THEN format('family_private.child_learner(%I)', r.column_name) ELSE format('%I', r.column_name) END;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false)', 'family_anon_'||r.column_name, r.table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated USING (family_private.can_read_learner(%s))', 'family_read_'||r.column_name, r.table_name, owner_expr);
    EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (family_private.can_read_learner(%s)) WITH CHECK (family_private.can_write_learner(%s))', 'family_scope_'||r.column_name, r.table_name, owner_expr, owner_expr);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (family_private.is_family() AND family_private.can_read_learner(%s))', 'family_allow_read_'||r.column_name, r.table_name, owner_expr);
    IF r.table_name IN ('exercise_history','learner_explanations_cache','user_learning_progress','objective_mastery','student_mastery','training_item_answers','lesson_sessions','curriculum_task_attempts','chat_messages') THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (family_private.is_family() AND family_private.can_write_learner(%s)) WITH CHECK (family_private.is_family() AND family_private.can_write_learner(%s))', 'family_allow_write_'||r.column_name, r.table_name, owner_expr, owner_expr);
    END IF;
    -- Preserve operation limits from hosted policies: attempts are append-only;
    -- spaced review allows inserts/updates, without adding a family delete grant.
    IF r.table_name IN ('quiz_bank_attempts','spaced_review_states') THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (family_private.is_family() AND family_private.can_write_learner(%s))', 'family_allow_insert_'||r.column_name, r.table_name, owner_expr);
    END IF;
    IF r.table_name = 'spaced_review_states' THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (family_private.is_family() AND family_private.can_write_learner(%s)) WITH CHECK (family_private.is_family() AND family_private.can_write_learner(%s))', 'family_allow_update_'||r.column_name, r.table_name, owner_expr, owner_expr);
    END IF;
    -- Delete also needs a write predicate (WITH CHECK does not apply to DELETE).
    EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (family_private.can_write_learner(%s))', 'family_delete_'||r.column_name, r.table_name, owner_expr);
  END LOOP;
END $$;
CREATE POLICY family_users_anon ON public.users AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY family_users_scope ON public.users AS RESTRICTIVE FOR ALL TO authenticated
  USING (family_private.can_read_learner(id)) WITH CHECK (family_private.can_write_learner(id));
CREATE POLICY family_users_read ON public.users FOR SELECT TO authenticated USING (family_private.is_family() AND family_private.can_read_learner(id));
CREATE POLICY family_users_update ON public.users FOR UPDATE TO authenticated
  USING (family_private.is_family() AND family_private.can_write_learner(id)) WITH CHECK (family_private.is_family() AND family_private.can_write_learner(id));
CREATE POLICY family_users_delete ON public.users AS RESTRICTIVE FOR DELETE TO authenticated USING (family_private.can_write_learner(id));

CREATE POLICY family_roles_lock ON public.user_roles AS RESTRICTIVE FOR ALL TO authenticated
  USING (NOT family_private.is_family() OR family_private.parent_unlocked())
  WITH CHECK (NOT family_private.is_family() OR family_private.parent_unlocked());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT (NOT family_private.is_family() OR family_private.parent_unlocked()) AND EXISTS (
    SELECT 1 FROM public.user_roles r WHERE r.user_id = _user_id AND r.role = _role);
$$;

-- Parent-only objects; locked families can only see the small chooser RPC response.
DO $$ DECLARE r record; owner_expr text; BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND
    (tablename IN ('guardians','guardian_child_links','delegation_tokens','parent_child')
      OR tablename ~ '(subscription|billing|payment)') LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
    owner_expr := CASE r.tablename
      WHEN 'guardians' THEN 'user_id = auth.uid()'
      WHEN 'parent_child' THEN 'parent_id = auth.uid()'
      ELSE NULL END;
    IF owner_expr IS NULL THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=r.tablename AND column_name='guardian_id') THEN
        owner_expr := 'EXISTS(SELECT 1 FROM public.guardians g WHERE g.id = guardian_id AND g.user_id = auth.uid())';
      ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=r.tablename AND column_name='user_id') THEN
        owner_expr := 'user_id = auth.uid()';
      ELSE owner_expr := 'false'; END IF;
    END IF;
    EXECUTE format('CREATE POLICY family_parent_owner ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (NOT family_private.is_family() OR (%s) OR (NOT family_private.is_family() AND public.has_role(auth.uid(), %L))) WITH CHECK (NOT family_private.is_family() OR (%s) OR (NOT family_private.is_family() AND public.has_role(auth.uid(), %L)))', r.tablename, owner_expr, 'admin', owner_expr, 'admin');

    EXECUTE format('CREATE POLICY family_parent_lock ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (NOT family_private.is_family() OR family_private.parent_unlocked()) WITH CHECK (NOT family_private.is_family() OR family_private.parent_unlocked())', r.tablename);
  END LOOP;
END $$;
CREATE POLICY family_children_manage ON public.children AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (NOT family_private.is_family() OR family_private.parent_unlocked()) WITH CHECK (NOT family_private.is_family() OR family_private.parent_unlocked());
CREATE POLICY family_children_create ON public.children AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT family_private.is_family() OR family_private.parent_unlocked());
CREATE POLICY family_children_delete ON public.children AS RESTRICTIVE FOR DELETE TO authenticated
  USING (NOT family_private.is_family() OR family_private.parent_unlocked());

-- Dependent exercise records have no direct learner column.
CREATE POLICY family_attempt_scope ON public.exercise_attempts AS RESTRICTIVE FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM public.exercise_history h WHERE h.id = exercise_history_id AND family_private.can_read_learner(h.user_id)))
  WITH CHECK (EXISTS(SELECT 1 FROM public.exercise_history h WHERE h.id = exercise_history_id AND family_private.can_write_learner(h.user_id)));
CREATE POLICY family_attempt_access ON public.exercise_attempts FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM public.exercise_history h WHERE h.id = exercise_history_id AND family_private.can_write_learner(h.user_id)))
  WITH CHECK (EXISTS(SELECT 1 FROM public.exercise_history h WHERE h.id = exercise_history_id AND family_private.can_write_learner(h.user_id)));
DO $$ DECLARE r text; fk text; BEGIN
  FOREACH r IN ARRAY ARRAY['explanations_cache','exercise_explanations_cache'] LOOP
    IF to_regclass('public.'||r) IS NULL THEN CONTINUE; END IF;
    SELECT column_name INTO fk FROM information_schema.columns WHERE table_schema='public' AND table_name=r AND column_name IN ('attempt_id','exercise_attempt_id') LIMIT 1;
    IF fk IS NULL THEN CONTINUE; END IF;
    EXECUTE format('CREATE POLICY family_explanation_scope ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (EXISTS(SELECT 1 FROM public.exercise_attempts a JOIN public.exercise_history h ON h.id=a.exercise_history_id WHERE a.id=%I AND family_private.can_read_learner(h.user_id))) WITH CHECK (EXISTS(SELECT 1 FROM public.exercise_attempts a JOIN public.exercise_history h ON h.id=a.exercise_history_id WHERE a.id=%I AND family_private.can_write_learner(h.user_id)))', r, fk, fk);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.is_guardian_of_child(_guardian_user_id uuid, _child_user_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT _guardian_user_id = auth.uid() AND (NOT family_private.is_family() OR family_private.parent_unlocked()) AND EXISTS (
   SELECT 1 FROM public.children c WHERE c.user_id = _child_user_id AND family_private.owns_child(c.id));
$$;
REVOKE ALL ON FUNCTION public.is_guardian_of_child(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_guardian_of_child(uuid,uuid) TO authenticated;

-- The existing approval trigger rejects every non-admin update to another user's row.
-- Permit only already-authorized learning preferences; preserve its approval protections.
CREATE OR REPLACE FUNCTION public.prevent_non_admin_approval_changes() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF family_private.is_family() AND family_private.can_write_learner(NEW.id) AND
    (to_jsonb(NEW) - ARRAY['style','level','country','curriculum_country_code','curriculum_level_code','product_tour_completed_at','updated_at'])
      IS NOT DISTINCT FROM (to_jsonb(OLD) - ARRAY['style','level','country','curriculum_country_code','curriculum_level_code','product_tour_completed_at','updated_at']) THEN
    RETURN NEW;
  END IF;
  IF auth.uid() <> NEW.id AND NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='admin'::public.app_role
  ) THEN RAISE EXCEPTION 'Only an administrator can change account approval' USING ERRCODE='42501'; END IF;
  IF auth.uid() = NEW.id AND (NEW.approval_status IS DISTINCT FROM OLD.approval_status
    OR NEW.approval_reviewed_at IS DISTINCT FROM OLD.approval_reviewed_at
    OR NEW.approval_reviewed_by IS DISTINCT FROM OLD.approval_reviewed_by) THEN
    RAISE EXCEPTION 'Only an administrator can change account approval' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END $$;

-- Child mode can update learning preferences, not credentials, roles, approval or account fields.
CREATE FUNCTION family_private.limit_child_profile_updates() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF family_private.is_family() AND NOT family_private.parent_unlocked() AND
    (to_jsonb(NEW) - ARRAY['style','level','country','curriculum_country_code','curriculum_level_code','product_tour_completed_at','updated_at'])
      IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['style','level','country','curriculum_country_code','curriculum_level_code','product_tour_completed_at','updated_at']) THEN
    RAISE EXCEPTION 'Parent authorization required' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER family_child_profile_fields BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION family_private.limit_child_profile_updates();

-- Views over private learning records must obey the base-table RLS.
DO $$ DECLARE v record; BEGIN
 FOR v IN SELECT DISTINCT n.nspname, c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   JOIN pg_rewrite rw ON rw.ev_class=c.oid JOIN pg_depend d ON d.objid=rw.oid JOIN pg_class base ON base.oid=d.refobjid
   WHERE n.nspname='public' AND c.relkind='v' AND base.relname IN
    ('users','children','exercise_history','exercise_attempts','user_learning_progress','student_mastery','objective_mastery','quiz_bank_attempts','guardians','guardian_child_links') LOOP
   EXECUTE format('ALTER VIEW %I.%I SET (security_invoker = true)', v.nspname,v.relname);
 END LOOP;
END $$;
COMMIT;
