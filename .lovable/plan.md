
Goal: make 5e Mathematics appear in `/admin/curriculum`.

Diagnosis:
- Your uploaded bundle is valid for the viewer:
  - subject_id = `f34e5bb1-34f0-41c8-aa3a-8f8b11f2f6de`
  - `level = "5eme"`
- The database already contains:
  - FR school level `5EME` / label `5ème`
  - 2 Mathematics objectives at level `5eme`
- So the level is not missing from the DB.

Root cause:
- `src/lib/curriculumStore.ts` filters subjects by country language:
  - France resolves to `fr`
  - the `Mathematics` subject row is stored with `language = 'en'`
  - therefore Mathematics is excluded from the France curriculum tree before the viewer even renders levels/subjects

What to change:
1. Update `src/lib/curriculumStore.ts`
   - Remove the strict `subjectsInLanguage` gate for admin curriculum tree building.
   - New rule:
     - if a subject has objectives for a level, include it for that level regardless of subject language
     - only use language as a fallback for subjects that have no objectives anywhere
   - Keep lowercase normalization for level matching.

2. Keep level matching normalized
   - Continue matching `school_levels.level_code.toLowerCase()` with `objectives.level.toLowerCase()`
   - This already supports `5EME` ↔ `5eme`.

3. Verify viewer behavior after the fix
   - `/admin/curriculum` → France → 5ème should show Mathematics
   - Domain `Nombres et calculs` and subdomain `Fractions` should appear
   - Existing CM1 content should still load

4. Sanity-check related selectors
   - Confirm `useCurriculumLevels`, `useAllCurriculumSubjects`, and `CurriculumSelector` still behave correctly after the store change
   - Ensure we do not reintroduce duplicate levels

Technical details:
- Current blocking code is here:
  - `src/lib/curriculumStore.ts`
  - `const subjectsInLanguage = subjects.filter(s => (s.language ?? 'en') === lang);`
- Confirmed DB facts:
  - `subjects.id = f34e5bb1-34f0-41c8-aa3a-8f8b11f2f6de` → `Mathematics`, `language = 'en'`
  - `school_levels` contains `FR / 5EME / 5ème`
  - `objectives` contains Mathematics rows for `5eme`
- This means the import worked; the viewer tree logic is what hides the subject.

Expected result after implementation:
- 5ème remains visible in the level dropdown
- Mathematics becomes selectable under 5ème
- The imported 5e objectives show in the Curriculum Viewer without changing your bundle data
