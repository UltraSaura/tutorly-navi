-- Purge orphan domains/subdomains rows whose legacy text key uses the
-- old `${subject_uuid_prefix}_*` namespacing convention. These block
-- re-imports because the new convention is `${slug}_${LEVEL}_${CODE}`,
-- so the `domain` text differs but `(subject_id, code)` collides on
-- the partial unique index `uq_domains_subject_code`.

DO $$
BEGIN
  -- Cascade-safe order: delete dependent subdomains first.
  IF to_regclass('public.subdomains') IS NOT NULL
     AND to_regclass('public.domains') IS NOT NULL THEN
    DELETE FROM public.subdomains
    WHERE domain_id_new IN (
      SELECT id FROM public.domains
      WHERE domain ~ '^[0-9a-f]{8}_[A-Z0-9_]+$'
    );
  END IF;

  IF to_regclass('public.subdomains') IS NOT NULL THEN
    DELETE FROM public.subdomains
    WHERE subdomain ~ '^[0-9a-f]{8}_[A-Z0-9_]+_';
  END IF;

  IF to_regclass('public.domains') IS NOT NULL THEN
    DELETE FROM public.domains
    WHERE domain ~ '^[0-9a-f]{8}_[A-Z0-9_]+$';
  END IF;
END $$;
