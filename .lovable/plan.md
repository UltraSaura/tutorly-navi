

## Goal
Create one consolidated file `curriculum-import/BUNDLE_SCHEMA.md` that contains the complete bundle JSON target format in a single place — replacing the scattered info across `BUNDLE_FORMAT.md` and `CHATGPT_PROMPT.md`.

## What the file will contain

A single Markdown document with these sections:

1. **Overview** — purpose of bundle.json + the edge function that consumes it (`import-curriculum-bundle`).
2. **Top-level shape** — the 8 root keys (`subjects`, `domains`, `subdomains`, `objectives`, `success_criteria`, `tasks`, `topic_objective_links`, `lessons`).
3. **Hard rules** — UUIDs everywhere, lowercase normalized levels (`5eme` not `5ème`), country-based filtering via `subjects.country_code`, `language` is metadata only.
4. **Existing subject UUIDs table** — the 5 reusable subject IDs (mathematics, physics, francais, history, geography).
5. **Field-by-field reference** for each of the 8 entities — column name, DB target, required flag, notes.
6. **Canonical level codes** for France — `cp, ce1, ce2, cm1, cm2, 6eme, 5eme, 4eme, 3eme`.
7. **Full worked example** — a complete valid bundle showing one objective end-to-end through all 8 sections.
8. **Validation checklist** — what the importer checks, common errors, how to fix them.
9. **How to upload** — the `/admin/curriculum` flow + Replace mode behavior.

## Files touched

- **Create**: `curriculum-import/BUNDLE_SCHEMA.md` (single source of truth, ~400 lines)
- **Update**: `curriculum-import/README.md` to point at the new file as the canonical reference
- **Leave alone**: `BUNDLE_FORMAT.md` and `CHATGPT_PROMPT.md` stay (the ChatGPT prompt is a separate workflow doc; format doc can be removed later if you want)

## Optional cleanup
If you'd rather have the new file fully replace the old ones, I can also delete `BUNDLE_FORMAT.md` in the same change. Tell me yes/no when approving.

