# Stage 1 Rollback

Status: staging dry-run validated on August 3, 2026. No production rollback has been executed.

## Trigger conditions

- authentication enforcement blocks intended authenticated users
- admin import workflow is unavailable after deployment
- the migration denies required reads/writes
- severe performance or provider-failure regression appears in `ai-chat` or `document-processor`

## Rollback order

1. Revert Edge Function code to the previous deployed revision.
2. Revert frontend deployment to the previous build if the auth contract changed client behavior.
3. Revert the Stage 1 migration only after confirming which policy/function changes caused the regression.
4. Re-test the previous known-good authenticated flows.

## Stage 1 rollback surface

The Stage 1 migration introduces or changes:

- `security_rate_limits`
- `security_audit_events`
- `consume_security_rate_limit(...)`
- removal of `create_vault_secret(text, text)` if it still exists
- policy changes on:
  - `students`
  - `quiz_bank_variants` (if present)
  - `explanations_cache`
  - `exercise_explanations_cache`
- execute grant changes on selected functions

## Staging rollback dry-run executed

This reverse DDL was executed inside a transaction on staging project `urskkwizwutodikgznas` and then rolled back:

```sql
begin;
drop policy if exists "Admins can view all explanations" on public.explanations_cache;
drop policy if exists "Guardians can view children explanations" on public.explanations_cache;
drop policy if exists "Admins can insert exercise explanations cache" on public.exercise_explanations_cache;
drop policy if exists "Admins can update exercise explanations cache" on public.exercise_explanations_cache;
drop policy if exists "Admins can delete exercise explanations cache" on public.exercise_explanations_cache;
drop table if exists public.security_audit_events;
drop function if exists public.consume_security_rate_limit(text, text, integer, integer);
drop table if exists public.security_rate_limits;
rollback;
```

The dry-run confirmed that the reverse DDL is syntactically valid against the staging schema.

## Remaining rollback gap

This document still does not encode the full production rollback to the exact pre-Stage-1 policy/grant state. In particular, the pre-existing legacy policy/grant surface must be restored intentionally if production rollback is ever required.

Before any production deployment approval:

- capture the exact pre-deploy policy list for `explanations_cache` and `exercise_explanations_cache`
- capture the exact pre-deploy function grants for `get_model_with_fallback`, `has_role`, and the user/profile helper functions
- decide whether `create_vault_secret(text, text)` must be recreated in rollback or can remain removed as dead schema surface
- write the final production rollback SQL from that captured state
