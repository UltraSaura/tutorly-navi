## Goal

Make the existing admin flow at `/admin/models` → "Add New Key" work end-to-end:
1. Saving a DeepSeek (or any provider) key from the admin UI succeeds.
2. The AI runtime (edge functions) actually uses the key stored from the admin UI, falling back to the existing Edge Function secret if no admin-managed key exists.

## Root cause recap

- `supabase/functions/manage-api-keys` tries to write the secret into Supabase Vault via raw `INSERT INTO vault.secrets` (RPC `create_vault_secret`) and via `supabase.from('vault.secrets')`. Both fail — Vault requires `vault.create_secret(secret, name)`, and the `vault` schema isn't exposed to PostgREST. Result: every "add" attempt 500s with `Vault storage error: {}`.
- Even if storage worked, no AI provider reads from `ai_model_keys` — they all read `Deno.env.get('DEEPSEEK_API_KEY')` etc. So admin-managed keys are never used at runtime.

## Plan

### 1. Fix `manage-api-keys` edge function

- Drop the Vault write path entirely (RPC + `from('vault.secrets')` fallback).
- Insert directly into `public.ai_model_keys` with `key_value` = the real key (admin-only via RLS; service-role insert from the function).
- Keep the obfuscated value computation but return it only to the client; store the real key server-side.
- `retrieve` action: read `key_value` straight from `ai_model_keys` (no Vault lookup).
- `delete` action: keep soft-delete (`is_active = false`).
- Improve error responses: return the actual Postgres/Vault error message so the client toast is meaningful.

### 2. Hide the real key from non-admin reads

- Add a column `ai_model_keys.key_value_masked` (text) and a trigger that auto-fills it on insert/update from `key_value`.
- Update RLS on `ai_model_keys` so:
  - Admins: full select (real + masked).
  - Non-admins: no select.
- Client hook `useAiModelManagementSecure` already only renders the obfuscated form, so no UI change needed.

(If you prefer minimal DB change, we can skip the masked column and just keep the existing `key_value` field holding the full key — admins-only RLS still protects it. I'll default to this simpler option unless you say otherwise.)

### 3. Wire AI providers to use admin-managed keys

Update the existing key-lookup helper used by edge functions (or add one in `supabase/functions/_shared/`) with this resolution order, per provider:

```
1. Look up the most recent active row in ai_model_keys
   joined to ai_model_providers by name (e.g. 'DeepSeek').
2. If found, use that key_value.
3. Otherwise, fall back to Deno.env.get('<PROVIDER>_API_KEY').
4. If neither exists, throw a clear "no key configured" error.
```

Apply this in:
- `supabase/functions/ai-chat/providers/deepseek.ts`
- `supabase/functions/ai-chat/providers/openai.ts` (if present — same pattern)
- Any other provider files under `supabase/functions/ai-chat/providers/`

Cache the lookup per cold-start (module-level `Map<provider, key>`) to avoid a DB roundtrip on every chat call; clear on key add/delete by bumping a version row (or simply accept up to ~1 cold-start latency — acceptable since admin key changes are rare).

### 4. Client-side error surfacing

In `src/hooks/useAiModelManagementSecure.ts`, change the `addApiKey` catch to read `error.message` / `error.context` from the invoke response and show it in the toast instead of a generic "Failed to add API key".

### 5. Verification

- From `/admin/models` → "Add New Key" → add a DeepSeek key → toast says success, key appears in the list with obfuscated value.
- Check `ai_model_keys` row exists with `is_active = true`.
- Trigger a tutor chat → edge function logs confirm DeepSeek call succeeded using the admin-managed key (add a one-line `[DeepSeek] key source: db|env` log).
- Soft-delete the key → next chat falls back to `DEEPSEEK_API_KEY` env secret.

## Files to change

- `supabase/functions/manage-api-keys/index.ts` (rewrite add/retrieve/delete to use `ai_model_keys` only)
- `supabase/functions/ai-chat/providers/deepseek.ts` (key resolution)
- `supabase/functions/ai-chat/providers/openai.ts` (same — if applicable)
- `supabase/functions/_shared/resolveProviderKey.ts` (new helper)
- `src/hooks/useAiModelManagementSecure.ts` (better error toast)
- Migration: tighten RLS on `ai_model_keys` (admin-only select); optionally drop unused `vault_secret_name` column and the `create_vault_secret` RPC.

## Out of scope

- Encrypting keys at rest (would require properly using `vault.create_secret` + `vault.decrypted_secrets` view). Can be done later as a follow-up; admin-only RLS is sufficient for now.
- Per-environment key sets, key rotation history, usage metering.
