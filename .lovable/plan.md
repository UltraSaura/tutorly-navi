

User wants the safest, cleanest option. Dataset is tiny (19 objectives, 1 active subject). The legacy data is too inconsistent to backfill cleanly:
- `objectives.subject_id` is all NULL
- `topics.curriculum_subject_id` uses 'math' but `subjects.slug` is 'mathematics'
- `subjects.slug` has inconsistent casing ('Physics' vs lowercase)
- Manual data fixes would still leave us with messy historical rows

Recommendation: **Option C — Wipe + re-import** combined with cleaning up the subjects table first. Reasoning:
1. Volume is trivial (19 objectives) — re-importing is faster than backfilling.
2. The whole point of this refactor is to stop patching around inconsistencies. Carrying over broken data defeats the purpose.
3. With UUID columns already in place from Phase 1, a clean re-import lands directly in the new shape.
4. Avoids creating "zombie" rows that pass Phase 3 cutover with NULL FKs.

Option A (data fixes) keeps fragile mappings. Option B (dual-write) preserves the mess. Option C gives a clean baseline.

Plan to present: concise, 4 steps.

## Recommendation: Option C — Clean wipe + re-import

The dataset is too small (19 objectives, 1 active subject) to justify rescuing. The whole goal of this refactor is to stop carrying inconsistencies forward. Backfilling broken data would defeat the purpose.

### Steps

1. **Normalize `subjects` first**
   - Lowercase `'Physics' → 'physics'`
   - Pick canonical slugs: confirm `'mathematics'` vs `'math'` (your `topics` use `'math'`; your subjects use `'mathematics'`). I'll align both to one.

2. **Truncate curriculum tables** (in dependency order)
   - `tasks`, `success_criteria`, `objectives`, `topic_objective_links`, `subdomains`, `domains`
   - Keep `subjects`, `topics`, `videos`, `lessons` (they hold real app data referenced by users).
   - Set `topics.curriculum_*_id` columns to NULL so they get rewired by the new import.

3. **Update the importer to write UUIDs natively**
   - `curriculum-import/import.js` + `import-curriculum-bundle` edge function
   - Pre-generate `crypto.randomUUID()` for each entity in the transformer
   - Wire FKs explicitly (no more `mapToCurriculum()` keyword hack)
   - Write to the new UUID columns (`id_new`, `subject_id_uuid`, etc.)
   - Bundle JSON shape stays the same — only the values change to UUIDs

4. **Re-run import → verify → Phase 3 cutover**
   - Import the curriculum bundle fresh
   - Verify all FKs are populated (zero NULLs in `*_uuid` columns)
   - Apply Phase 3 migration: drop legacy columns, rename `id_new → id`, promote UUID PKs

### What stays safe

- `topics`, `videos`, `lessons` data preserved — only their curriculum FKs get rewired
- `objective_mastery` and `lesson_sessions` records stay (they reference `id_new` UUIDs)
- App keeps working between steps 2 and 4 because the legacy text columns are still there

### Outcome

- Clean UUID-based schema end-to-end
- Importer becomes a straightforward pipeline: PDF → JSON (with UUIDs) → Supabase
- No more keyword matching, no more text-FK hacks, no more NULL tolerance

