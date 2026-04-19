

## Diagnosis

The Curriculum Viewer at `/admin/curriculum` reads from a **static file** (`src/data/curriculumBundle.json`), NOT from Supabase.

Currently the bundle only contains: `ce1`, `cm1` (×2 — duplicate), `cm2`, `6e`. There's **no `5e`, `4e`, or `3e` level**.

When you upload a bundle via `/admin/curriculum`, the `import-curriculum-bundle` edge function writes objectives/success_criteria/tasks to Supabase tables — but it does **not** add the level to `curriculumBundle.json`. So your 5e data is in the DB but the viewer's level dropdown still doesn't list 5e.

This is a fundamental architecture gap: the taxonomy (countries/levels/subjects/domains/subdomains shown in the viewer) lives in a hand-edited static file, while the curriculum content (objectives/criteria/tasks) lives in Supabase. They're not synced.

## Fix — make Curriculum Viewer read from Supabase

Replace the static-JSON source with live Supabase queries so any imported bundle immediately appears.

### Changes

1. **`src/lib/curriculum.ts`** — keep the same exported API (`getCountries`, `getLevelsByCountry`, `getSubjects`, `getDomainsBySubject`, `getSubdomainsByDomain`, etc.) but back them with Supabase data instead of the JSON import. Build the country/level/subject/domain/subdomain tree from:
   - `countries` table → countries
   - `school_levels` table → levels per country
   - `subjects` table → subjects (filter by language; FR levels show FR subjects)
   - `domains` table → domains per subject (already has `subject_id`, `code`, `label`)
   - `subdomains` table → subdomains per domain (`domain_id_new`, `code`, `label`)
   - Levels per subject inferred from `objectives.level` (which is what the importer writes)

2. **Convert sync API → async + cached**. Use a single `useQuery(['curriculum-tree'])` hook that loads the full tree once and caches it. Update `useCurriculumBundle.ts` hooks (`useCurriculumCountries`, `useCurriculumLevels`, `useCurriculumSubjects`, `useCurriculumDomains`, `useCurriculumSubdomains`) to read from this cached tree.

3. **Keep `getLocalizedLabel` and `resolveCurriculumPath`** working — `resolveCurriculumPath` needs to become async OR accept the pre-loaded tree. Easier: expose a `useResolveCurriculumPath()` hook that uses the cached tree.

4. **Delete `src/data/curriculumBundle.json`** once nothing imports it. (Verify by searching for the import path.)

5. **Re-import your 5e bundle** — once the viewer is DB-backed, the level appears automatically. No re-upload needed if data is already there; the level will surface from existing `objectives.level = '5eme'` rows.

### Why this is the right fix

- Eliminates the manual sync between JSON and DB.
- Levels added via import (`5e`, `4e`, `3e`, future ones) appear instantly.
- Removes the CM1 duplicate problem at the source (the JSON had it twice — DB has one row per level).
- One source of truth.

### Open question — level naming

Your bundle uses `"level": "5eme"` but the existing JSON levels use `5e`/`6e` (no "me" suffix), and `school_levels` table likely has its own convention. I'll need to check `school_levels` rows for FR and standardize. If they don't match, the import wrote `5eme` while the level table has `5e` → viewer wouldn't connect them. I'll inspect during implementation and normalize (likely to `5e`).

### Out of scope (not changing)

- Apps Script exporter — no changes needed.
- The `import-curriculum-bundle` edge function — keeps writing to the same DB tables.
- The viewer UI components — they keep calling the same hooks, just async-aware now.

