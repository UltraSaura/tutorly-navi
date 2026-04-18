

## Root cause

The `domains` table has a legacy NOT NULL text column called `domain` that the importer auto-fills with `${subject_id_prefix}_${code}` (or similar) when the bundle omits it. That synthetic key — `8e5f05b5_LECTURE` — already exists from a previous import. The "Replace existing data" path deletes by `subject_id`, but the existing `LECTURE` row was inserted under a *different* subject_id (likely the real `francais` UUID, not `8e5f05b5-77f9-5ccb-a064-398a25e2cdfa`), so it survives the delete and then collides on insert.

There's also a **second bug in the bundle itself**:

- `subject_id` `8e5f05b5-77f9-5ccb-a064-398a25e2cdfa` — this is **not** one of the 5 real subject UUIDs in the DB. It looks like ChatGPT hallucinated a UUID instead of using the real `francais` UUID from the prompt.
- The file is named `Mathematiques_CP` but the content is French reading (`LECTURE`, `Compréhension`, "Lire avec fluidité") — wrong subject entirely.
- `level` is `"cm1"` but the file claims CP.
- `subjects: []` — should include the subject row OR the real subject UUID must be referenced.

## What I'll do (no code changes — diagnostic + fix path)

### Step 1 — Verify the real subject UUIDs in the DB
Run a read-only query against `subjects` to get the actual UUIDs and confirm `8e5f05b5-...` doesn't exist there.

### Step 2 — Find the conflicting row
Query `domains` for `domain = '8e5f05b5_LECTURE'` to see which subject_id it's tied to and confirm why "Replace" didn't clear it.

### Step 3 — Update `curriculum-import/CHATGPT_PROMPT.md`
Add a hard rule that fixes this class of error permanently:

> **Every domain/subdomain MUST include an explicit `domain` field** set to a globally-unique string in the form `<subject_slug>_<LEVEL>_<CODE>` (e.g. `mathematics_CP_NUMBERS`). Never rely on the importer to auto-generate it. Same rule for `subdomains.subdomain` → `<subject_slug>_<LEVEL>_<DOMAIN_CODE>_<CODE>`.

This makes the legacy text key collision-proof across re-imports and across subjects.

Also tighten the existing rules:
- Re-emphasize the 5 real subject UUIDs (with a "DO NOT invent UUIDs for subjects" warning).
- Require the bundle filename to match the actual content (subject + level).
- Require `level` to use canonical casing (`CP`, `CE1`, `CM1`, `6e`, etc.) — not `cm1`.

### Step 4 — Tell you exactly how to fix THIS bundle right now
Two options:
- **A (fastest)**: Manually edit the file — replace the bogus subject_id with the real `francais` UUID (from Step 1), add explicit `domain` / `subdomain` legacy keys prefixed with `francais_CM1_`, and re-upload with "Replace existing data" ticked. Or just rename the file and treat it as a French CM1 reading bundle.
- **B (cleaner)**: Re-generate from ChatGPT using the updated prompt — paste the *real* `francais` UUID into the request, and ask for "Français CM1 — Lecture/Compréhension" properly.

### What you'll see after
- Updated `CHATGPT_PROMPT.md` with the new uniqueness rule + UUID guardrails.
- A short post-mortem in chat with the exact UUID to substitute and a one-paragraph "regenerate prompt" you can paste into ChatGPT.

No edge-function or app code changes — the importer behavior is fine; the bundle generation rules need to be stricter.

