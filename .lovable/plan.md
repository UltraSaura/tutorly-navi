

The user wants a plain-English changelist they can hand to ChatGPT to modify their `tutorly_bundle_exporter.gs` file. No code execution from me — just a clear spec.

## Changes to apply to `tutorly_bundle_exporter.gs`

### 1. Header constant — replace existing `BUNDLE_HEADERS`

Old (12 columns):
```
include | subject_slug | level_code | domain_code | domain_label | subdomain_code | subdomain_label | objective_text | notes_from_prog | keywords_json | success_criteria_json | tasks_json
```

New (13 columns, `bundle_name` added as **column A**):
```
bundle_name | include | subject_slug | level_code | domain_code | domain_label | subdomain_code | subdomain_label | objective_text | notes_from_prog | keywords_json | success_criteria_json | tasks_json
```

### 2. `setupBundleRowsSheet()` — make non-destructive

- If `Bundle_Rows` exists AND has data rows: show `ui.alert('Reset will erase N rows. Continue?', YES_NO)`.
  - **Yes** → current behavior (clear + write headers).
  - **No** → call `sh.insertColumnBefore(1)` then write `'bundle_name'` into `A1`, leave existing rows intact (they get a blank `bundle_name`).
- Also ensure the `Input` sheet has, at row 7:
  - `A7` = `Export bundle_name (blank = all)`
  - `B7` = empty (user fills it).

### 3. `readBundleRows_()` — read new column + apply filter

- Add `bundle_name` to the row mapper (it's now column index 0; everything else shifts by +1).
- After mapping, read filter: `const filter = String(SpreadsheetApp.getActive().getSheetByName('Input').getRange('B7').getValue() || '').trim();`
- Filter logic:
  - Always require `row.include === true`.
  - If `filter` is non-empty: also require `row.bundle_name.trim().toLowerCase() === filter.toLowerCase()`.

### 4. `validateRows_(rows)` — add 2 new consistency checks

Add these BEFORE the existing per-row checks return:

```js
const domainLabelMap = new Map();   // key: "slug|||domainCode" → label
const subdomainLabelMap = new Map(); // key: "slug|||domainCode|||subdomainCode" → label

rows.forEach((r, i) => {
  const dKey = `${r.subject_slug}|||${r.domain_code}`;
  if (domainLabelMap.has(dKey) && domainLabelMap.get(dKey) !== r.domain_label) {
    errors.push(`Row ${i + 2}: domain_label mismatch for ${r.subject_slug}/${r.domain_code} (expected "${domainLabelMap.get(dKey)}", got "${r.domain_label}")`);
  } else {
    domainLabelMap.set(dKey, r.domain_label);
  }

  const sKey = `${r.subject_slug}|||${r.domain_code}|||${r.subdomain_code}`;
  if (subdomainLabelMap.has(sKey) && subdomainLabelMap.get(sKey) !== r.subdomain_label) {
    errors.push(`Row ${i + 2}: subdomain_label mismatch for ${r.subject_slug}/${r.domain_code}/${r.subdomain_code} (expected "${subdomainLabelMap.get(sKey)}", got "${r.subdomain_label}")`);
  } else {
    subdomainLabelMap.set(sKey, r.subdomain_label);
  }
});
```

Existing checks stay (subject_slug must be in `SUBJECT_UUIDS`, level_code valid, required fields present, JSON parses).

### 5. `buildBundleFromRows_(rows)` — collision-safe dedup keys

Find the lines that build `domainKey` / `subdomainKey` (currently they likely use `subject.id` or just `domain_code`). Replace with:

```js
const domainKey = `${r.subject_slug}|||${r.domain_code}`;
const subdomainKey = `${r.subject_slug}|||${r.domain_code}|||${r.subdomain_code}`;
```

Keep the rest of the function identical. `bundle.subjects` stays `[]`.

### 6. `exportBundleJson()` — filename logic

After building the bundle, compute filename:

```js
const filter = String(SpreadsheetApp.getActive().getSheetByName('Input').getRange('B7').getValue() || '').trim();
const uniqueSubjects = [...new Set(rows.map(r => r.subject_slug))];
let filename;
if (filter) {
  filename = `bundle_${filter.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
} else if (uniqueSubjects.length === 1) {
  const subj = SUBJECT_UUIDS[uniqueSubjects[0]].name.replace(/\s+/g, '');
  const lvl = rows[0].level_code.toUpperCase();
  filename = `bundle_${subj}_${lvl}.json`;
} else {
  const ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmm');
  filename = `bundle_multi_${ts}.json`;
}
```

### 7. No menu changes

`onOpen()` keeps the same 3 items — they all become filter-aware automatically because they call the updated functions.

---

## What ChatGPT should NOT touch

- `SUBJECT_UUIDS` mapping (already correct).
- `LEVEL_NORMALIZATION` / level validation logic.
- UUID generator.
- Drive save + HTML download dialog.
- The `subjects: []` in the output bundle (importer doesn't need it).

---

## Quick prompt you can paste into ChatGPT

> Apply these 6 changes to my Google Apps Script file `tutorly_bundle_exporter.gs`. Keep everything else identical. Return the full updated file.
>
> 1. Add `bundle_name` as the first column in `BUNDLE_HEADERS` (13 cols total).
> 2. In `setupBundleRowsSheet`, prompt YES/NO before clearing existing rows; on NO, just `insertColumnBefore(1)` and set `A1 = 'bundle_name'`. Also write `Input!A7 = 'Export bundle_name (blank = all)'`.
> 3. In `readBundleRows_`, read the new `bundle_name` column. Read filter from `Input!B7`. Keep rows where `include===true` AND (filter empty OR `bundle_name` matches filter, case-insensitive).
> 4. In `validateRows_`, add checks: error if same `(subject_slug, domain_code)` has different `domain_label`, or same `(subject_slug, domain_code, subdomain_code)` has different `subdomain_label`.
> 5. In `buildBundleFromRows_`, change dedup keys to `${subject_slug}|||${domain_code}` for domains and `${subject_slug}|||${domain_code}|||${subdomain_code}` for subdomains.
> 6. In `exportBundleJson`, compute filename: `bundle_<filter>.json` if filter set, else `bundle_<Subject>_<LEVEL>.json` if single subject, else `bundle_multi_<yyyyMMdd-HHmm>.json`.

