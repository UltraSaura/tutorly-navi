-- Purge orphan objectives left behind by early broken imports where
-- the *_uuid mirror columns were not populated. These rows block the
-- "ready_for_phase_3" check on every subsequent import.
DO $$
BEGIN
  IF to_regclass('public.objectives') IS NOT NULL THEN
    DELETE FROM public.objectives
    WHERE domain_id_uuid IS NULL OR subdomain_id_uuid IS NULL;
  END IF;

  -- Same defensive cleanup for downstream tables.
  IF to_regclass('public.success_criteria') IS NOT NULL THEN
    DELETE FROM public.success_criteria
    WHERE objective_id_uuid IS NULL OR subject_id_uuid IS NULL;
  END IF;

  IF to_regclass('public.tasks') IS NOT NULL THEN
    DELETE FROM public.tasks
    WHERE success_criterion_id_uuid IS NULL OR subject_id_uuid IS NULL;
  END IF;
END $$;
