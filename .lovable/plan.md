## Problem

The Curriculum Viewer on `/admin/curriculum` always shows "0 objective(s) found", even though 69 objectives are imported (56 for Mathématiques alone).

## Root cause

The viewer has two mismatched data sources:

1. **Filter dropdowns** (Subject / Domain / Subdomain) are populated from the static `src/data/curriculumBundle.json`, which uses slug IDs like `math`, `numbers-operations`, `geometry`.
2. **Imported `objectives` rows** in Supabase are linked via UUID columns (`subject_id_uuid`, `domain_id_uuid`, `subdomain_id_uuid`) pointing at the `subjects` / `domains` / `subdomains` tables (codes like `GRANDEURS`, `PROPORTIONNALITE`). The legacy text columns `objectives.domain` / `objectives.subdomain` / `objectives.subject_id` are all `NULL`.

`useObjectives` then runs `.eq('domain', '<bundle-slug>')` against a NULL column → 0 rows. It also has no `subject` filter at all, so picking a subject narrows nothing.

## Fix

Source the viewer's filter options from Supabase and filter `objectives` by the UUID columns.

1. **`src/hooks/useCurriculumData.ts` — `useObjectives`**
   - Add `subjectId`, `domainId`, `subdomainId` filter inputs.
   - Replace `.eq('domain', ...)` / `.eq('subdomain', ...)` with `.eq('subject_id_uuid', ...)`, `.eq('domain_id_uuid', ...)`, `.eq('subdomain_id_uuid', ...)`.
   - Keep `level` (text) and `search` (ilike on `text`) as-is.

2. **New hooks (same file)** to feed the dropdowns from DB:
   - `useDbSubjects()` → `select id, name, slug from subjects order by name`.
   - `useDbDomains(subjectId)` → `select id, code, label from domains where subject_id = ?`.
   - `useDbSubdomains(domainId)` → `select id, code, label from subdomains where domain_id_new = ?` (column confirmed on `subdomains`).

3. **`src/components/admin/CurriculumManager.tsx` — Curriculum Viewer section only**
   - Replace bundle-sourced Subject/Domain/Subdomain selects with the new DB-sourced selects. Use `subject.name`, `domain.label` (fallback `code`), `subdomain.label` (fallback `code`) for display.
   - Keep Country and Level selects from the bundle (objectives table has no country column; `level` is a text code like `cm1`).
   - Pass the selected UUIDs into `useObjectives({ level, subjectId, domainId, subdomainId, search })`.
   - Reset child selections on parent change (subject → clears domain/subdomain, domain → clears subdomain) as today.
   - Leave the Import section, stats panel, TaskViewer, and CurriculumLocation untouched.

## Out of scope

- Backfilling the legacy text columns on `objectives`.
- Changing the import pipeline or `curriculumBundle.json`.
- Other consumers of `useObjectives` / curriculum bundle helpers (none currently rely on the new fields).

## Verification

After the change, on `/admin/curriculum` with Country=France, Level=CM1, Subject=Mathématiques: the viewer should list ~56 objectives, narrowing further when a Domain / Subdomain is picked.
