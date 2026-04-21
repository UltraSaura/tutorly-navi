

## Goal
Export the EMC seed migration as a standalone Markdown file you can read/share outside the `supabase/migrations/` folder.

## What I'll create

**New file:** `curriculum-import/migrations/seed-emc-subject.md`

Contents:
- Short intro explaining what the migration does and why
- The exact SQL from `supabase/migrations/20260421103443_ec9f6660-b175-4d8f-953b-dd23104e5bbe.sql` inside a ```sql fenced block
- A "Field rationale" section (same bullets from the approved plan: id, slug, country_code, language, color_scheme, icon_name, order_index, idempotency)
- A "How to apply" note: this SQL has already been applied to the live DB via migration `20260421103443_…`; the `.md` is a human-readable copy for documentation/sharing only — re-running it is safe (no-op) thanks to the `where not exists` guard

## Files touched

- **Create**: `curriculum-import/migrations/seed-emc-subject.md`
- **Leave alone**: the actual `.sql` migration, all docs already updated (`BUNDLE_SCHEMA.md`, `BUNDLE_OBJECT_REFERENCE.md`), all app code

No DB changes, no code changes — just a new doc file mirroring the migration.

