# Family profiles in the current Stuwy app

Implemented only in the `parent` working tree. No branch merge, push, application publication, hosted migration, or Edge Function deployment was performed. Existing staged and unstaged work was preserved.

## Identity and profile lifecycle

`AuthContext.user` and the Supabase Auth session remain the signed-in account. Student-facing components use `useLearner()`; services capture `getLearnerUser()` at operation entry. A linked child is identified by `children.id`, and learning records retain the child's existing `children.user_id` / `users.id`. No impersonated Auth session or additional account system is introduced.

For accounts explicitly enrolled in the server rollout cohort, family login opens `/family` with **Qui utilise Stuwy ?**, linked child cards, **Espace parent**, and **Ajouter un enfant**. Unenrolled guardian accounts retain the existing guardian portal, which keeps older browser/native clients compatible during rollout. Existing independent student login remains unchanged. Child profiles are loaded from the server before the student routes mount. Both enrolled experiences provide **Changer de profil** in an avatar menu; the student's name/avatar also remain visible on mobile.

The client stores only the opaque grant in `sessionStorage`, separately for the signed-in account. It validates that grant against the server when restoring a profile. Normal navigation and a refresh in the same browser/app session preserve the profile. A new session with no saved selection revokes any old grant for that Auth session and opens the chooser. Parent authorization never goes into `localStorage`.

Profile changes cancel personal queries and HTTP reads, remove personal query caches, unsubscribe Realtime channels, and remount the route tree. Requests capture their profile generation; late responses from a previous generation are rejected. Asynchronous homework, upload, grading, explanation and history operations hold a busy lock through their complete operation, including gaps between requests. Mutation execution also prevents manual switching. Learner-dependent query keys and offline lesson positions include learner identity. Explicit learner IDs are retained by learning writes.

## Server authorization

The migration adds an unexposed `family_private` schema containing PIN hashes, rate-limit state and grants. PINs contain six digits and are hashed with pgcrypto bcrypt at cost 12. Clients cannot read hashes or call the service-only setup/reset RPCs. Setup/reset requires the account password to be verified server-side in `family-manage-pin`; the temporary reauthentication session is signed out locally on the server.

PIN checks and password reauthentication each allow at most five attempts in a 15-minute window. Failed PIN attempts return a committed failure result so the attempt counter cannot roll back. Both PIN changes and profile changes revoke prior grants. Grants contain 256-bit random secrets, stored as SHA-256 hashes, bound to a live Supabase Auth `session_id` and account. Parent grants expire after 15 minutes; child grants after eight hours. Removed/inactive/unapproved children and unapproved/revoked accounts fail authorization immediately on the backend. The client additionally checks on focus, reconnect and every 30 seconds, and has an expiry timer.

The `x-family-grant` header is supplied by the application's scoped transport. RLS verifies this header against server state. Restrictive policies combine with existing policies; ordinary parent JWTs alone cannot access the parent portal tables, billing/subscription tables, roles, or another learner. Parent reads are limited to the signed-in family's linked children. Student writes use the selected learner. Dependent exercise attempts are constrained through their history record. Privileged role checks and Edge Functions also honor the parent lock, including account deletion and child creation.

The existing global `exercise_explanations_cache` and its `exercise_hash` upsert contract remain unchanged for old clients. Updated clients use `learner_explanations_cache`, owned by a learner and unique on `(learner_user_id, exercise_hash)`. Enrolled families cannot read the unowned legacy cache. Existing homework/history records are retained.

The private schema must remain **outside** Supabase's exposed Data API schemas. No service-role credential is added to the frontend. Shared learning content remains shared; personal progress, attempts, homework, messages and cached explanations are scoped.

## Manual activation — nothing has been deployed

Read `docs/family-profile-activation-preparation.md` first for the inspected project, migration-history differences, hosted-schema compatibility fixes and current exact commands. Its 2026-10-10 preflight supersedes assumptions based on the original compact fixture. The configured project's staging/production role is not yet confirmed.

Use a coordinated maintenance/release window: the new frontend, migration and updated functions depend on each other. Confirm the target is the current app's Supabase project, not a v2 project. Back up the database and review this migration before applying it. It assumes the repository's current approval columns and guardian/child schema, and PostgreSQL 15+ for security-invoker views.

1. In the Supabase Dashboard SQL editor for the intended project, run the contents of:
   `supabase/migrations/20261009192443_family_profiles.sql`
   once. It is wrapped in a transaction. This applies only this migration, rather than accidentally applying unrelated pending migration files.
2. Record the successful transaction, exact target and migration checksum in the external release ledger. Do not repair migration history or apply unrelated migrations. Direct SQL leaves migration history unchanged; inspect the catalog before any retry.

