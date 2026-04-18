

User is right — there's already a `CurriculumManager` at `/admin/curriculum` (see `src/components/admin/CurriculumManager.tsx`) that has its own bundle import section with file picker, edge function call, and result display. I created a duplicate `CurriculumBundleImporter` and stuck it on `/admin/learning` instead.

Looking at `CurriculumManager.tsx` lines ~140-200, it already has:
- File picker for bundle.json
- Calls `supabase.functions.invoke('import-curriculum-bundle', { body: bundleData })`
- Shows import result counts
- Refreshes objectives + stats after import

What's missing vs the new `CurriculumBundleImporter` I built on the learning page:
- No display of `ready_for_phase_3` flag from verification
- No display of `verification.nullChecks` (NULL UUID FK counts)

Fix: remove the duplicate from `/admin/learning`, and enhance the existing `CurriculumManager` import section to surface the new verification fields.

## Fix: consolidate to the existing Curriculum Manager

You're right — I shouldn't have added a second importer. The existing one at `/admin/curriculum` already does the upload + edge function call. I'll:

1. **Remove** `CurriculumBundleImporter` from `/admin/learning` (delete the import + JSX from `LearningContentManagement.tsx`, delete the new component file).
2. **Enhance** the existing import section in `CurriculumManager.tsx` to also display the new verification output (`ready_for_phase_3` badge + per-table NULL FK counts) that the edge function now returns.

Net result: one importer, at `/admin/curriculum`, with the verification info visible.

### Files touched
- `src/components/admin/LearningContentManagement.tsx` — remove importer
- `src/components/admin/learning/CurriculumBundleImporter.tsx` — delete
- `src/components/admin/CurriculumManager.tsx` — extend `importResult` state + Alert to show `ready_for_phase_3` and `verification.nullChecks`

