

## Root cause (confirmed)

Replace mode does `DELETE FROM objectives WHERE subject_id_uuid = $sid`. But the leftover demo row has `subject_id_uuid IS NULL` — so it's never deleted. Then verification counts ALL nulls in the table → reports 1 NULL → "Not ready".

Same pattern for success_criteria.

```
objectives table:
├── 83268905-... (old demo, NULL FKs) ← survives replace, fails verification
└── a72e7b4b-... (your import, all FKs set) ← perfect
```

## Fix (one-file change)

Edit `supabase/functions/import-curriculum-bundle/index.ts` — extend replace mode to also wipe NULL-FK orphan rows before the regular subject-scoped delete.

**Before objectives upsert (in replace block, ~line 207)**: add a global `DELETE FROM objectives WHERE subject_id_uuid IS NULL AND id_new NOT IN (bundle.objective_ids)` — purge orphans regardless of subject.

Same for `success_criteria` (NULL `objective_id_uuid`), `subdomains` (NULL `subject_id`), `domains` (NULL `subject_id`), `tasks` (NULL `subject_id_uuid`).

This is safe because:
- Bundles always provide proper FKs now (the function backfills mirrors).
- Any row with NULL critical FKs is stale demo data with no path to be referenced correctly.

## What you do after

1. Re-upload `bundle.json` with "Replace existing data" ticked.
2. Verification should show all zeros → **ready_for_phase_3: true**.

No bundle changes needed.

