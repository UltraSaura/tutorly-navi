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

## Repository changes made so far

- Added shared Edge Function security helper:
  - `supabase/functions/_shared/security.ts`
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
  - `supabase/functions/import-exam-bundle/index.ts`
  - `supabase/functions/import-training-items/index.ts`
- Removed:
  - `supabase/functions/run-sql/index.ts`
  - `supabase/functions/test-cors/index.ts`
- Frontend hardening:
  - `src/services/chatService.ts`
  - `src/services/unifiedChatService.ts`
  - `src/utils/connectionTest.ts`
  - `src/utils/documentProcessor.ts`

## Verification performed

- `npm run build`: passes
- `npx tsc --noEmit`: passes
- targeted `npx eslint` on modified production files: passes
- `npm test -- --run`: red at baseline and still red; failures are dominated by pre-existing duplicated `.claude/worktrees/*` test collection plus pre-existing repo test issues
- `npm run lint`: red repo-wide at baseline and still red
- `npm audit --json`: 24 vulnerabilities total, including 17 high and 2 critical

## Current assessment

This branch materially reduces the most obvious exposed attack surface, but Stage 1 is still incomplete. The remaining work is concentrated in:

- migration validation
- database/security advisor validation
- role-isolation/security tests
- dependency remediation
- validating the conditional `quiz_bank_variants` assumptions against a real non-production database
- deciding whether public student self-registration remains acceptable for controlled beta, or should move to guardian/invite/admin-only creation

Recommendation: not safe to deploy yet.
