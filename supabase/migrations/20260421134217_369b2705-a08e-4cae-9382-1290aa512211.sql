DO $$
BEGIN
  IF to_regclass('public.objectives') IS NOT NULL THEN
    UPDATE public.objectives
    SET created_at = now()
    WHERE level = '6eme';
  END IF;
END $$;
