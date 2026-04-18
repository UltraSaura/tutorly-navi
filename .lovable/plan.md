

## Real root cause (finally pinned down)

Three independent unique constraints on `domains`:
1. `domains_pkey` on `domain` (text)
2. `uq_domains_subject_code` on `(subject_id, code)` ← this one is biting you now
3. (the `id` UUID PK)

Your first failed import left exactly **one orphan row**: `(subject_id=francais, code='LECTURE', domain='8e5f05b5_LECTURE')`. Every retry inserts `(francais, 'LECTURE', 'francais_CM1_LECTURE')` → `domain` differs (so `onConflict: 'domain'` adds a new row instead of updating) → `(subject_id, code)` collides → 23505. Same pattern will happen for every domain code in every future bundle.

The earlier guesses about hallucinated UUIDs were wrong. `8e5f05b5-...` IS the real `francais` UUID.

## Plan — 3 tightly scoped fixes

### Fix 1: One-shot DB cleanup (clears the current jam)
Migration: delete the orphan row(s) where `domain` doesn't match the new `${slug}_${LEVEL}_${CODE}` convention. Specifically purge `domains` rows whose `domain` starts with the subject UUID prefix (legacy auto-generated pattern: `8e5f05b5_*`, `f34e5bb1_*`, etc.) and the matching `subdomains` orphans. This unblocks your existing `bundle_Francais_CM1_FIXED-2.json` immediately.

### Fix 2: Importer change `onConflict` to the right key
In `supabase/functions/import-curriculum-bundle/index.ts`, change:
- `domains` upsert: `onConflict: 'subject_id,code'` (not `'domain'`)
- `subdomains` upsert: `onConflict: 'subject_id,domain,code'` (or whatever its real composite uniq is — I'll verify with `pg_indexes` before writing)
- Also: when "Replace existing data" is checked, `DELETE FROM domains WHERE subject_id = $bundle_subject_id AND level_filter_matches` so re-imports for the same subject/level start fresh.

This makes re-imports truly idempotent regardless of legacy text-key drift.

### Fix 3: Correct your Apps Script generator
I need to see the actual `.gs` script and the `Input` / `Sources` / `Objectives` tab columns to fix the field mapping properly. The sheet preview is locked behind Drive auth — `gviz` only returns the README tab.

**Two options to give me access (pick one):**
- **(A)** Open the sheet → Share → "Anyone with the link: Viewer" → re-send the URL. I'll read every tab via `gviz` CSV export and the script via the Apps Script project link.
- **(B)** Paste the `.gs` script content directly in chat + paste the `Input` and `Objectives` tab headers (just the column names + 2-3 sample rows). Fastest.
- **(C)** Link the **Google Sheets connector** (you picked this earlier). I'll then read the sheet via gateway. Note: this still won't expose Apps Script source — I'd need that pasted separately.

Once I have the script, I'll rewrite it so its output:
- Uses real subject UUIDs from a hardcoded `SUBJECTS` map (looked up by slug, not invented)
- Builds `domain` / `subdomain` legacy keys as `${slug}_${LEVEL}_${CODE}` (collision-proof, matches importer's `onConflict`)
- Normalizes `level` to canonical casing (`CP`, `CE1`, `CM1`, `6e`, `5e`, `4e`, `3e`, `2nde`, `1re`, `Tle`)
- Emits `mode: 'replace'` automatically
- Validates the output against the bundle schema before writing the JSON file

### What you'll see when done
- Migration run → orphan `(francais, LECTURE)` row gone
- Edge function patched + redeployed → re-imports stop failing on `(subject_id, code)` collisions
- Updated `.gs` script (I'll paste the full file in chat — you copy-paste back into Apps Script)
- Your existing `bundle_Francais_CM1_FIXED-2.json` imports cleanly on first try

### Blocker
**I need access to the Apps Script source + the Input/Objectives tab structure before I can fix Fix 3.** Pick A, B, or C above and reply.

