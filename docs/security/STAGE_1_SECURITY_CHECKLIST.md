# Stage 1 Security Checklist

Updated: August 4, 2026
Branch: `security/stage-1-hardening`

## Baseline

- Build: passes
- Type check: passes (`npx tsc --noEmit`)
- Tests: pass after excluding generated `.claude/worktrees/**` mirror copies from Vitest discovery (`31` files, `189` tests)
- Lint: repo-wide baseline remains red; current full lint result is `696` errors and `62` warnings, down from the earlier baseline of `765` errors and `60` warnings
- npm audit baseline before remediation: 24 vulnerabilities total, including critical `vitest` and `tar`, high `react-router-dom`, `vite`, `postcss`, `@capacitor/cli`

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
  - removed the public student self-registration path from the auth page
  - switched `create-student-account` to authenticated admin-only access
  - retained auditing and safer generic failure behavior for the privileged code path
- guardian child-account creation
  - switched `create-child-account` to authenticated access only
  - added guardian/admin authorization split with explicit guardian targeting for admins
  - added durable rate limiting scoped to guardian or acting admin
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
  - added authorization unit tests for guardian/admin child-account creation flow
- frontend security cleanup
  - removed stale direct explanation-cache client write path
  - removed hardcoded direct `ai-chat` bearer-token fallback
  - removed sensitive OCR and AI request/response logging from hardened client paths
- dependency remediation
  - upgraded the audited direct/runtime packages that had published patched releases
  - upgraded Vitest/Vite and aligned the toolchain
  - updated MathLive asset copy logic for the new package layout
  - reduced the earlier baseline materially, and `npm audit` now reports `2` high vulnerabilities in the current dependency tree
  - remediated the ESLint dependency-chain findings by overriding `brace-expansion` v1 to `1.1.18`
- database hardening migration scaffold created:
  - `supabase/migrations/20260803115116_stage_1_security_hardening.sql`
  - security rate-limit table + RPC
  - security audit events table
  - `quiz_bank_variants` RLS enable/admin-only policy if table exists
  - `explanations_cache` client-write lock-down
  - tighter `exercise_explanations_cache` write policies
  - least-privilege function execute revokes/grants
  - `students` RLS enable + admin-only management policy
  - drop unused `create_vault_secret(text, text)` Vault wrapper

## Still required before Stage 1 can be declared complete

- decide whether the remaining Supabase advisor findings are accepted baseline debt or must be remediated before deployment review
- explicitly accept or defer the remaining `2` high `npm audit` findings in `react-router` / `react-router-dom` until an upstream stable release beyond `7.18.2` exists
- verify `quiz_bank_variants` actual deployed shape/relationships against local repo assumptions
- finalize the production rollback script for the exact pre-Stage-1 policy/grant baseline
- harden remaining non-Stage-1 production logging outside the protected request paths if this branch is extended further

## Current gate status

- No production deployment performed
- Build: passes (`npm run build`)
- Type check: passes (`npx tsc --noEmit`)
- Full tests: pass (`npm test -- --run` → `31` files, `189` tests)
- Targeted lint on modified files: passes
- npm audit: `2` high vulnerabilities remain, `0` critical
- Full lint: red (`696` errors, `62` warnings), pre-existing repo-wide debt
- Staging target verified: `urskkwizwutodikgznas`
- Production untouched: `sibprjxhbxahouejygeu`
- Staging Edge Functions deployed and verified:
  - `ai-chat` → `verify_jwt: true`
  - `document-processor` → `verify_jwt: true`
  - `quiz-bank-visible` → `verify_jwt: true`
  - `quiz-bank-all` → `verify_jwt: true`
  - `create-student-account` → `verify_jwt: true`
  - `create-child-account` → `verify_jwt: true`
- Staging database/RLS validation completed for Stage 1 target surfaces:
  - guardian explanation read: passes
  - student explanation read blocked after legacy-policy cleanup: passes
  - admin explanation read: passes
  - admin `exercise_explanations_cache` write: passes
  - guardian `exercise_explanations_cache` write: blocked
  - clean replay from zero: passes
  - `students` RLS enabled: passes
  - `students` admin-only policy present: passes
- Rollback dry-run: passes in transaction on staging
- Ready for deployment review with documented exceptions
- Clean replay status: passes
- Final staging lint after `create_vault_secret` removal: passes
- Final staging advisor status after `create_vault_secret` removal: warnings only, no reported errors in the captured output
