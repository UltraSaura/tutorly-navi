

## Goal
On the Subjects tab, show **one level per subject** (the most recently associated one) instead of stacking every level that any objective references.

## Problem
Currently `useRecentSubjects` collects every distinct `level` from all objectives linked to a subject, producing chips like `3EME · 4EME · 5EME · CM1` on a single Mathematics row. You want a single, latest level per subject.

## Constraint discovered
The `objectives` table has **no `updated_at` or `created_at` column** (verified via schema: only `id`, `level`, `text`, FKs, etc.). So "most recently updated level" cannot be derived from a timestamp on objectives.

## Proposed approach: latest by insertion order

Use `id` as the insertion-order proxy (objectives ids are sequential within an import). Pick the level from the **most recently inserted objective** for each subject.

### Hook change — `src/hooks/admin/useRecentUpdates.ts`

In `useRecentSubjects`, replace the "collect distinct levels" logic with "pick latest level":

```ts
const { data: objRows } = await supabase
  .from('objectives')
  .select('subject_id_uuid, level, id')
  .in('subject_id_uuid', ids)
  .order('id', { ascending: false }); // latest first

const latestLevelBySubject = new Map<string, string>();
(objRows ?? []).forEach((o: any) => {
  if (!o.subject_id_uuid || !o.level) return;
  if (!latestLevelBySubject.has(o.subject_id_uuid)) {
    latestLevelBySubject.set(o.subject_id_uuid, o.level); // first seen = latest
  }
});

return subjects.map((s: any) => ({
  ...s,
  level: latestLevelBySubject.get(s.id) ?? null,
}));
```

The synthetic field becomes `level: string | null` (singular) instead of `levels: string[]`.

### UI change — `src/pages/admin/RecentUpdates.tsx`

Replace the Subjects "Level" cell:

```tsx
{ key: 'level', label: 'Level', render: r =>
    <Badge variant="outline">{r.level ? r.level.toUpperCase() : '—'}</Badge>
}
```

Single chip per subject. `—` when no objectives exist yet.

## Files touched
- **Edit**: `src/hooks/admin/useRecentUpdates.ts` — swap Set-based aggregation for "first seen latest id" map
- **Edit**: `src/pages/admin/RecentUpdates.tsx` — render single `level` chip instead of `levels.map(...)`

No schema change, no new query (the existing `objectives` query gains an `order` clause and an `id` column).

## Caveat to confirm after deploy
If objectives don't get inserted in level order (e.g. an older import added CM1 last for a subject that already had 3EME), the displayed level will reflect insertion order, not pedagogical recency. If that's wrong for your data, we can switch the rule to "highest grade" (e.g. lycée > collège > primary) — let me know.

