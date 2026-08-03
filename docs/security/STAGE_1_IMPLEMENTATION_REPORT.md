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

## Remaining blockers that are external to this branch

- Local/disposable Supabase validation still cannot be completed in this environment because Docker is unavailable, so:
  - migration application was not executed locally
  - RLS / role-isolation tests against a real Supabase stack were not executed locally
  - `supabase db advisors` was not run against a live local database
- The final `npm audit` result is blocked by upstream published React Router releases:
  - `react-router-dom@7.18.2` is the latest published version available on August 3, 2026
  - npm audit still reports 2 high vulnerabilities in `react-router` / `react-router-dom` for the published `<8.3.0` line
  - this branch cannot reduce the audit to zero without an upstream release outside the currently published range

## Current assessment

This branch materially reduces the most obvious exposed attack surface, but Stage 1 is still incomplete. The remaining work is concentrated in:

- migration validation
- database/security advisor validation
- role-isolation/security tests
- waiting for a React Router release that clears the last 2 high audit findings, or replacing React Router entirely
- validating the conditional `quiz_bank_variants` assumptions against a real non-production database

The registration-model decision is now implemented as:

- public guardian signup only
- child creation only through authenticated guardian/admin flows
- no anonymous privileged child/student account creation path remains enabled

Recommendation: not safe to deploy yet.
