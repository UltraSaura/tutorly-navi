# Stage 1 Rollback

Status: draft only. No production rollback has been executed.

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

## Migration rollback notes

The Stage 1 migration introduces:

- `security_rate_limits`
- `security_audit_events`
- `consume_security_rate_limit(...)`
- policy changes on:
  - `quiz_bank_variants` (if present)
  - `explanations_cache`
  - `exercise_explanations_cache`
- execute grant changes on selected functions

Rollback SQL must reverse each of those in the same order as dependency requirements dictate. Final exact rollback SQL should be written only after the migration has been validated locally and the final function list is frozen.
