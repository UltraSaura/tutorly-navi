# Seed: EMC subject

Adds **EMC** (Éducation Morale et Civique) as a curriculum subject so EMC bundles can resolve at import time.

This is a human-readable copy of the migration `supabase/migrations/20260421103443_ec9f6660-b175-4d8f-953b-dd23104e5bbe.sql`. The SQL has already been applied to the live database — this `.md` exists for documentation and sharing only.

## SQL

```sql
-- Seed: add EMC (Éducation Morale et Civique) as a curriculum subject
-- Idempotent: safe to re-run, no-op if slug='emc' already exists.

insert into public.subjects (
  id,
  slug,
  name,
  country_code,
  language,
  color_scheme,
  icon_name,
  is_active,
  order_index
)
select
  'e3c11111-1111-4111-8111-111111111111'::uuid,
  'emc',
  'Éducation Morale et Civique',
  'fr',
  'fr',
  'amber',
  'Scale',
  true,
  6
where not exists (
  select 1 from public.subjects where slug = 'emc'
);
```

## Field rationale

- `id = 'e3c11111-1111-4111-8111-111111111111'` — stable hard-coded UUID v4 so bundle authors can reference it directly (same pattern as the `mathematics` UUID in `BUNDLE_SCHEMA.md` §4)
- `slug = 'emc'` — short canonical slug, lowercase per the curriculum normalization rule
- `name = 'Éducation Morale et Civique'` — display name
- `country_code = 'fr'` — EMC is a French-curriculum subject; drives viewer filtering
- `language = 'fr'` — source language tag
- `color_scheme = 'amber'` — distinct from the 5 existing subjects
- `icon_name = 'Scale'` — lucide-react icon, fits civics
- `order_index = 6` — appears after the 5 existing subjects
- `where not exists (...)` — idempotent guard (the `subjects.slug` column has no unique constraint, so we can't use `on conflict`); re-running the migration is a safe no-op

## How to apply

Already applied via Supabase migration `20260421103443_ec9f6660-b175-4d8f-953b-dd23104e5bbe.sql`. If you need to apply it manually to another environment, paste the SQL block above into the Supabase SQL editor — the `where not exists` guard makes it safe to run multiple times.
