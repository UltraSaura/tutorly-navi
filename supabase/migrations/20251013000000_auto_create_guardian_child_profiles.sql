-- Auto-create guardian/child profiles when users sign up

-- Function to auto-create guardian profile for parent users
CREATE OR REPLACE FUNCTION public.auto_create_guardian_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create guardian profile for parent user types
  IF NEW.user_type = 'parent' THEN
    INSERT INTO public.guardians (user_id, phone)
    VALUES (
      NEW.id,
      NEW.phone_number
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to auto-create child profile for student users
CREATE OR REPLACE FUNCTION public.auto_create_child_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create child profile for student user types
  IF NEW.user_type = 'student' THEN
    INSERT INTO public.children (user_id, contact_email, grade, status)
    VALUES (
      NEW.id,
      NEW.email,
      NEW.level,
      'active'
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers that fire after user is created
DROP TRIGGER IF EXISTS auto_create_guardian_profile_trigger ON public.users;
CREATE TRIGGER auto_create_guardian_profile_trigger
AFTER INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_guardian_profile();

DROP TRIGGER IF EXISTS auto_create_child_profile_trigger ON public.users;
CREATE TRIGGER auto_create_child_profile_trigger
AFTER INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_child_profile();

-- Backfill existing users who don't have guardian/child profiles
-- Create guardian profiles for existing parents
INSERT INTO public.guardians (user_id, phone)
SELECT 
  id,
  phone_number
FROM public.users
WHERE user_type = 'parent'
AND id NOT IN (SELECT user_id FROM public.guardians)
ON CONFLICT (user_id) DO NOTHING;

-- Create child profiles for existing students
INSERT INTO public.children (user_id, contact_email, grade, status)
SELECT 
  id,
  email,
  level,
  'active'
FROM public.users
WHERE user_type = 'student'
AND id NOT IN (SELECT user_id FROM public.children)
ON CONFLICT (user_id) DO NOTHING;

COMMENT ON FUNCTION public.auto_create_guardian_profile() IS 'Automatically creates guardian profile when a parent user is created';
COMMENT ON FUNCTION public.auto_create_child_profile() IS 'Automatically creates child profile when a student user is created';

