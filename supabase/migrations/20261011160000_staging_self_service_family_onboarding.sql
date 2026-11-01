-- STAGING ONLY: self-service parent signup for the family pilot.
-- This migration must never be applied to a production project.
BEGIN;

-- Parent signups are self-service in staging. Student/teacher accounts retain
-- the existing approval workflow. The Auth trigger is SECURITY DEFINER and
-- writes the server-controlled approval fields; client metadata cannot edit
-- them after creation.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_type text := COALESCE(NEW.raw_user_meta_data->>'user_type', 'student');
BEGIN
  INSERT INTO public.users (
    id, email, user_type, first_name, last_name, country, phone_number,
    username, approval_status, approval_reviewed_at
  ) VALUES (
    NEW.id,
    NEW.email,
    requested_type,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'country',
    NEW.raw_user_meta_data->>'phone_number',
    NULLIF(NEW.raw_user_meta_data->>'username', ''),
    CASE WHEN requested_type = 'parent' THEN 'approved' ELSE 'pending' END,
    CASE WHEN requested_type = 'parent' THEN now() ELSE NULL END
  );
  RETURN NEW;
END;
$$;

-- Every newly-created staging guardian is enrolled automatically. This keeps
-- the rollout cohort empty until an account actually self-registers and never
-- imports or copies an existing production user.
CREATE OR REPLACE FUNCTION family_private.enroll_staging_guardian()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, family_private
AS $$
BEGIN
  INSERT INTO family_private.rollout_accounts (account_id)
  SELECT NEW.user_id
  WHERE EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = NEW.user_id
      AND u.user_type = 'parent'
      AND u.approval_status = 'approved'
  )
  ON CONFLICT (account_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enroll_staging_guardian_on_create ON public.guardians;
CREATE TRIGGER enroll_staging_guardian_on_create
AFTER INSERT ON public.guardians
FOR EACH ROW EXECUTE FUNCTION family_private.enroll_staging_guardian();

COMMIT;
