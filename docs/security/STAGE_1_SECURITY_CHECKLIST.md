# Stage 1 Security Checklist

Updated: August 3, 2026
Branch: `security/stage-1-hardening`

## Baseline

- Build: passes
- Type check: passes (`npx tsc --noEmit`)
- Tests: pass after excluding generated `.claude/worktrees/**` mirror copies from Vitest discovery (`30` files, `184` tests)
- Lint: repo-wide baseline remains red; current full lint result is `696` errors and `62` warnings, down from the earlier baseline of `765` errors and `60` warnings
- npm audit: 24 vulnerabilities total, including critical `vitest` and `tar`, high `react-router-dom`, `vite`, `postcss`, `@capacitor/cli`

## Implemented in this branch

- `ai-chat`
  - switched to authenticated access in `supabase/config.toml`
  - removed permissive request/header logging
  - added shared auth/CORS/body parsing/rate-limit plumbing
  - removed frontend hardcoded bearer-token fallback
- `document-processor`
  - switched to authenticated access in `supabase/config.toml`
  - added auth, durable rate-limit hook, size limits, MIME allowlist, signature checks, timeout handling
- quiz-bank visibility endpoints
  - switched `quiz-bank-visible` and `quiz-bank-all` to authenticated access
  - removed trust in client-supplied `userId`
- student self-registration
  - kept public self-registration path as a product assumption
  - added durable rate-limit hook
  - added compensation on partial profile failure
  - removed duplicate-username enumeration details from responses
  - added security audit event writes
- guardian child-account creation
  - switched `create-child-account` to authenticated guardian-only access
  - added guardian-scoped durable rate limiting
  - removed wildcard CORS and sensitive request logging
  - added idempotent relinking logic for the same guardian
  - blocked cross-family relinking
- admin/debug surface
  - removed repo copies of `run-sql` and `test-cors`
  - switched `import-curriculum-bundle` to authenticated admin-only flow
  - added schema validation and generic request-failure handling to `import-curriculum-bundle`
  - switched `import-training-items` to authenticated admin-only flow
  - removed in-function schema mutation from `import-training-items`
  - fixed `import-exam-bundle` to return browser-safe CORS headers on normal responses
  - added schema validation and generic request-failure handling to `import-exam-bundle`
- test/lint hygiene
  - excluded generated `.claude/worktrees/**` mirrors from Vitest discovery and ESLint traversal
  - added validation tests for curriculum and exam import bundle payloads
- frontend security cleanup
  - removed stale direct explanation-cache client write path
  - removed hardcoded direct `ai-chat` bearer-token fallback
  - removed sensitive OCR and AI request/response logging from hardened client paths
- database hardening migration scaffold created:
  - `supabase/migrations/20260803115116_stage_1_security_hardening.sql`
  - security rate-limit table + RPC
  - security audit events table
  - `quiz_bank_variants` RLS enable/admin-only policy if table exists
  - `explanations_cache` client-write lock-down
  - tighter `exercise_explanations_cache` write policies
  - least-privilege function execute revokes/grants

## Still required before Stage 1 can be declared complete

- add/finish role-isolation and negative security tests against a real Supabase environment
- validate the new migration against a local or disposable Supabase environment
- run advisors (`supabase db advisors`) where supported, or documented fallback
- complete dependency upgrade pass; audit still reports 24 vulnerabilities total, including 17 high and 2 critical
- verify `quiz_bank_variants` actual deployed shape/relationships against local repo assumptions
- create final deployment and rollback execution order after migration validation
- harden remaining non-Stage-1 production logging outside the protected request paths if this branch is extended further
- decide whether public `create-student-account` self-registration remains acceptable for controlled beta; JWT is intentionally still disabled there under the current product assumption

## Current gate status

- No production deployment performed
- Build: passes (`npm run build`)
- Type check: passes (`npx tsc --noEmit`)
- Full tests: pass (`npm test -- --run` → `30` files, `184` tests)
- Targeted lint on modified files: passes
- Full lint: red (`696` errors, `62` warnings), pre-existing repo-wide debt
- Not yet safe to deploy
