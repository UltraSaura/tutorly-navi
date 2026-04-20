

## Goal
Reformat `curriculum-import/BUNDLE_OBJECT_REFERENCE.md` Part A so each entity uses a clean **Required / Optional** bullet style (matching how the user wrote up `subjects[]` in their last message), instead of JSONC schema snippets.

## What changes

**Edit only Part A** of `curriculum-import/BUNDLE_OBJECT_REFERENCE.md`. Part B (real working bundle) and Part C (decision matrix) stay untouched — they're already in the right format.

For each of the 8 arrays, replace the JSONC block with:

```text
### N. `entity_name[]`

**Required:**
- `field` — type — short note (FK target / enum values / format rule)
- ...

**Optional:**
- `field` — type — default value, what it controls
- ...

**Wire-up:** one-line note about which sibling array UUIDs this entity references.

**Notes:** any auto-fill / legacy column quirks (only when relevant).
```

### Example of the new format (subjects)

```text
### 1. `subjects[]`

**Required:**
- `id` — uuid v4 — reuse known UUID if subject already exists (see §4 of BUNDLE_SCHEMA.md)
- `slug` — string — one of: `mathematics`, `french`, `english`, `history-geography`, `sciences`
- `name` — string — display name
- `country_code` — string — lowercase ISO (`fr`, `en`, `us`). Drives viewer filtering.

**Optional:**
- `language` — string — defaults to `'en'`
- `color_scheme` — string — defaults to `'blue'`
- `icon_name` — string — lucide-react icon name, defaults to `'BookOpen'`

**Wire-up:** root entity, no FKs.
```

### Arrays reformatted (all 8)

1. `subjects[]`
2. `domains[]` — note `domain` legacy column auto-fills from `code`
3. `subdomains[]` — note `id` is stored as `id_new`; legacy `subdomain` auto-fills from `label`
4. `objectives[]` — list valid `level` enum values
5. `success_criteria[]` — note `subject_id`/`domain_id`/`subdomain_id` auto-derive from parent
6. `tasks[]` — list `type`, `difficulty`, `source` enum values
7. `topic_objective_links[]` — keep the "skip unless topic UUIDs already exist" warning
8. `lessons[]` — note jsonb array shape for `objective_ids` / `success_criterion_ids`

## Files touched

- **Edit**: `curriculum-import/BUNDLE_OBJECT_REFERENCE.md` — replace Part A only (~120 lines changed)
- **Leave alone**: Part B, Part C, validation reflexes section, and all other files

No code, no DB changes.

