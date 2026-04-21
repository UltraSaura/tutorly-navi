

## Goal
Make `import-curriculum-bundle` accept the **service-role key** as a valid `Authorization: Bearer …` token, so the unattended pipeline (CI/cron/server) can call it without a user session. Admin-user JWTs continue to work unchanged.

## Change

**Edit:** `supabase/functions/import-curriculum-bundle/index.ts` — auth block (around lines 142–165).

Replace the current "must be admin user" check with a two-path authorizer:

```ts
const token = authHeader.replace('Bearer ', '');
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

let isAuthorized = false;
let callerLabel = 'unknown';

if (token === SERVICE_KEY) {
  // Path 1: server-to-server (CI, cron, importer pipeline)
  isAuthorized = true;
  callerLabel = 'service-role';
} else {
  // Path 2: admin user session (existing /admin/curriculum UI flow)
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (!authError && user) {
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin');
    if (roles && roles.length > 0) {
      isAuthorized = true;
      callerLabel = `admin:${user.id}`;
    }
  }
}

if (!isAuthorized) {
  return jsonResponse({ success: false, error: 'Unauthorized' }, 200);
}
console.log(`[import-curriculum-bundle] authorized as ${callerLabel}`);
```

Nothing else in the function changes — the bundle parsing, transformation, and DB writes are untouched.

## Why this is safe

- The service-role key already grants full DB access. Anyone holding it can write to `subjects`, `objectives`, etc. directly. Letting it call this function is **not a new privilege** — it's a more structured way to do what the key can already do.
- The user-session path is preserved exactly, so the in-app `/admin/curriculum` uploader keeps working with no behavior change.
- A `console.log` records which path authorized each call → easy to audit in edge function logs.

## What you do after deploy

Your pipeline keeps sending exactly what it sends today:

```
POST https://sibprjxhbxahouejygeu.supabase.co/functions/v1/import-curriculum-bundle
Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
apikey: <SUPABASE_SERVICE_ROLE_KEY>   (or the anon key — both work)
Content-Type: application/json

<bundle JSON body>
```

The previous `Unauthorized` error will be replaced with the normal `{ success: true, summary: {...} }` response.

## Files touched

- **Edit**: `supabase/functions/import-curriculum-bundle/index.ts` (auth block only, ~20 lines)
- **Leave alone**: all other edge functions, the SQL migrations, the importer script (`curriculum-import/import.js`), the admin UI (`CurriculumManager.tsx`), all docs

No DB migration. No new secret (`SUPABASE_SERVICE_ROLE_KEY` is already set — visible in the secrets list). Auto-deploys after the edit.

## After deploying — quick verification

I'll tail the function logs and look for `authorized as service-role` on your next pipeline run. If anything else trips (e.g. payload shape mismatch), the logs will show the next error and we iterate from there.

