# Stage 1 Implementation Report

Updated: August 4, 2026
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
- `npm audit --json`: now reports `2` high vulnerabilities and `0` critical:
  - `react-router`
  - `react-router-dom`
  - the earlier ESLint dependency-chain findings were remediated by overriding `brace-expansion` v1 to `1.1.18`
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
- full clean replay on staging succeeded on August 3, 2026 after patching legacy migration-order and idempotency issues across the repo migration chain
- direct post-replay schema validation confirmed:
  - `students` now has RLS enabled
  - `students` now has admin-only policy `Admins can manage students`
  - `explanations_cache`, `exercise_explanations_cache`, `security_rate_limits`, and `security_audit_events` all have RLS enabled
- post-replay advisor run no longer reports the earlier `public.students` RLS-disabled error

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

3. Legacy `students` table remained public without RLS after the clean replay.
   - Supabase advisors reported: `Table public.students is public, but RLS has not been enabled.`
   - Fix applied to migration: enable RLS on `public.students`, revoke anonymous table access, and add admin-only policy.

4. `public.create_vault_secret(text, text)` remained as an unused Vault wrapper and caused staging `supabase db lint --linked` failure.
   - Current app and Edge Function code do not call this helper.
   - Fix applied to migration: drop `public.create_vault_secret(text, text)` during Stage 1 hardening.
   - Revalidated on staging after reset:
     - `public.create_vault_secret` no longer exists
     - `supabase db lint --linked` returns `No schema errors found`

## Staging-only limitations observed

- The staging project initially had pre-existing migration history drift, and the clean replay effort exposed multiple historical ordering/idempotency defects in older migrations.
- Direct Supabase SQL from the agent process still depends on a visible `SUPABASE_DB_PASSWORD`. The user shell had it available and could run the replay/query commands successfully; the agent process could not inherit it consistently, which prevented one final autonomous post-patch lint/advisor rerun after the `create_vault_secret` removal.

## Remaining deployment-review exceptions outside this branch

- `npm audit --json` still reports `2` high vulnerabilities:
  - both are the published `react-router` / `react-router-dom` RSC advisory on the current stable `7.x` line (`>=7.12.0 <8.3.0`)
  - this app imports `BrowserRouter`, `Routes`, `Route`, `Link`, `NavLink`, `useNavigate`, `useLocation`, `useParams`, and `useSearchParams` in a client SPA and does not use React Router SSR or RSC handlers locally, which materially constrains exposure
  - no newer stable `react-router-dom` release than `7.18.2` was available during this verification pass
- Supabase advisors still report broader pre-existing security/performance debt on staging outside the narrow Stage 1 path, including:
  - `public.configured_models` is a `SECURITY DEFINER` view
  - multiple GraphQL exposure and permissive-policy findings across legacy tables
  - public bucket listing on `subject-icons`
  - Auth leaked-password protection and MFA options are still not enabled at the project level

## Current assessment

This branch materially reduces the exposed attack surface, and the full clean replay now succeeds on staging. Stage 1 implementation is complete and can proceed to deployment review with documented exceptions. The remaining non-Stage-1 review items are:

- deciding whether the remaining advisor findings are accepted baseline debt or must be remediated before deployment review
- explicitly accepting or deferring the remaining `react-router` audit findings until an upstream stable release beyond `7.18.2` exists
- validating the conditional `quiz_bank_variants` assumptions against a real non-production database

The registration-model decision is now implemented as:

- public guardian signup only
- child creation only through authenticated guardian/admin flows
- no anonymous privileged child/student account creation path remains enabled

Recommendation: ready for deployment review with documented exceptions. The clean replay blocker, staging lint blocker, and ESLint dependency-chain audit findings are resolved; the remaining React Router audit exception and broader advisor debt should be tracked as review exceptions or follow-up work rather than Stage 1 implementation blockers.
