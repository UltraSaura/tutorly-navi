

## Root cause (best inference without logs)

The toast says "Edge Function returned a non-2xx status code" — that's `supabase.functions.invoke` swallowing the real Postgres error. Combined with the table inspection:

- `domains.id` is a **unique column** but the **primary key is `domain` (text)**. Existing demo row has `domain='Lecture'`. The edge function uses `upsert(rows, { onConflict: 'id' })` — works in most cases but the real failure is most likely on a NOT-NULL or constraint downstream that we can't see because the error is hidden.
- Suspects: `objectives.subdomain` NOT NULL with `''` is technically allowed but flagged in some setups; existing leftover rows from earlier tests can clash on `subdomains_domain_subdomain_key` UNIQUE `(domain, subdomain)` if the bundle and existing row both produce `(NULL, 'Compréhension')` → unique violation that `onConflict:'id_new'` does NOT resolve.

## Fix in 3 small edits

### 1. Surface the real error (edge function)
In `supabase/functions/import-curriculum-bundle/index.ts`, when an upsert fails, include the table name + Postgres error code/message/details in the response JSON, and return status 200 with `success: false` so `supabase.functions.invoke` doesn't strip the body.

### 2. Make upserts robust against leftover demo rows
- `subdomains` upsert: pass `domain: null, subdomain: s.label` consistently AND use `onConflict: 'id_new'` (already), but FIRST `delete()` any subdomain row whose `(domain, subdomain) = (null, label)` from prior failed runs.
- Better: **add a `mode: "replace"` switch** in the bundle (defaults to `false`). When `true`, the function `delete()`s existing rows in `domains/subdomains/objectives/success_criteria/tasks` for the targeted `subject_id` before importing. Clean slate, no constraint clashes.

### 3. Show the error in the UI (CurriculumManager.tsx)
Update the import handler to read `response.data?.error` (now populated thanks to fix #1) instead of just `response.error.message`, so the red Alert displays the real Postgres message (e.g. `duplicate key value violates unique constraint "subdomains_domain_subdomain_key"`).

## Files touched

- `supabase/functions/import-curriculum-bundle/index.ts` — wrap each upsert in try/catch, include `{ table, code, message, details, hint }` in response; add optional `mode: "replace"` that deletes prior rows scoped by subject_id
- `src/components/admin/CurriculumManager.tsx` — read `response.data.error` for the failure path; add a small "Replace existing data for this subject" checkbox that injects `mode: "replace"` into the body

## What you do after I implement

1. Refresh `/admin/curriculum`
2. Tick the new "Replace existing data" checkbox
3. Re-upload the same `bundle.json`
4. If it still fails, the real Postgres error will be in the red Alert — paste it back to me and I'll target the exact constraint

