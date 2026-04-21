

## Goal
Make the Subjects tab show the level of the **most recently imported bundle** (currently shows `CM1` after a `6eme` import).

## Root cause
After investigating the DB:

- `subjects` row for Mathématiques: `updated_at = 2026-04-21 13:32:57` ✅ (was bumped by your 6eme import)
- `objectives.id` is **text** (e.g. `OBJ-CM1-NUM-01`), not a sequential UUID. So `ORDER BY id DESC` sorts alphabetically — `cm1` ids come last, so CM1 always wins.
- `objectives` table has **no `created_at` / `updated_at`** column. Same for `success_criteria`, `tasks`, `lessons`.
- `admin_audit_log` does not record bundle imports.

So today there is **literally no column** that reliably reflects "most recently imported objective". The "latest by id" trick is fundamentally broken.

## Fix (two coordinated changes)

### 1. DB migration — add `created_at` to `objectives`

```sql
ALTER TABLE public.objectives
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_objectives_subject_created
  ON public.objectives (subject_id_uuid, created_at DESC);
```

- Existing rows get `now()` as a backfill (we can't recover true insertion times retroactively — accepted trade-off; from now on it will be accurate).
- Also adds an index to keep the per-subject "latest" query fast.

Optionally we could also add `created_at` to `success_criteria`, `tasks`, `lessons` for future "Last imported" sorting on those tabs. **Question for you below.**

### 2. Hook change — `src/hooks/admin/useRecentUpdates.ts`

In `useRecentSubjects`, replace the broken `order('id', { ascending: false })` with the new timestamp:

```ts
const { data: objRows } = await supabase
  .from('objectives')
  .select('subject_id_uuid, level, created_at')
  .in('subject_id_uuid', ids)
  .order('created_at', { ascending: false }); // real recency

const latestLevelBySubject = new Map<string, string>();
(objRows ?? []).forEach((o: any) => {
  if (!o.subject_id_uuid || !o.level) return;
  if (!latestLevelBySubject.has(o.subject_id_uuid)) {
    latestLevelBySubject.set(o.subject_id_uuid, o.level);
  }
});
```

The UI cell stays as-is (`render: r => <Badge>{r.level?.toUpperCase() ?? '—'}</Badge>`).

## Behaviour after deploy

- All currently-stored objectives get the same backfill timestamp, so for the next ~minute the "latest level" is undefined among existing rows — the Map will pick the first one returned by Postgres, same level fuzziness as today **for old data only**.
- **As soon as you re-import the 6eme bundle**, those rows get a fresher `created_at` and the Subjects tab will correctly show `6EME`.
- All future imports work correctly out of the gate.

## One-time cleanup option
After the migration, if you want the current state to reflect "6eme just imported" without re-importing, we can run a one-off SQL bumping `created_at = now()` for the 6eme objectives only. I'll mention this in chat after the migration; no need to bake it into the plan.

## Files touched
- **New migration**: adds `created_at` column + index on `objectives`
- **Edit**: `src/hooks/admin/useRecentUpdates.ts` — order by `created_at` instead of `id`
- **Leave alone**: `RecentUpdates.tsx` (UI already renders `r.level` correctly), edge function, all other tabs

## Question before I implement
Do you also want `created_at` added to `success_criteria`, `tasks`, and `lessons` so those tabs can sort by true recency too? (One extra migration line per table, no code change needed today but unblocks future work.) If unsure, I'll add them — they're cheap and defensive.

