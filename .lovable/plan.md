

## Goal
The user already has §6 "Per-array object definitions" in `BUNDLE_SCHEMA.md` (added last turn) — but they're asking for it in a **stricter, schema-style format**: every entity shown as a typed schema snippet (Option A) AND a real, fully-wired worked bundle (Option B), side by side, in one place that's easy to copy.

I'll add a new dedicated reference file that delivers exactly both formats they asked for, cross-checked against the live Supabase schema (verified via `<supabase-tables>` in context).

## What gets created

**New file: `curriculum-import/BUNDLE_OBJECT_REFERENCE.md`**

Two parallel sections so the user can pick whichever style they prefer:

### Part A — Typed schema snippets (one per array)

For each of the 8 arrays, a JSON snippet using type placeholders (`"uuid"`, `"string"`, `"string|null"`, `"string[]"`) showing:
- Every field the importer accepts
- Required vs optional marked with `// required` / `// optional` comments
- Allowed enum values inline (e.g. `"level": "cp|ce1|ce2|cm1|cm2|6eme|5eme|4eme|3eme"`)
- FK target inline (e.g. `"subject_id": "uuid → subjects.id"`)

Covers: `subjects`, `domains`, `subdomains`, `objectives`, `success_criteria`, `tasks`, `topic_objective_links`, `lessons`.

### Part B — Real working bundle

A complete, copy-pasteable `bundle.json` for **5eme Mathematics → Numbers → Fractions** containing:
- 1 subject (reusing the existing mathematics UUID)
- 1 domain (`NUMBERS`)
- 1 subdomain (`FRAC`)
- 2 objectives
- 3 success criteria (mapped across both objectives)
- 4 tasks (mix of `mcq`, `open`, `numeric`, `short`)
- Empty `topic_objective_links` and `lessons` (with comment explaining why)

Every UUID lowercased and distinct. Every FK resolves inside the bundle. This is the "Option B" the user explicitly asked for — a known-good bundle to reverse-engineer.

### Part C — Field decision matrix

A single compact table answering "is this field required?" for every field across every entity, so the user can scan in one view:

```text
Entity            Field              Required  Notes
subjects          id                 yes       reuse from §4 if subject exists
subjects          slug               yes       must be one of 5 known slugs
subjects          country_code       yes       lowercase ISO ('fr')
subjects          language           no        defaults to 'en'
...
```

## Files touched

- **Create**: `curriculum-import/BUNDLE_OBJECT_REFERENCE.md` (~250 lines)
- **Edit**: `curriculum-import/BUNDLE_SCHEMA.md` — add a one-line pointer at the top of §6 directing readers to the new file for the strict typed view
- **Leave alone**: `SUPABASE_TABLES.md`, `BUNDLE_FORMAT.md`, `README.md`

No code, no DB changes.

