

## Status: Import works ✅ — but FK wiring is incomplete

The dup-key blocker is gone. New issue: importer reports `Not ready` because:
- `objectives.subdomain_id_uuid_null = 1`
- `objectives.domain_id_uuid_null = 1`

Meaning: when the importer inserted the objective, it didn't populate `domain_id_uuid` / `subdomain_id_uuid` on the `objectives` row. The bundle DOES carry `domain_id` and `subdomain_id` (your Apps Script writes them), so this is an importer bug — it's only writing the legacy text columns and forgetting to mirror them into the `*_uuid` FK columns.

Same likely story for `success_criteria.subject_id_uuid` / `domain_id_uuid` / `subdomain_id_uuid` and `tasks.*_uuid` (they passed the NULL check this time only because the readiness flag only inspects 3 specific columns).

## Investigation (read-only, this turn)

I'll inspect:
1. `supabase/functions/import-curriculum-bundle/index.ts` — the section that inserts `objectives`, to confirm it's not mapping `domain_id` → `domain_id_uuid` / `subdomain_id` → `subdomain_id_uuid`.
2. `supabase--read_query` on the freshly imported `objectives` row to confirm the NULL columns and verify `domain_id` / `subdomain_id` (text) DID land — proving the data IS in the bundle, just not mirrored.
3. Same check on `success_criteria` and `tasks` for completeness.

## Fix plan (one tightly scoped patch)

In `import-curriculum-bundle/index.ts`, when building each row payload:

- **objectives**: also set `domain_id_uuid = bundleRow.domain_id`, `subdomain_id_uuid = bundleRow.subdomain_id`, `subject_id_uuid = bundleRow.subject_id` (these are already UUIDs in your bundle).
- **success_criteria**: also set `objective_id_uuid`, `subject_id_uuid`, `domain_id_uuid`, `subdomain_id_uuid` from the bundle's UUID fields.
- **tasks**: also set `success_criterion_id_uuid`, `subject_id_uuid`, `domain_id_uuid`, `subdomain_id_uuid`.
- **subdomains**: also set `subject_id` (uuid col) — already correct; verify.

After the upserts, run the existing remap step so any resolved-existing IDs propagate into these `_uuid` columns too (it currently only updates the legacy text columns).

No DB migration. No script change. No changes to your Google Sheet workflow. Just the importer.

## Expected result after fix

Re-upload `bundle_Francais_CM1_FIXED-3.json` (or generate a new one) → readiness flips to **Ready** → all four NULL-FK counts go to 0.

## Out of scope (intentionally)

- The auto-scrape pipeline (you declined; not revisiting unless asked).
- Any Apps Script edits (your output is correct).

