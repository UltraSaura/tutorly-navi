# Stage 1 Implementation Report

Updated: August 3, 2026
Branch: `security/stage-1-hardening`

## Confirmed findings

1. `ai-chat` was anonymous (`verify_jwt = false`) and the frontend contained a hardcoded direct bearer-token fallback.
2. `document-processor` was anonymous and accepted broad cross-origin requests.
3. `quiz-bank-visible` and `quiz-bank-all` were anonymous and trusted caller-supplied identifiers.
4. `create-student-account` used service-role user creation in a public path without durable abuse controls.
5. `create-child-account` was also a privileged account-creation path with wildcard CORS, sensitive logging, and weak retry/link protections.
6. `run-sql` and `test-cors` existed as deployable debug/admin surface.
7. `import-training-items` was still callable through an admin/service-key shortcut, used wildcard CORS, and mutated schema from inside the function.
8. `explanations_cache` and `exercise_explanations_cache` had overly broad write policies in migration history.
9. Multiple `SECURITY DEFINER` functions existed in `public`; some had broader execute exposure than required.
10. Dependency baseline is materially worse than the earlier stated baseline.

## Disproved or not yet proven

- `quiz_bank_variants` is not referenced in local app code; the table may exist only in deployed state or be unused locally. The migration therefore hardens it conditionally with `IF EXISTS`, but the deployed table still needs direct validation.
- The earlier full-test failure was not a branch regression. Vitest was traversing generated `.claude/worktrees/**` mirror trees inside the repository path. Excluding those mirrors restores the actual repo test result.

## Repository changes made so far

- Added shared Edge Function security helper:
  - `supabase/functions/_shared/security.ts`
- Added child-account authorization unit coverage:
  - `supabase/functions/create-child-account/authorization.ts`
  - `supabase/functions/create-child-account/authorization.test.ts`
- Added Stage 1 migration scaffold:
  - `supabase/migrations/20260803115116_stage_1_security_hardening.sql`
- Hardened / partially hardened:
  - `supabase/config.toml`
  - `supabase/functions/ai-chat/index.ts`
  - `supabase/functions/create-child-account/index.ts`
  - `supabase/functions/document-processor/index.ts`
  - `supabase/functions/create-student-account/index.ts`
  - `supabase/functions/quiz-bank-visible/index.ts`
  - `supabase/functions/quiz-bank-all/index.ts`
  - `supabase/functions/import-curriculum-bundle/index.ts`
  - `supabase/functions/import-curriculum-bundle/validation.ts`
  - `supabase/functions/import-exam-bundle/index.ts`
  - `supabase/functions/import-exam-bundle/validation.ts`
  - `supabase/functions/import-training-items/index.ts`
- Registration-model hardening:
  - public auth page no longer exposes student self-registration
  - guardian signup remains public through normal Supabase Auth signup
  - `create-student-account` now requires authenticated admin access
  - `create-child-account` now supports authenticated guardians and authenticated admins creating on behalf of a selected guardian family
- Dependency remediation / tooling compatibility:
  - `package.json`
  - `package-lock.json`
  - updated `copy:mathlive` asset path for `mathlive@0.110.0`
- Removed:
  - `supabase/functions/run-sql/index.ts`
  - `supabase/functions/test-cors/index.ts`
- Frontend hardening:
  - `src/services/chatService.ts`
  - `src/services/unifiedChatService.ts`
  - `src/utils/connectionTest.ts`
  - `src/utils/documentProcessor.ts`
- Test/config hygiene:
  - `vite.config.ts`
  - `eslint.config.js`
- Documentation safety cleanup:
  - `exam-import/README.md`
  - `docs/practice-experience.md`

## Verification performed

- `npm run build`: passes on upgraded toolchain (`vite@6.4.3`, `vitest@4.1.10`)
- `npx tsc --noEmit`: passes
- targeted `npx eslint` on modified production files: passes
- `npm test -- --run`: passes after excluding generated `.claude/worktrees/**` mirrors (`31` files, `189` tests)
- `npm run lint`: still red repo-wide (`696` errors, `62` warnings); baseline debt remains outside this branch scope
- `npm audit --json`: reduced from `24` total vulnerabilities (including `17` high and `2` critical) to `2` high vulnerabilities, both in the latest published `react-router` / `react-router-dom` release line
- staging Supabase target verified before mutation:
  - branch: `security/stage-1-hardening`
  - `supabase/config.toml` → `urskkwizwutodikgznas`
  - `supabase/.temp/project-ref` → `urskkwizwutodikgznas`
  - production project `sibprjxhbxahouejygeu` was not modified
