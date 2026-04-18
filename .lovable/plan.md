

User wants the simplest possible path. Let me think clearly.

Current state:
- Edge function `import-curriculum-bundle` exists, deployed, accepts a bundle JSON, dual-writes UUID + legacy columns
- Local `curriculum-import/import.js` does the same thing locally via service role key
- Both work. Edge function is simpler — no local setup, no service role key handling, deploys automatically.

Simplest path = use edge function only. User just needs:
1. A bundle JSON file (already produced by their transformer → `output.json`)
2. One curl command with their auth token

But edge function requires admin JWT (`verify_jwt = true` + admin role check). User needs to get their token. Two ways:
- From the admin UI in browser (DevTools → Application → Local Storage → supabase auth token)
- Or build a tiny admin UI button that calls `supabase.functions.invoke('import-curriculum-bundle', { body: bundle })`

The cleanest "one path" answer: **add an Import button to the admin learning page** that lets them upload `output.json` and pipes it to the edge function. Zero local scripts. Zero token copying. One click.

This is what I'll propose.

Let me check what's at `/admin/learning` to know where to add the button.

Plan: Add an "Import Curriculum Bundle" button on the admin learning page that:
1. Opens a file picker (`.json`)
2. Reads the file
3. Calls `supabase.functions.invoke('import-curriculum-bundle', { body: parsedJson })`
4. Shows toast with result counts + verification

No local Node, no service role keys, no curl, no token copying. The user is already authenticated as admin in the browser.

Keep it concise.

---

## Simplest path: one button in the admin UI

No local scripts. No commands. No tokens to copy. You're already logged in as admin in the browser.

### What I'll add

A single **"Import Curriculum Bundle"** button on `/admin/learning` that:
1. Opens a file picker for your `output.json`
2. Sends it to the existing `import-curriculum-bundle` edge function
3. Shows a toast with the import counts and verification result (`ready_for_phase_3: true/false`)

### Your workflow becomes

1. Run your transformer locally to produce `output.json` (you already do this)
2. Open `/admin/learning` in the app
3. Click **Import Curriculum Bundle**
4. Pick `output.json`
5. Done

### What you do NOT need

- No `node import.js`
- No service role key in a local `.env`
- No `curl` with bearer tokens
- No pulling repo changes — once I add the button, just refresh the preview

### The one file I'll touch

A single React component on the admin learning page. The edge function is already deployed and stays as-is.

### Files I'll modify

- `src/pages/admin/AdminLearning.tsx` (or whichever component renders `/admin/learning` — I'll locate it) — add the upload button + handler

### What stays the same

- `supabase/functions/import-curriculum-bundle/index.ts` — already deployed, no changes
- `curriculum-import/import.js` — stays in repo as a fallback but you don't need to use it

### Result

After approval and implementation: refresh the preview, go to `/admin/learning`, click the new button, pick your JSON file. That's the entire flow.

