

The user gave a precise spec — no ambiguity, no need to ask questions. Let me lay out the exact deliverable.

## Plan: multi-subject bundle exporter

### 1. New `Bundle_Rows` header row (13 columns, was 12)

```
bundle_name | include | subject_slug | level_code | domain_code | domain_label | subdomain_code | subdomain_label | objective_text | notes_from_prog | keywords_json | success_criteria_json | tasks_json
```

`bundle_name` is column A so it's the first thing you see. Empty value = "no group" (still exportable when filter is blank).

### 2. Filter input

Use **`Input!B7`** labeled `Export bundle_name (blank = all)`. `setupBundleRowsSheet()` will also write that label/cell into the `Input` sheet if missing. No prompt dialog — sheet cell is friendlier and persists.

### 3. Menu (unchanged shape, same 3 items)

```
Tutorly France
├── Setup Bundle_Rows sheet      ← updated to new headers + Input!B7 label
├── Validate Bundle_Rows         ← updated validations
└── Export bundle.json           ← reads Input!B7 filter, multi-subject safe
```

No new menu items. The existing one becomes filter-aware and multi-subject-safe.

### 4. Code changes in the `.gs` file

**a. Constants**
```js
const BUNDLE_HEADERS = [
  'bundle_name', 'include', 'subject_slug', 'level_code',
  'domain_code', 'domain_label', 'subdomain_code', 'subdomain_label',
  'objective_text', 'notes_from_prog', 'keywords_json',
  'success_criteria_json', 'tasks_json',
];
```

**b. `readBundleRows_()`**
- Read new `bundle_name` column.
- After mapping, apply filter from `Input!B7`:
  - Blank → keep all `include=TRUE` rows.
  - Non-blank → keep only `include=TRUE && bundle_name === filter` rows (case-insensitive trim compare).

**c. `validateRows_(rows)` — add 3 new checks**
- Build a `Map<"slug|||domainCode", domainLabel>` while iterating; if a later row has same key but different label → error `Row N: domain_label mismatch for <slug>/<code> (expected "X", got "Y")`.
- Same for subdomain: `Map<"slug|||domainCode|||subdomainCode", subdomainLabel>`.
- Existing checks stay (subject_slug membership, level_code membership, required fields, JSON parse).

**d. `buildBundleFromRows_(rows)` — fix the collision bug**

Change dedup keys to include `subject_slug`:
```js
const domainKey = `${r.subject_slug}|||${r.domain_code}`;
const subdomainKey = `${r.subject_slug}|||${r.domain_code}|||${r.subdomain_code}`;
```

(Currently uses `subject.id` which is *almost* correct — but spec asks for explicit `subject_slug` form. Functionally equivalent; I'll use the spec's form for traceability.)

**e. `bundle.subjects[]` population**

Currently `subjects` stays empty. Spec says:
> keep `"subjects": []`
> reuse existing subject UUIDs from the fixed mapping

I'll keep `subjects: []` as-is — the importer doesn't need them when the UUIDs already exist in DB (which they do, per `SUBJECT_UUIDS`). Domains/subdomains/objectives reference `subject_id` directly. ✅

**f. `exportBundleJson()` — filename logic**

- If filter (`Input!B7`) non-blank → filename = `bundle_<filterName>.json`.
- If blank but rows span 1 subject → `bundle_<Subject>_<LEVEL>.json` (current behavior preserved when single-subject).
- If blank and rows span multiple subjects → `bundle_multi_<YYYYMMDD-HHmm>.json`.

### 5. What stays identical

- UUID generation, level normalization, JSON parsing, download dialog, Drive copy.
- Importer (`import-curriculum-bundle`) — no changes needed; it already handles multi-subject bundles per the recent fixes.
- `/admin/curriculum` upload flow.

### 6. Deliverable

I'll paste the **complete updated `.gs` file** in chat as one drop-in replacement. You:
1. Open Apps Script editor → paste over the existing file → Save.
2. Reload the spreadsheet.
3. Run **Tutorly France → Setup Bundle_Rows sheet** once to get the new column + the `Input!B7` filter cell (this WILL clear existing data — I'll add a one-line confirmation prompt before clearing).
4. Re-paste your data with the new `bundle_name` column.
5. Optionally type a bundle_name in `Input!B7` to filter, or leave blank for everything.
6. Validate → Export → upload at `/admin/curriculum`.

### 7. Migration note for your existing data

`setupBundleRowsSheet` is destructive today (calls `sh.clear()`). I'll change it to:
- If sheet exists with data → ask "Reset will erase X rows. Continue?" via `ui.alert(YES_NO)`.
- If user picks No → only insert the new `bundle_name` column at position A on the existing sheet (non-destructive upgrade path).

This way your current `Bundle_Rows` data isn't nuked.

