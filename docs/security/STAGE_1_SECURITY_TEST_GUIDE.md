# Stage 1 Security Test Guide

## Current automated checks

- `npm run build`
- `npx eslint src/services/chatService.ts src/services/unifiedChatService.ts src/utils/connectionTest.ts`
- `npm test -- --run` (currently red due pre-existing repo issues; not a clean security gate yet)

## Required local/disposable Supabase checks

1. Start or connect to a disposable Supabase environment.
2. Apply the Stage 1 migration.
3. Deploy the modified functions to that non-production environment.
4. Verify:
   - anonymous request to `ai-chat` returns 401
   - anonymous request to `document-processor` returns 401
   - anonymous request to `quiz-bank-visible` and `quiz-bank-all` returns 401
   - non-admin authenticated request to `import-curriculum-bundle` returns 403
   - admin authenticated request to `import-curriculum-bundle` succeeds
   - repeated `create-student-account` calls hit 429
   - malformed document payloads return 400/415/413 as appropriate
   - `consume_security_rate_limit` increments atomically under repeated requests

## Database/RLS checks

- inspect `quiz_bank_variants` existence and confirm RLS state
- verify no client-write path remains on `explanations_cache`
- verify only admin writes remain on `exercise_explanations_cache`
- verify function execute grants after the migration

## Advisor checks

Run when available in the validation environment:

- `supabase db advisors`
- any local SQL lint or schema checks supported by the installed CLI version