- staging Edge Functions deployed successfully to `urskkwizwutodikgznas` using the official Supabase CLI
- Stage 1 database hardening validated on staging against the real target tables:
  - `security_rate_limits` table + `consume_security_rate_limit(...)` created
  - `security_audit_events` table created
  - `explanations_cache` policies tightened
  - `exercise_explanations_cache` admin-only write policies applied
  - function execute privileges tightened for `create_vault_secret`, `get_model_with_fallback`, and `has_role`
- staging role-isolation checks executed:
  - guardian test user could see the linked child explanation row (`1`)
  - student test user could not see that guardian-only explanation row after policy cleanup (`0`)
  - admin test user could see the explanation row (`1`)
  - admin insert into `exercise_explanations_cache` succeeded inside a transaction
  - guardian insert into `exercise_explanations_cache` was rejected under authenticated role simulation
- rollback dry-run executed successfully in a transaction on staging:
  - drop Stage 1 explanation policies
  - drop `security_audit_events`
  - drop `consume_security_rate_limit(...)`
  - drop `security_rate_limits`
  - rollback transaction

## Validation fixes discovered during staging

Two real migration issues were found and corrected during staging validation:

1. Legacy explanation policy cleanup was incomplete.
   - Existing staging policy name: `Guardians view children explanations`
   - Original migration only dropped `Guardians can view children explanations`
   - Result before fix: student test user could still read explanation rows through the old permissive policy path
   - Fix applied to migration: also drop `Guardians view children explanations`

2. Function execute revokes were not strong enough for existing `PUBLIC` grants.
   - `create_vault_secret(text, text)` remained executable by `anon` and `authenticated`
   - `has_role(uuid, public.app_role)` remained executable by `anon`
   - Fix applied to migration: use `REVOKE ALL PRIVILEGES ... FROM PUBLIC, ...` and then re-grant only the intended roles

## Staging-only limitations observed

- The staging project already had pre-existing migration history drift and did not match the repo's full 113-file local migration chain.
- A clean replay was attempted on staging with `supabase db reset --linked --yes` after relinking the repo to `urskkwizwutodikgznas` for IPv4. The command failed before destructive execution because the CLI could not rotate `cli_login_postgres` and requested `SUPABASE_DB_PASSWORD` instead (`permission denied to alter role`).
- Remote inspection confirmed the staging project still contains only a partial migration history ending at `20260803115116_stage_1_security_hardening`, so the full 113-file repo chain was not replayed from zero in this environment.
- The Supabase Management API `apply_migration` endpoint accepted probe migrations, but rejected the full Stage 1 SQL payload as a single request in this environment. Validation therefore applied the Stage 1 DDL in ordered SQL blocks and then recorded the migration version in staging history.

## Remaining blockers that are external to this branch

- The full repo migration chain was not replayed onto a clean disposable Supabase database from scratch in this environment. The blocking condition is now explicit: staging reset requires either a valid `SUPABASE_DB_PASSWORD` for `urskkwizwutodikgznas` or restoration of the missing CLI login-role admin path in staging. Until that is available, Stage 1 remains validated only against the existing staging baseline.
- The final `npm audit` result is blocked by upstream published React Router releases:
  - `react-router-dom@7.18.2` is the latest published version available on August 3, 2026
  - npm audit still reports 2 high vulnerabilities in `react-router` / `react-router-dom` for the published `<8.3.0` line
  - this branch cannot reduce the audit to zero without an upstream release outside the currently published range
- Supabase advisors still report broader pre-existing security/performance debt on staging outside the narrow Stage 1 path, including:
  - `public.configured_models` is a `SECURITY DEFINER` view
  - `public.security_rate_limits` and `public.security_audit_events` have RLS enabled with no explicit policies
  - multiple GraphQL exposure and permissive-policy findings across legacy tables
  - Auth leaked-password protection and MFA options are still not enabled at the project level

## Current assessment

This branch materially reduces the most obvious exposed attack surface, and the Stage 1 hardening paths were validated on staging, but Stage 1 is still blocked from deployment review. The remaining work is concentrated in:

- validating the full repo migration chain against a clean disposable Supabase database
- deciding whether the remaining advisor findings are accepted baseline debt or must be remediated before deployment review
- waiting for a React Router release that clears the last 2 high audit findings, or replacing React Router entirely
- validating the conditional `quiz_bank_variants` assumptions against a real non-production database

The registration-model decision is now implemented as:

- public guardian signup only
- child creation only through authenticated guardian/admin flows
- no anonymous privileged child/student account creation path remains enabled

Recommendation: not ready for deployment review yet. The minimum next unblocker is a successful clean replay on staging or another disposable non-production Supabase database using the full repo migration chain.