3. Set `STUWY_FAMILY_PROJECT_REF` to the explicitly approved project reference, then deploy these updated functions to that same project. The installed CLI supports multiple function names and `--use-api`:

   ```sh
   supabase functions deploy --project-ref "$STUWY_FAMILY_PROJECT_REF" --use-api \
     family-manage-pin ai-chat document-processor validate-training-answer \
     create-child-account delete-account export-guardian-report \
     quiz-bank-all quiz-bank-visible quiz-bank-attempt recommendations student-progress \
     class-students teacher-classes generate-lesson-content \
     generate-quiz-from-topics generate-quiz-from-transcripts generate-topics-from-objectives \
     import-exam-bundle import-training-items import-curriculum-bundle ingest-curriculum-edition \
     manage-api-keys subject-icon-upload suggest-topic-objectives
   ```

   Retain the function JWT settings in `supabase/config.toml`. Existing `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` function environment variables are used; no new secret is required. The AI/document endpoints verify the authenticated learner in their handler even where gateway JWT checks are disabled. CORS now accepts `x-family-grant`.

4. Build the current frontend with `VITE_ENABLE_LEARNING_ANALYTICS=false` and release it through your existing web/native release process. This implementation adds no npm dependency. Web hosting must route `/family` to the SPA entry point, as with `/guardian` and existing student routes.
5. After the migration, functions and updated test client are all ready, insert only the approved test account into `family_private.rollout_accounts` through the operator database connection. No browser role can enroll an account. Do not expand the cohort until the staging checklist passes.
6. Sign in as that enrolled parent. On `/family`, open **Espace parent** or **Ajouter un enfant**, create a PIN by confirming the account password, then continue. To reset it later, use **PIN oublié ? Réinitialisez-le** on the chooser and confirm the account password. The existing email password reset can be requested if the account password is forgotten.
7. In staging, verify two children with different homework, messages, grades and progress; switching during a slow request/submission; leaving and re-entering parent mode; PIN expiry/reset; removed children; cross-family API attempts; independent student login; and a cold native app start.

Do not expose `family_private` in API settings or grant clients access to its tables. The grants are session-scoped UI authorization; the authoritative enforcement is RLS and authenticated server functions. See [Supabase RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security) for the underlying policy model.

## Checks and reproduction

- Production Vite build: passed.
- Focused release tests passed 26 checks in five files, covering family API/navigation/runtime, disabled analytics and adaptive teaching behavior. The earlier full frontend suite passed 383 tests in 50 files.
- Targeted lint on the new family code: no errors; existing context-export Fast Refresh warnings are informational.
- TypeScript: compared diagnostic identities against the pre-change baseline; no new diagnostics. The repository's pre-existing type errors remain.
- Changed Edge Function sources: parsed with TypeScript; no syntax errors.
- Migration: applied successfully and passed 74 authorization assertions on an isolated, disposable local PostgreSQL 18 instance using `tests/family/schema-fixture.sql` and `tests/family/access.sql`, including enrolled teacher/admin role regression checks. A native local Supabase stack also passed 24 real Auth/REST/PIN checks and the browser flow with two synthetic children. A copied pre-family native web bundle retained the legacy guardian login while unenrolled. These are isolated checks, not a complete PostgreSQL 15 hosted-schema or physical-device rehearsal.

Reproduce database tests only in a **disposable database**, with a local PostgreSQL superuser and pgcrypto available:

```sh
createdb stuwy_family_test
psql -v ON_ERROR_STOP=1 -d stuwy_family_test \
  -f tests/family/schema-fixture.sql \
  -f supabase/migrations/20261009192443_family_profiles.sql \
  -f tests/family/access.sql
```

The hosted database and deployed Edge runtime were not changed. Real-account hosted staging, complete-schema PostgreSQL 15 and physical Android/iOS checks remain pending. Independent child credentials and second-parent invitation work were not added.

## Changed files

The complete task-specific list is in `docs/family-profile-changed-files.txt`. It excludes unrelated edits that were already present in the working tree. The main entry points are:

- `src/context/FamilyProfileContext.tsx` — profile contract, server validation, session restoration and transitions.
- `src/pages/FamilyPage.tsx` — chooser and secure PIN setup/reset UI.
- `src/features/family/` — routing, avatar menus, request isolation, identity helpers and tests.
- `src/App.tsx`, `src/pages/AuthPage.tsx`, `src/pages/Index.tsx`, `src/context/AuthContext.tsx` — integration with existing routing and account approval.
- Existing learner hooks, learning components and services — active learner reads/writes, scoped keys, operation locks and lesson resume isolation.
- Existing guardian menus and explanation joins — profile switching and exact child cache ownership.
- `supabase/functions/_shared/family-access.ts`, `supabase/functions/family-manage-pin/index.ts`, and the updated server entry points — verified authorization.
- `supabase/migrations/20261009192443_family_profiles.sql` — private grants, bcrypt PINs, rate limits, RLS and cache ownership.
- `tests/family/` — local database fixture and authorization assertions.
