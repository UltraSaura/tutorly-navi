-- Keep account access under explicit admin approval during the launch period.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS approval_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approval_reviewed_by UUID REFERENCES auth.users(id);

-- Do not lock out accounts that already existed before this workflow was enabled.
UPDATE public.users
SET approval_status = 'approved', approval_reviewed_at = COALESCE(approval_reviewed_at, now())
WHERE approval_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_users_approval_status ON public.users(approval_status);

-- Admins need to see and review all profiles; users can only see their own profile.
DROP POLICY IF EXISTS "Admins can manage user approval" ON public.users;
CREATE POLICY "Admins can manage user approval"
ON public.users FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- A user may update their profile, but never their approval decision.
CREATE OR REPLACE FUNCTION public.prevent_non_admin_approval_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() <> NEW.id AND NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  ) THEN
    RAISE EXCEPTION 'Only an administrator can change account approval';
  END IF;

  IF auth.uid() = NEW.id AND (
    NEW.approval_status IS DISTINCT FROM OLD.approval_status OR
    NEW.approval_reviewed_at IS DISTINCT FROM OLD.approval_reviewed_at OR
    NEW.approval_reviewed_by IS DISTINCT FROM OLD.approval_reviewed_by
  ) THEN
    RAISE EXCEPTION 'Only an administrator can change account approval';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_user_approval_fields ON public.users;
CREATE TRIGGER protect_user_approval_fields
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.prevent_non_admin_approval_changes();
