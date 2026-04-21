

## Goal
Show the actual **Level** for each subject row on `/admin/recent-updates` (Subjects tab) instead of "—". Also expose it in the row detail drawer.

## Why it shows "—" today
The `subjects` table has no `level_code` column. School levels live in `school_levels` (per country), and each `objectives` row carries the `level` (e.g. `cm1`, `cp`). The bundle importer infers level from objectives — it never persists it on `subjects`. So `r.level_code` is always undefined.

## Fix

Derive each subject's level(s) by querying `objectives` for distinct `level` values per `subject_id_uuid`, then attach them to the subject rows in memory.

### 1. Extend `useRecentSubjects` hook
File: `src/hooks/admin/useRecentUpdates.ts`

After fetching the subject rows, run a second query:
```ts
supabase
  .from('objectives')
  .select('subject_id_uuid, level')
  .in('subject_id_uuid', subjectIds)
```
Then group distinct levels per subject and merge as a synthetic `levels: string[]` field on each row (e.g. `["cm1"]`, or `["cm1","cm2"]` if a subject spans multiple levels). Empty array if no objectives exist yet.

### 2. Render in the Subjects column config
File: `src/pages/admin/RecentUpdates.tsx` (subjects entry)

Replace the Level cell:
```tsx
{ key: 'levels', label: 'Level', render: r =>
    r.levels?.length
      ? <div className="flex gap-1 flex-wrap">
          {r.levels.map(l => <Badge key={l} variant="outline">{l.toUpperCase()}</Badge>)}
        </div>
      : <Badge variant="outline">—</Badge>
}
```

### 3. (Optional polish) Row detail drawer
The raw JSON viewer already shows everything; the synthetic `levels` array will appear there automatically — no change needed.

## Notes
- One extra small query per Subjects tab load (max 50 subjects, IN-clause query). Cached via React Query alongside the subjects query (same `queryKey` namespace).
- No DB migration, no edge function change, no new column.
- Multi-level subjects display all chips (rare but possible if a single subject row covers multiple grades).
- "Issues only" filter and row health logic are unaffected.

## Files touched
- **Edit**: `src/hooks/admin/useRecentUpdates.ts` (extend `useRecentSubjects`)
- **Edit**: `src/pages/admin/RecentUpdates.tsx` (Level cell render only)

