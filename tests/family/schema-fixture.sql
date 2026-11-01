-- Disposable test database ONLY. A compact current-schema fixture with deliberately
-- permissive historical policies tests that the new restrictive rules cannot be bypassed.
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END $$;
CREATE SCHEMA auth;
CREATE SCHEMA extensions;
CREATE TABLE auth.users(id uuid PRIMARY KEY, raw_user_meta_data jsonb DEFAULT '{}');
CREATE TABLE auth.sessions(id uuid PRIMARY KEY, user_id uuid REFERENCES auth.users(id));
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT (NULLIF(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid; $$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT COALESCE(NULLIF(current_setting('request.jwt.claims',true),'')::jsonb,'{}'); $$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated;
CREATE TYPE public.app_role AS ENUM ('admin','parent','student','teacher');
CREATE TABLE public.users(id uuid PRIMARY KEY REFERENCES auth.users(id), first_name text, email text, level text,
  country text, style text, user_type text, approval_status text DEFAULT 'approved', approval_reviewed_at timestamptz, approval_reviewed_by uuid, curriculum_country_code text,
  curriculum_level_code text, product_tour_completed_at timestamptz, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
CREATE TABLE public.children(id uuid PRIMARY KEY, user_id uuid REFERENCES public.users(id), status text DEFAULT 'active',
  grade text, settings_json jsonb DEFAULT '{}');
CREATE TABLE public.guardians(id uuid PRIMARY KEY, user_id uuid REFERENCES public.users(id), billing_customer_id text);
CREATE TABLE public.guardian_child_links(id uuid PRIMARY KEY, guardian_id uuid REFERENCES public.guardians(id), child_id uuid REFERENCES public.children(id));
CREATE TABLE public.user_roles(user_id uuid, role public.app_role);
-- Existing hosted approval trigger, including its cross-user update restriction.
CREATE FUNCTION public.prevent_non_admin_approval_changes() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() <> NEW.id AND NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='admin'::app_role) THEN
    RAISE EXCEPTION 'Only an administrator can change account approval';
  END IF;
  IF auth.uid()=NEW.id AND (NEW.approval_status IS DISTINCT FROM OLD.approval_status
    OR NEW.approval_reviewed_at IS DISTINCT FROM OLD.approval_reviewed_at
    OR NEW.approval_reviewed_by IS DISTINCT FROM OLD.approval_reviewed_by) THEN
    RAISE EXCEPTION 'Only an administrator can change account approval';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER protect_user_approval_fields BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.prevent_non_admin_approval_changes();
CREATE TABLE public.teachers(id uuid PRIMARY KEY, user_id uuid);
CREATE TABLE public.classes(id uuid PRIMARY KEY, teacher_id uuid);
CREATE TABLE public.class_student_links(id uuid PRIMARY KEY, student_id uuid, class_id uuid);
CREATE TABLE public.delegation_tokens(id uuid PRIMARY KEY, guardian_id uuid, child_id uuid);
CREATE TABLE public.parent_child(parent_id uuid, child_id uuid);
CREATE TABLE public.exercise_history(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES public.users(id), exercise_content text);
CREATE TABLE public.exercise_explanations_cache(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), exercise_hash text UNIQUE, exercise_content text);
CREATE TABLE public.exercise_attempts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), exercise_history_id uuid REFERENCES public.exercise_history(id));
CREATE TABLE public.explanations_cache(id uuid PRIMARY KEY, attempt_id uuid REFERENCES public.exercise_attempts(id));
CREATE TABLE public.user_learning_progress(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, progress_type text);
CREATE TABLE public.quiz_bank_attempts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, score integer);
CREATE TABLE public.spaced_review_states(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid, repetitions integer DEFAULT 0);
CREATE TABLE public.chat_messages(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, content text);
CREATE TABLE public.user_points(user_id uuid PRIMARY KEY, points integer);
CREATE TABLE public.objective_mastery(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid);
CREATE TABLE public.lesson_sessions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), child_id uuid);
DO $$ DECLARE t record; BEGIN
 FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t.tablename);
  IF t.tablename NOT IN ('quiz_bank_attempts','spaced_review_states') THEN
    EXECUTE format('CREATE POLICY legacy_allow ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',t.tablename);
  END IF;
 END LOOP;
END $$;
-- Actual hosted operation limits, instead of a broad policy masking missing family grants.
CREATE POLICY own_quiz_read ON public.quiz_bank_attempts FOR SELECT TO authenticated USING(auth.uid()=user_id);
CREATE POLICY own_quiz_insert ON public.quiz_bank_attempts FOR INSERT TO authenticated WITH CHECK(auth.uid()=user_id);
CREATE POLICY own_review_read ON public.spaced_review_states FOR SELECT TO authenticated USING(auth.uid()=student_id);
CREATE POLICY own_review_insert ON public.spaced_review_states FOR INSERT TO authenticated WITH CHECK(auth.uid()=student_id);
CREATE POLICY own_review_update ON public.spaced_review_states FOR UPDATE TO authenticated USING(auth.uid()=student_id) WITH CHECK(auth.uid()=student_id);
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO service_role;
GRANT USAGE ON SCHEMA public, auth TO service_role;
