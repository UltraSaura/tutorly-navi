-- Guardian role enum value should be added in previous migration (20251012235959_add_guardian_enum.sql)

-- Function to auto-assign guardian role when guardian profile is created
CREATE OR REPLACE FUNCTION public.auto_assign_guardian_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Assign guardian role to user
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.user_id, 'guardian'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-assigning guardian role
DROP TRIGGER IF EXISTS auto_assign_guardian_role_trigger ON public.guardians;
CREATE TRIGGER auto_assign_guardian_role_trigger
AFTER INSERT ON public.guardians
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_guardian_role();

-- Backfill guardian roles for existing guardian profiles
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'guardian'::app_role
FROM public.guardians
WHERE user_id NOT IN (
  SELECT user_id FROM public.user_roles WHERE role = 'guardian'
)
ON CONFLICT (user_id, role) DO NOTHING;

-- Update RLS policies to allow guardians access to their data

-- Allow guardians to view child exercise history
DROP POLICY IF EXISTS "Guardians can view children exercise history" ON public.exercise_history;
CREATE POLICY "Guardians can view children exercise history"
ON public.exercise_history FOR SELECT
USING (
  user_id IN (
    SELECT c.user_id
    FROM public.children c
    INNER JOIN public.guardian_child_links gcl ON gcl.child_id = c.id
    INNER JOIN public.guardians g ON g.id = gcl.guardian_id
    WHERE g.user_id = auth.uid()
  )
);

-- Allow guardians to view child exercise attempts
DROP POLICY IF EXISTS "Guardians can view children exercise attempts" ON public.exercise_attempts;
CREATE POLICY "Guardians can view children exercise attempts"
ON public.exercise_attempts FOR SELECT
USING (
  exercise_history_id IN (
    SELECT eh.id
    FROM public.exercise_history eh
    INNER JOIN public.children c ON c.user_id = eh.user_id
    INNER JOIN public.guardian_child_links gcl ON gcl.child_id = c.id
    INNER JOIN public.guardians g ON g.id = gcl.guardian_id
    WHERE g.user_id = auth.uid()
  )
);

-- Allow guardians to view children's chat messages (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_messages') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Guardians can view children chat messages" ON public.chat_messages';
    EXECUTE 'CREATE POLICY "Guardians can view children chat messages"
    ON public.chat_messages FOR SELECT
    USING (
      user_id IN (
        SELECT c.user_id
        FROM public.children c
        INNER JOIN public.guardian_child_links gcl ON gcl.child_id = c.id
        INNER JOIN public.guardians g ON g.id = gcl.guardian_id
        WHERE g.user_id = auth.uid()
      )
    )';
  END IF;
END $$;

COMMENT ON FUNCTION public.auto_assign_guardian_role() IS 'Automatically assigns guardian role when a guardian profile is created';

