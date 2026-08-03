# Stage 1 Security Test Guide

## Current automated checks

- `npm run build`
- `npx tsc --noEmit`
- targeted `npx eslint` on modified production/security files
- `npm test -- --run` → passes after excluding generated `.claude/worktrees/**` mirror copies from test discovery (`31` files, `189` tests)
- `npm run lint` → still red repo-wide because of unrelated baseline debt (`696` errors, `62` warnings)
- `npm audit --json` → `7` high vulnerabilities, `0` critical

## Staging checks completed on August 3, 2026

Target project:

- staging: `urskkwizwutodikgznas`
- production untouched: `sibprjxhbxahouejygeu`

Completed:

1. Verified branch and Supabase target files point to staging.
2. Deployed the current Edge Functions from `security/stage-1-hardening` to staging.
3. Applied the Stage 1 hardening SQL on staging.
4. Verified:
   - guardian can read linked child explanation rows
   - student cannot read guardian-only explanation rows after legacy policy cleanup
   - admin can read explanation rows
   - admin can insert into `exercise_explanations_cache`
   - guardian insert into `exercise_explanations_cache` is rejected
   - `ai-chat` requires JWT on staging
   - `document-processor` requires JWT on staging
   - full repo migration chain replays successfully from zero on staging
   - `students` has RLS enabled after replay
   - `students` has admin-only policy after replay
5. Ran Supabase advisors against staging.
6. Ran rollback reverse-DDL in a transaction and rolled it back successfully.

## Still required

1. Re-run staging `supabase db lint --linked` after the `create_vault_secret(text, text)` removal.
2. Re-run staging `supabase db advisors --linked` after that same patch.
3. Re-check:
   - anonymous request to `ai-chat` returns 401
   - anonymous request to `document-processor` returns 401
   - anonymous request to `quiz-bank-visible` and `quiz-bank-all` returns 401
   - non-admin authenticated request to `import-curriculum-bundle` returns 403
   - admin authenticated request to `import-curriculum-bundle` succeeds
   - repeated `create-student-account` calls hit 429
   - malformed document payloads return 400/415/413 as appropriate
   - `consume_security_rate_limit` increments atomically under repeated requests

## Environment limitations observed in this workspace

- Docker is not installed in this workspace, so `supabase start` / local containerized validation cannot be completed here.
- The staging project initially had migration drift; that led to multiple historical migration fixes before the clean replay succeeded.
- The agent process could not reliably inherit the interactive shell's `SUPABASE_DB_PASSWORD`, which blocked the final autonomous rerun of staging lint/advisors after the last schema patch.

## Database/RLS checks

- inspect `quiz_bank_variants` existence and confirm RLS state
- verify no unintended client-write path remains on `explanations_cache`
- verify only admin writes remain on `exercise_explanations_cache`
- verify function execute grants after the migration
- verify no legacy duplicate policy names remain active on hardened tables

## Advisor checks

Run and record when available in the validation environment:

- `supabase db advisors`
- any local SQL lint or schema checks supported by the installed CLI version
