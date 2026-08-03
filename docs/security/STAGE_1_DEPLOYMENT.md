# Stage 1 Deployment

Status: draft only. Do not run in production yet.

Current blockers as of August 3, 2026:

- local/disposable Supabase validation was not executed in this environment because Docker is unavailable
- `npm audit` is reduced to 2 high vulnerabilities, both still present in the latest published `react-router` / `react-router-dom` line

## Planned order

1. Confirm branch contents and review all security diffs.
2. Validate the Stage 1 migration in a local or disposable Supabase environment.
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
- Tests:
  - `npm test -- --run`
- Targeted lint:
  - `npx eslint <modified files>`
- Migration review:
  - inspect `supabase/migrations/20260803115116_stage_1_security_hardening.sql`
- Migration application:
  - use the approved Supabase deployment flow after explicit production approval

## Rollback trigger

Rollback if any of the following occur after deployment in a non-production validation environment:

- authenticated student flows fail on `ai-chat` or `document-processor`
- admin import workflows fail for valid admins
- quiz-bank visibility calls regress for authenticated students
- new RLS policy blocks required reads/writes

See `STAGE_1_ROLLBACK.md`.
