

## Goal
Extend the planned "Recent Updates" page so each row shows whether the last import/update **succeeded, partially succeeded, or failed** (e.g. missing FKs, NULL required fields, orphaned references). You see at a glance what's healthy and what needs attention.

## What changes vs. the previous plan

The page structure stays the same (summary strip + tabbed tables + detail drawer). We add a **Status column** to every table and a **Health summary card** at the top.

### New: Status column per row

Each row gets a colored badge computed client-side from the row's data:

| Badge | Meaning | Detection rule |
|---|---|---|
| 🟢 **OK** | Row is complete and all FKs resolved | All required fields present, all `*_id_uuid` columns non-null |
| 🟡 **Partial** | Row inserted but some optional/derived fields missing | e.g. `domain_id` text present but `domain_id_uuid` null, `subdomain_id_uuid` null on an objective, missing `keywords`, missing `notes_from_prog` |
| 🔴 **Issue** | Row is broken — required relationship missing | e.g. objective with no `subdomain_id_uuid` AND no `subdomain_id`, success_criterion with no `objective_id`, task with no `success_criterion_id`, lesson with no `topic_id` AND no `objective_ids` |
| ⚪ **Unknown** | Can't determine (pre-import legacy row, etc.) | Falls back to neutral badge |

Hovering the badge shows a tooltip listing exactly which fields are missing/unresolved (e.g. "Missing: subdomain_id_uuid, skill_id").

### New: Import health summary card

At the top of the page, above the tab strip, a single card shows:

```
Last import health
  ✓ 1,247 rows OK
  ⚠ 18 rows Partial
  ✗ 3 rows with issues   [View issues →]
```

The "View issues" button filters every tab to show **only rows with 🟡 or 🔴** status, so you can audit problems quickly. A toggle (`Show: All / Issues only`) is also available per tab.

### New: Toast on import completion (when triggered from the UI uploader)

The existing `CurriculumManager.tsx` upload flow already calls `import-curriculum-bundle` and gets back `{ success, summary, ready_for_phase_3, null_fk_counts }`. We wire those values into a toast:

- **Full success** (`success: true && ready_for_phase_3: true && all null_fk_counts === 0`):
  > ✓ Import successful — 87 objectives, 152 success criteria added.

- **Partial success** (`success: true && (ready_for_phase_3: false || any null_fk_counts > 0)`):
  > ⚠ Import completed with warnings — 4 objectives missing subdomain_id_uuid. [View details]
  - "View details" links to `/admin/recent-updates?filter=issues`.

- **Failure** (`success: false`):
  > ✗ Import failed — `<error message from response>`

The CI/cron pipeline doesn't see this UI — but the same data is visible to admins on the page next time they open it.

### New: Detail drawer shows validation breakdown

When you click a row with 🟡 or 🔴 status, the drawer (already planned) gets an extra section at the top:

```
Validation
  ✗ subdomain_id_uuid is null
  ✗ skill_id is null
  ✓ subject_id_uuid resolved
  ✓ text present
```

Below that, the full JSON viewer continues as before.

## How it works (technical)

- **Pure client-side derivation.** No new tables, no new edge function, no migration. Each row already carries the columns we need (e.g. `objectives.subdomain_id_uuid`, `tasks.success_criterion_id_uuid`, etc.).
- A new utility `src/lib/admin/rowHealth.ts` exports `evaluateRow(table, row)` returning `{ status: 'ok'|'partial'|'issue'|'unknown', issues: string[] }`. One small ruleset per table, mirroring the schema's required FK columns.
- `RecentTable.tsx` reads `evaluateRow` for each row, renders the badge + tooltip, and supports the `Issues only` filter.
- The summary card uses the same hook results as the table queries — counts statuses across all tables in memory (already capped at 50 rows per table, so cheap).
- `CurriculumManager.tsx` toast logic is updated to branch on the response envelope as described.

## Files touched (delta from previous plan)

- **Create (new)**: `src/lib/admin/rowHealth.ts` — pure-function rules per table
- **Edit**: `src/components/admin/recent/RecentTable.tsx` (planned file) — add status column + filter toggle
- **Edit**: `src/components/admin/recent/RecentSummaryStrip.tsx` (planned file) — add the Health summary card
- **Edit**: `src/components/admin/recent/RowDetailDrawer.tsx` (planned file) — add Validation section
- **Edit**: `src/pages/admin/CurriculumManager.tsx` — replace the existing post-import toast with the 3-branch version (success / warnings / failure) and link to `/admin/recent-updates?filter=issues`
- **Leave alone**: edge function, DB schema, all migrations, all other admin pages

No backend work, no schema changes — everything derives from columns already returned by the queries.

