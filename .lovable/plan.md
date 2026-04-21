

## Goal
On `/admin/recent-updates`, the **Subjects** tab currently shows: Status · Name · Slug · Country · Updated. Add **Level** and **Language** columns so each subject row shows country, level, and language together.

## Change

In `src/pages/admin/RecentUpdates.tsx`, update the `subjects` entry of the `columns` config:

**From:**
```
Status · Name · Slug · Country · Updated
```

**To:**
```
Status · Name · Slug · Country · Level · Language · Updated
```

- **Country** → `country_code` rendered uppercase (e.g. `FR`), `—` if null.
- **Level** → derived from existing data. The `subjects` table has no `level_code` column directly, but levels are linked via `school_levels` (per-country). Since a subject row itself doesn't carry a level, we'll surface the level by reading `level_code` if present on the row (some imports store it there as a denormalised field) and falling back to `—`. If absent across the board, we render `—` and note it in the row detail drawer.
- **Language** → `language` column (already in the `subjects` table, defaults to `'en'`), rendered uppercase (`EN`, `FR`).

## Technical detail

- `useRecentSubjects` already does `select('*')`, so `language` and `country_code` are already in the response — no hook change needed.
- For **Level**: I'll first check if the bundle importer writes a `level_code` to subjects. If yes, render it directly. If not, the column shows `—` and we keep the door open to join `school_levels` later (out of scope for this change — would require a hook tweak).
- Badge styling: small `<Badge variant="outline">` for country/level/language for visual consistency with the existing Objectives "level" column.

## Files touched

- **Edit**: `src/pages/admin/RecentUpdates.tsx` (only the `subjects` entry inside the `columns` object — ~6 lines)
- **Leave alone**: hooks, table component, drawer, row health rules, all other tabs

No DB change, no new query, no migration.

