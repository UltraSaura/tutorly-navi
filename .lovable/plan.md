

## What "Not ready" means

The verification step counts NULLs in these columns after import:
- `objectives.subdomain_id_uuid`, `domain_id_uuid`, `subject_id_uuid`
- `success_criteria.objective_id_uuid`
- `topic_objective_links.objective_id_uuid`

If any are > 0, `ready_for_phase_3 = false`. With your 1-row test, the likely cause is one of the mirror FK fields on `success_criteria` not being populated — either because your bundle omitted `subject_id`/`domain_id`/`subdomain_id` on the success_criterion entry, OR because leftover rows from earlier failed test runs still exist with NULL FKs.

## Two-step diagnosis

**Step 1 — read what the response actually said.** The toast shows counts but hides the `verification` object. I'll surface it in the UI so you see which exact column has NULLs.

**Step 2 — auto-backfill mirror FKs in the edge function.** Even if the bundle omits `subject_id`/`domain_id`/`subdomain_id` on a success_criterion, the function can derive them from the parent objective during upsert. Same for tasks (derive from parent success_criterion → objective). This makes "Phase 3 ready" achievable from a minimal bundle.

## Plan

### File 1: `supabase/functions/import-curriculum-bundle/index.ts`
- **Backfill mirrors before upserting `success_criteria`**: build a Map<objective_id, {subject_id, domain_id, subdomain_id}> from the bundle's objectives, then for each success_criterion fill missing FK fields from its parent.
- **Same for `tasks`**: build a Map from success_criteria (using the just-built FK info) and fill task mirrors.
- Keep existing replace-mode and diagnostics logic.

### File 2: `src/components/admin/CurriculumManager.tsx`
- After a successful import, render the `verification` object and `ready_for_phase_3` flag in the success card so you can see exactly which column has NULLs (e.g. `success_criteria.objective_id_uuid_null: 0` ✓ or `> 0` ✗).
- Add a small "Clean orphan rows" button that calls a new mode `mode: "purge_orphans"` to delete any pre-existing rows with NULL FKs scoped to the subjects in the bundle. (Optional — only if verification still shows NULLs after the backfill fix.)

## What you'll do after I implement

1. Re-upload the same `bundle.json` with "Replace existing data" ticked.
2. The success card will show the verification breakdown. If all zeros → `ready_for_phase_3: true`. If not → click "Clean orphan rows" and re-import.

No bundle.json changes needed on your side.

