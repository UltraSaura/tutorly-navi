

## Goal
Stop tracking `.env` (and related env files) in git so the publishable Supabase keys currently committed at the repo root are no longer exposed in the repository. Keep the local `.env` file on disk so the app keeps working — only change git tracking + ignore rules.

## Current state
- `.env` is committed at the repo root and contains `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`.
- The root `.gitignore` does **not** list `.env*` (only `curriculum-import/.gitignore` does, scoped to that subfolder).
- These values are *publishable* (anon) keys — safe to embed in client bundles, but per your request we'll stop tracking them anyway. The app will keep working because `src/integrations/supabase/client.ts` already has the same values hardcoded as fallbacks.

## Changes

### 1. Update root `.gitignore`
Add an env-files block so all common env variants are ignored going forward:

```
# Local environment files — never commit
.env
.env.local
.env.*.local
.env.production
.env.development
```

### 2. Stop tracking the existing `.env` file
The file stays on disk (so Vite still loads it locally); only its git-tracking entry is removed. This is done as part of the same commit as the `.gitignore` change.

### 3. Verify nothing else leaks
- Confirm `src/integrations/supabase/client.ts` only contains the *publishable* anon key (already true — it's fine, that key is meant to ship to the browser).
- No other file should be modified to embed secrets. The hardcoded fallback in `client.ts` stays as-is (it's the same publishable key already shipping in the built JS bundle).

## Important note on the leaked values
Even after this change, **the `.env` keys remain in git history**. Since they're publishable (anon) keys protected by RLS, that's not a credential emergency — but if you want them fully scrubbed, you'd need a history rewrite (`git filter-repo`) which Lovable can't do from here; you'd run it locally on the GitHub-synced repo. Let me know if you want guidance on that as a follow-up.

## Files touched
- **Edit**: `.gitignore` (root) — add env-file ignore block
- **Untrack**: `.env` — remove from git index, keep on disk
- **Leave alone**: `.env` contents, `src/integrations/supabase/client.ts`, all other code

No code logic changes, no DB changes, no edge function changes.

