# Stage 1 Deployment

Status: draft only. Do not run in production yet.

Current deployment-review exceptions as of August 4, 2026:

- the clean replay now succeeds on staging `urskkwizwutodikgznas`, `create_vault_secret(text, text)` is removed, and staging lint is clean; remaining deployment-review exceptions are advisor-warning triage and `2` remaining `react-router` audit highs
- staging validation found and fixed two Stage 1 migration issues:
  - legacy explanation policy name `Guardians view children explanations` also had to be dropped
  - function grant cleanup needed `REVOKE ALL PRIVILEGES ... FROM PUBLIC, ...`
- additional staging validation fixes were required:
  - `public.students` needed RLS enabled plus admin-only policy
  - the unused `public.create_vault_secret(text, text)` helper now needs to be removed from the active schema surface
- Supabase advisors still report broader existing security/performance debt on staging outside the narrow Stage 1 scope
- `npm audit` now reports `2` high vulnerabilities in the current dependency tree, both in `react-router` / `react-router-dom`

## Planned order

1. Confirm branch contents and review all security diffs.
2. Replay the full repo migration chain in a clean disposable Supabase environment.
3. Run build, targeted lint, security tests, migration validation, and advisors.
4. Deploy updated Edge Function code.
5. Apply the Stage 1 migration.
6. Verify:
   - protected functions reject anonymous callers
   - admin-only imports reject non-admin authenticated callers
   - `ai-chat` and `document-processor` succeed for authenticated users only
   - `quiz_bank_variants` RLS is enabled if the table exists
   - no hardcoded bearer-token fallback remains in the frontend bundle

## Commands to use after validation

- Build:
  - `npm run build`
- Type check:
  - `npx tsc --noEmit`
- Tests:
  - `npm test -- --run`
- Targeted lint:
  - `npx eslint <modified files>`
- Migration review:
  - inspect `supabase/migrations/20260803115116_stage_1_security_hardening.sql`
- Migration application:
  - use the approved Supabase deployment flow after explicit production approval

## Validated on staging as of August 4, 2026

- staging project used: `urskkwizwutodikgznas`
- production project not modified: `sibprjxhbxahouejygeu`
- staged function deployment completed successfully
- `ai-chat` and `document-processor` now require JWT on staging
- Stage 1 database hardening was applied and validated on the staging baseline
- full clean replay from zero completed successfully on staging
- `students` no longer appears as an RLS-disabled table after replay
- rollback reverse-DDL dry-run succeeded inside a transaction

This is enough for branch-level validation and deployment review. Production approval still requires explicit sign-off on the remaining advisor warnings and the `react-router` audit exception, or follow-up remediation tickets that are accepted as release exceptions.

## Rollback trigger

Rollback if any of the following occur after deployment in a non-production validation environment:

- authenticated student flows fail on `ai-chat` or `document-processor`
- admin import workflows fail for valid admins
- quiz-bank visibility calls regress for authenticated students
- new RLS policy blocks required reads/writes

See `STAGE_1_ROLLBACK.md`.
