-- Seed: add EMC (Éducation Morale et Civique) as a curriculum subject
-- Idempotent: safe to re-run, no-op if slug='emc' already exists.
DO $$
DECLARE
  has_language boolean;
  has_color_scheme boolean;
  has_icon_name boolean;
  has_is_active boolean;
  has_order_index boolean;
  sql text;
BEGIN
  IF to_regclass('public.subjects') IS NULL THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subjects' AND column_name = 'language'
  ) INTO has_language;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subjects' AND column_name = 'color_scheme'
  ) INTO has_color_scheme;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subjects' AND column_name = 'icon_name'
  ) INTO has_icon_name;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subjects' AND column_name = 'is_active'
  ) INTO has_is_active;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subjects' AND column_name = 'order_index'
  ) INTO has_order_index;

  sql := 'insert into public.subjects (id, slug, name, country_code';
  IF has_language THEN
    sql := sql || ', language';
  END IF;
  IF has_color_scheme THEN
    sql := sql || ', color_scheme';
  END IF;
  IF has_icon_name THEN
    sql := sql || ', icon_name';
  END IF;
  IF has_is_active THEN
    sql := sql || ', is_active';
  END IF;
  IF has_order_index THEN
    sql := sql || ', order_index';
  END IF;
  sql := sql || ') select ' ||
    quote_literal('e3c11111-1111-4111-8111-111111111111') || '::uuid, ' ||
    quote_literal('emc') || ', ' ||
    quote_literal('Éducation Morale et Civique') || ', ' ||
    quote_literal('fr');

  IF has_language THEN
    sql := sql || ', ' || quote_literal('fr');
  END IF;
  IF has_color_scheme THEN
    sql := sql || ', ' || quote_literal('amber');
  END IF;
  IF has_icon_name THEN
    sql := sql || ', ' || quote_literal('Scale');
  END IF;
  IF has_is_active THEN
    sql := sql || ', true';
  END IF;
  IF has_order_index THEN
    sql := sql || ', 6';
  END IF;

  sql := sql || ' where not exists (select 1 from public.subjects where slug = ''emc'')';
  EXECUTE sql;
END $$;
