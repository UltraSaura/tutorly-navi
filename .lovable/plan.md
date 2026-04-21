

## Goal
Create a Supabase migration that inserts the **EMC** (Éducation Morale et Civique) subject row so EMC bundles can resolve at import time, plus update the two doc files to list the new subject.

## Migration

**New file:** `supabase/migrations/<timestamp>_seed_emc_subject.sql`

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
values (
  'e3c11111-1111-4111-8111-111111111111',
  'emc',
  'Éducation Morale et Civique',
  'fr',
  'fr',
  'amber',
  'Scale',
  true,
  6
)
on conflict (slug) do nothing;
```

### Field rationale
- `id` — stable hard-coded UUID v4 so bundle authors can reference it directly (same pattern as the `mathematics` UUID in `BUNDLE_SCHEMA.md` §4)
- `slug = 'emc'` — short canonical slug, lowercase per the curriculum normalization rule
- `country_code = 'fr'` — EMC is a French-curriculum subject; drives viewer filtering
- `language = 'fr'` — source language tag
- `color_scheme = 'amber'` / `icon_name = 'Scale'` — distinct from the 5 existing subjects (Scale = lucide-react icon, fits civics)
- `order_index = 6` — appears after the 5 existing subjects
- `on conflict (slug) do nothing` — re-runnable, won't crash if EMC already inserted manually

## Doc updates

1. **`curriculum-import/BUNDLE_SCHEMA.md` §4** — add a row to the "Known subject UUIDs" table:
   ```
   | emc | Éducation Morale et Civique | e3c11111-1111-4111-8111-111111111111 |
   ```

2. **`curriculum-import/BUNDLE_OBJECT_REFERENCE.md`** — two small edits:
   - §1 `subjects[]` Required → `slug`: append `emc` to the allowed-slug list
   - Part C decision matrix → `subjects.slug` row: same update

## Files touched

- **Create**: `supabase/migrations/<timestamp>_seed_emc_subject.sql`
- **Edit**: `curriculum-import/BUNDLE_SCHEMA.md` (single table row)
- **Edit**: `curriculum-import/BUNDLE_OBJECT_REFERENCE.md` (two slug-list mentions)
- **Leave alone**: all app code, all other migrations, `SUPABASE_TABLES.md`, `BUNDLE_FORMAT.md`, `README.md`

No app code, no schema/structural changes — pure data seed + docs.

