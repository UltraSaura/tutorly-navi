

## Goal
Add a complete **Supabase table schema reference** section to `curriculum-import/BUNDLE_SCHEMA.md` so the bundle author can see exactly which DB columns each bundle field maps to, which columns are auto-filled, and which are legacy.

## What gets added

A new section **"Supabase target tables"** appended near the top of `BUNDLE_SCHEMA.md` (after the top-level shape, before the field-by-field reference). It documents the 8 tables the importer writes to.

For each table: column name, type, nullable, source (bundle field / auto-derived / DB default), and notes on legacy vs UUID columns.

### Tables covered

1. **`subjects`** — `id`, `slug`, `name`, `language`, `country_code`, `color_scheme`, `icon_name`, `is_active`, `order_index`, timestamps
2. **`domains`** — `id` (uuid), `subject_id` (uuid), `code`, `label`, `domain` (legacy NOT NULL — auto-filled from `code`)
3. **`subdomains`** — dual PK quirk: `id` bigint auto + `id_new` uuid (the real FK target), `subject_id`, `domain_id_new`, `code`, `label`, legacy `domain` + `subdomain`
4. **`objectives`** — text PK `id` + `id_new` uuid + `subject_id_uuid` / `domain_id_uuid` / `subdomain_id_uuid` (real FKs), plus legacy `subject_id`/`domain_id`/`subdomain_id` text cols, `level`, `text`, `keywords`, `notes_from_prog`
5. **`success_criteria`** — text `id` + `id_new` uuid + `_uuid` FK columns, `objective_id` (text legacy) + `objective_id_uuid`, `text`
6. **`tasks`** — text `id` + `id_new` uuid + `_uuid` FKs, `success_criterion_id` + `_uuid`, `type`, `stem`, `solution`, `rubric`, `difficulty`, `tags`, `source`
7. **`topic_objective_links`** — `topic_id`, `objective_id` (legacy text NOT NULL) + `objective_id_uuid`, `order_index`
8. **`lessons`** — text `id` + `id_new` uuid, `title`, `topic_id` (uuid), `objective_ids` jsonb, `success_criterion_ids` jsonb, plus content fields

### Key callouts in the new section

- **Dual-write pattern**: most curriculum tables have both legacy text columns (`subject_id`, `domain_id`…) and uuid columns (`subject_id_uuid`, `domain_id_uuid`…). The importer writes both. New code should read the uuid columns.
- **`subdomains.id_new` quirk**: the bigint `id` is legacy; FKs from objectives point at `id_new`. Conflict target is `id_new`.
- **Legacy NOT NULL columns** the importer auto-fills: `domains.domain`, `subdomains.domain`, `subdomains.subdomain`, `topic_objective_links.objective_id`.
- **What you set vs what the importer derives**: bundle author only provides UUIDs + human-readable fields. All `*_uuid` mirror columns and legacy text mirrors are derived inside the edge function.

## Files touched

- **Edit**: `curriculum-import/BUNDLE_SCHEMA.md` — add the "Supabase target tables" section (~150 lines)

No code, no migrations, no DB changes.

