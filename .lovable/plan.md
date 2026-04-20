

## Goal
The current `BUNDLE_SCHEMA.md` already documents all 8 arrays at the field level (tables of `field` → `DB column` → `required` → `notes`), but it does NOT show concrete JSON object shapes for each array except inside one combined "full worked example" at the bottom. You want a per-array **object definition** — the literal JSON shape of one element of each array, with inline annotations — so a bundle author can copy-paste each block.

## What gets added

A new section **"6. Per-array object definitions"** inserted into `curriculum-import/BUNDLE_SCHEMA.md` between the existing field-by-field reference (§5) and the canonical level codes (current §6, renumbered to §7). Subsequent sections shift down by one number.

For each of the 8 arrays, the new section provides:

1. **Canonical JSON object** — one element with every supported field present (required + optional), realistic values, lowercase UUIDs.
2. **Inline `// comments`** flagging: required vs optional, auto-derived columns, FK targets, allowed enum values.
3. **Minimal-required variant** — the smallest valid object (only required fields) so authors see the floor.
4. **One-line "wire-up" note** — what UUIDs this object must reference from sibling arrays.

### Arrays covered (in dependency order)

1. `subjects[]` — full + minimal, callout on reusing the 5 known UUIDs from §4
2. `domains[]` — full + minimal, note on `domain` legacy auto-fill from `code`
3. `subdomains[]` — full + minimal, note on `id` → `id_new` UUID quirk
4. `objectives[]` — full + minimal, enum list for `level` (cp…3eme), `keywords` array shape
5. `success_criteria[]` — full + minimal, FK to `objectives.id`
6. `tasks[]` — full + minimal, enum lists for `type` (`mcq`/`open`/`numeric`/`short`), `difficulty` (`easy`/`core`/`stretch`), `source` (`manual`/`auto`)
7. `topic_objective_links[]` — full + minimal, "skip unless topic UUIDs already exist" warning
8. `lessons[]` — full + minimal, jsonb array shape for `objective_ids` and `success_criterion_ids`

### Section ordering after the edit

```text
1. Overview
2. Top-level shape
3. Hard rules
4. Existing subject UUIDs
5. Field-by-field reference          (unchanged)
6. Per-array object definitions      ← NEW
7. Canonical level codes (France)    (was 6)
8. Full worked example               (was 7)
9. Validation checklist              (was 8)
10. How to upload                    (was 9)
```

## Files touched

- **Edit**: `curriculum-import/BUNDLE_SCHEMA.md` — insert §6, renumber §6–§9 to §7–§10
- **Leave alone**: `SUPABASE_TABLES.md`, `BUNDLE_FORMAT.md`, `README.md`

No code, no DB changes.

