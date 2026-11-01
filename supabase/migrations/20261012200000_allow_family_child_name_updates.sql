-- Allow an authorized parent to edit a linked child's display name and
-- curriculum fields without permitting approval, role, or account changes.
CREATE OR REPLACE FUNCTION public.prevent_non_admin_approval_changes() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF family_private.is_family() AND family_private.can_write_learner(NEW.id) AND
    (to_jsonb(NEW) - ARRAY[
      'first_name', 'last_name', 'style', 'level', 'country',
      'curriculum_country_code', 'curriculum_level_code',
      'product_tour_completed_at', 'updated_at'
    ]) IS NOT DISTINCT FROM
    (to_jsonb(OLD) - ARRAY[
      'first_name', 'last_name', 'style', 'level', 'country',
      'curriculum_country_code', 'curriculum_level_code',
      'product_tour_completed_at', 'updated_at'
    ]) THEN
    RETURN NEW;
  END IF;

  IF auth.uid() <> NEW.id AND NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::public.app_role
  ) THEN
    RAISE EXCEPTION 'Only an administrator can change account approval'
      USING ERRCODE='42501';
  END IF;

  IF auth.uid() = NEW.id AND (
    NEW.approval_status IS DISTINCT FROM OLD.approval_status
    OR NEW.approval_reviewed_at IS DISTINCT FROM OLD.approval_reviewed_at
    OR NEW.approval_reviewed_by IS DISTINCT FROM OLD.approval_reviewed_by
  ) THEN
    RAISE EXCEPTION 'Only an administrator can change account approval'
      USING ERRCODE='42501';
  END IF;

  RETURN NEW;
END
$$;
