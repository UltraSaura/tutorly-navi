# Family profile staging verification

Prepared from `docs/family-profile-setup.md`, migration `20261009192443_family_profiles.sql`, the scoped Supabase client, function configuration and PIN handler. This is a runbook only: no staging deployment, migration, activation or account changes have been performed.

## Required release and test fixtures

- Use the current implementation in `tutorly-parent`, branch `parent`. A server started in `tutorly-development` does not contain these changes. The local server was subsequently switched to `tutorly-parent` during diagnosis.
- One migration: `supabase/migrations/20261009192443_family_profiles.sql`. Requires the current guardian/child/approval schema, live `auth.sessions`, pgcrypto in `extensions`, and PostgreSQL 15+ for security-invoker views. Review against the actual staging schema before applying; the local fixture does not prove hosted-schema compatibility.
- Deploy the 25 function entry points listed below, including the new `family-manage-pin` and guarded `import-curriculum-bundle`. `_shared/family-access.ts` ships with the functions that import it; it is not a separate deployment.
- Existing server environment: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. No new family-specific secret. Preserve each function's other existing AI/provider/storage configuration. Never put the service-role key in a frontend build.
- Frontend build variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, both from staging. The checked-in client and config default to project `sibprjxhbxahouejygeu`; do not rely on those defaults to select staging.
- Prepare approved family A with two active, approved linked children A1/A2; approved family B with child B1; one approved independent student with no guardian row. Record both `children.id` and learner `children.user_id`. Use synthetic accounts and distinguishable homework/chat/progress/points/grade fixtures. Have a separate parent session for revocation tests and a spare account for rate-limit tests.
- Record the staging project reference/URL, frontend release, native build IDs, previous function sources/configuration and a restorable pre-activation database snapshot. Verify a restoration path before activation. Include Auth, existing function definitions/policies/view settings, cache data/indexes and migration history; a public-schema-only dump is insufficient. Snapshot object storage separately if test uploads need restoration.

## Activation instructions — execute only when activation is authorized

Consult `docs/family-profile-activation-preparation.md` for the latest inspected target and corrected migration. StudyWiz's environment classification is unconfirmed; the staging placeholders below do not certify that it is staging.

1. Restrict staging access during the coordinated release. Confirm the project reference in Dashboard, the database snapshot and the recorded previous web/native/function artifacts. Use a disposable staging project or snapshot-backed staging database. Do not apply the test schema fixture to it.
2. In that project's Dashboard SQL editor, run **only** the complete migration file once. It includes `BEGIN`/`COMMIT` and is not idempotent. On failure, confirm transaction rollback and resolve the schema mismatch before retrying. Do not use an unrestricted `db push` that could apply unrelated pending migrations.
3. Record successful application and deploy the exact function set, explicitly targeting staging:

   ```sh
   cd /Users/hiroshigawa/projects/tutorly-parent
   export STUWY_STAGING_REF='REPLACE_WITH_CONFIRMED_STAGING_PROJECT_REF'
   : "${STUWY_STAGING_DB_URL:?Supply the confirmed staging database URL securely}"
   # Record SQL success, target and checksum in the release ledger; do not repair history.
   supabase functions deploy --project-ref "$STUWY_STAGING_REF" --use-api \
     family-manage-pin ai-chat document-processor validate-training-answer \
     create-child-account delete-account export-guardian-report \
     quiz-bank-all quiz-bank-visible quiz-bank-attempt recommendations student-progress \
     class-students teacher-classes generate-lesson-content \
     generate-quiz-from-topics generate-quiz-from-transcripts generate-topics-from-objectives \
     import-exam-bundle import-training-items import-curriculum-bundle ingest-curriculum-edition \
     manage-api-keys subject-icon-upload suggest-topic-objectives
   ```

   The database URL must identify the same staging project as `STUWY_STAGING_REF`. Supply its credentials through your normal secure operator environment, not a checked-in file. Direct SQL leaves migration history unchanged; verify catalog state before retrying. Function operations use `--project-ref`. Retain per-function JWT settings in `supabase/config.toml`; do not globally disable JWT verification. `family-manage-pin` requires gateway JWT verification. Handlers validate callers even for listed functions whose gateway JWT setting is false. Confirm preflight requests permit `x-family-grant` and the private `family_private` schema remains outside exposed API schemas. Verify required server secrets exist without printing their values.
4. Build with explicit staging values (the publishable/anon key is the public client key):

   ```sh
   export VITE_SUPABASE_URL='https://REPLACE_WITH_CONFIRMED_STAGING_PROJECT_REF.supabase.co'
   export VITE_SUPABASE_PUBLISHABLE_KEY='REPLACE_WITH_STAGING_PUBLIC_CLIENT_KEY'
   export VITE_ENABLE_LEARNING_ANALYTICS='false'
   npm run build
   ```

   Publish `dist/` only to the existing staging hosting target; configure SPA fallback for `/family` and `/guardian`. Confirm browser network requests reach staging. The server rollout cohort starts empty. After the migration, functions and client are ready, enroll only the approved test account through the operator database connection:

   ```sh
   : "${STUWY_FAMILY_TEST_ACCOUNT_ID:?Supply the approved parent auth.users ID}"
   psql "$STUWY_STAGING_DB_URL" -X -v ON_ERROR_STOP=1 \
     -v account_id="$STUWY_FAMILY_TEST_ACCOUNT_ID" \
     -c "INSERT INTO family_private.rollout_accounts(account_id) VALUES (:'account_id'::uuid) ON CONFLICT (account_id) DO NOTHING;"
   ```

   Verify the account ID and row through an operator-only read before login. Keep staging access restricted until the checks below pass.
5. For internal native verification, after the staging build run `npx cap sync android` / `npx cap sync ios` as applicable, then build through the existing Android Studio/Xcode signing process. Install only on test devices; do not submit to app stores. Both native projects are present, but family flows on devices have not been verified.

## Real-account checklist — all pending

Record PASS/FAIL, browser/device/build, account/learner IDs, time and redacted evidence for each row. Do not save bearer tokens, grant tokens, passwords or PINs in reports. A hidden button is not evidence of backend denial.

| Check | Steps and required result |
|---|---|
| Family login and cards | Fresh family A login opens `/family`. A1/A2 show correct names, avatars and levels; unavailable children are disabled. Choosing either mounts the existing student experience with that child's name/avatar. The Auth account remains the parent. Check French and English, keyboard focus and mobile touch targets. |
| PIN setup and reset | Open parent/add-child card with no PIN; require six digits, matching confirmation and correct account password. Wrong password must not create/change a PIN. Set PIN, enter portal, then reset from chooser using password reauthentication. Old PIN fails, new PIN works; all previously captured grants for the account fail, including a second live session. Forgotten-password email uses the existing reset flow. No PIN/hash is returned or logged. |
| Incorrect attempts and limits | On a spare account, send five wrong PIN attempts; each returns `invalid_pin`. Sixth returns `rate_limited`, even with a correct PIN. Repeat from another tab/session to prove account-wide enforcement. After more than 15 minutes from window start, retry works. Separately test five password reauthentication attempts then HTTP 429 on the sixth; PIN and password counters are separate. Successful attempts also consume this window's budget. |
| Expiry and revocation | Unlock parent and wait 15 minutes from grant issuance; backend denies old grant and UI returns to chooser. Check background/resume and offline/reconnect. Child grant expires after eight hours. Lock/switch invalidates old grant immediately; remove a child link or mark child inactive/unapproved and confirm its old grant fails. Revoke the Auth session and replay its JWT+grant; no protected access. Client validation occurs on focus/reconnect/every 30 seconds in addition to expiry timer. |
| Two-child isolation | In A1 create distinct homework, chat, attempt/grade, lesson/practice progress and points; repeat in A2. Switch repeatedly and refresh. Each child reads/writes only its own learner records and resumes its own lesson position. Test the same exercise hash in both profiles to verify separate explanations. Legacy unattributed explanation caches must not appear as another child's content. Check stored learner IDs through an authorized staging inspection. |
| Slow requests and submissions | Throttle network; start A1 dashboard/chat/history reads, then switch to A2. No A1 content flashes or late result appears in A2. Repeat homework upload/grading, practice answer and explanation submission. Switching stays blocked while the operation is unfinished; completion records stay assigned to A1. Check failures, retries and reconnect, not only successful requests. |
| Parent relock | Unlock parent, use “Changer de profil”, select A1, then navigate directly/back to `/guardian` and management URLs. Parent records must not render; chooser requires PIN again. Replay the previous parent grant to prove server revocation. Add-child, subscription/billing and account deletion actions require parent authorization. |
| Direct API denial | With parent JWT and public key but **no** `x-family-grant`, request guardians/links/billing and learner records; no protected rows returned. Writes must fail or affect zero rows. Call child creation/report/account deletion endpoints with no grant and with a child grant; no protected action occurs. Tamper with grant, use expired/revoked grant, or combine a grant with a different Auth session; deny access. Client calls to service-only PIN RPCs and PIN-hash reads fail. |
| Cross-family rejection | Family A calls `family_select_child` with B1's **child ID**; receive SQL permission error and no grant. Also request/write B1's **learner ID** directly and through learner Edge Functions; no data/action. Repeat with an unlocked parent grant to ensure ownership still applies. |
| Independent student | Existing independent account signs in to its usual destination without chooser/PIN. Homework/chat/lessons/practice/grades/progress/points use its own learner ID; refresh and sign-out still work. |
| Refresh, restart and sign-out | Refresh within an active browser session restores the same profile only after server validation; parent remains unlocked only until original expiry. Start a clean browser session without saved sessionStorage: family sees chooser and needs PIN for parent. Test actual close/reopen and tab duplication/session restore too; browser storage restoration must not accidentally satisfy the new-session requirement. Sign out from each mode, use Back/refresh, and sign in again: no old child data or parent authorization. Replay old credentials to verify backend denial. |
| Native/mobile | On Android and iOS test chooser, visible active avatar/name, PIN keyboard, switching menu, hardware Back, upload/camera/document flow and parent portal. Background/resume preserves valid profile; force-stop/terminate and cold launch must show chooser without retained parent authorization. Test WebView storage semantics, logout/relogin, offline/resume, expiry and password-reset deep links on real devices. A native shell's presence does not prove these behaviors. |

For direct API checks, use a tester-controlled client with the staging public key and a real session bearer; send the optional grant as `x-family-grant`. RPC bodies include `{"child":"<children.id>"}` for `family_select_child`, `{"pin":"<six digits>"}` for `family_unlock_parent`, and `{}` for `family_lock` / `family_parent_authorized`. PIN failures are HTTP-success JSON error results so rate counters commit; do not expect HTTP 403 for every denial. RLS SELECT can return HTTP 200 with zero rows; verify absence of data and persistence of denied writes, rather than status alone.

## Rollback procedure

The migration has no supplied down migration. It replaces `has_role`/`is_guardian_of_child`, changes existing RLS/view behavior and adds a separate learner-owned explanation cache. The old cache and global hash uniqueness remain intact for legacy clients. Dropping `family_private` or restoring only frontend files is not a complete SQL rollback.

1. Stop cohort exposure immediately while keeping staging closed to testers. Revoke grants before removing the account from the cohort so captured credentials have no residual row:

   ```sh
   psql "$STUWY_STAGING_DB_URL" -X -v ON_ERROR_STOP=1 \
     -v account_id="$STUWY_FAMILY_TEST_ACCOUNT_ID" \
     -c "BEGIN; DELETE FROM family_private.grants WHERE account_id = :'account_id'::uuid; DELETE FROM family_private.rollout_accounts WHERE account_id = :'account_id'::uuid; COMMIT;"
   ```

   This returns that account to the legacy guardian behavior and is the first containment step; it does not reverse the migration. Stop writes and native test sessions. Record failures and export any synthetic results needed before restoration. A snapshot restore discards database changes since that snapshot; database snapshots do not automatically restore storage objects or frontend/function deployments.
2. Restore the recorded **complete pre-activation staging database snapshot** using its tested restoration procedure. If staging is disposable, recreate it from the recorded pre-activation baseline instead. Confirm original helper definitions, policies, view options, cache schema/unique index, Auth data and migration history are restored together. Do not modify migration history as a substitute for reverting SQL.
3. Redeploy the saved previous sources/configuration for the 24 existing function entry points to the same staging target. Use the same deployment list above with `family-manage-pin` omitted, from the saved previous release checkout. Remove the newly added endpoint:

   ```sh
   supabase functions delete family-manage-pin --project-ref "$STUWY_STAGING_REF"
   ```

4. Restore the previous staging web artifact and reinstall the previous internal native builds. Remove test-created storage objects or restore the recorded storage snapshot as applicable. Require a fresh login and clear test browser/WebView storage to discard obsolete profile grants.
5. Verify baseline parent and independent-student login, child management, homework/chat/progress, and that requests still target staging. Confirm `20261009192443` is absent from restored migration history. Reopen staging only after the database, functions and clients agree on the previous release.

If no complete snapshot/baseline restoration path exists, activation is not ready. A data-preserving reverse migration would need separate design and testing against the actual staging schema; none is claimed here.

## Evidence already available versus pending

Passed locally: production Vite build; the earlier 383-test frontend suite; 26 focused release checks; 109 generation/import parser and contract checks; 13 privileged-function guard contract checks; 74 authorization assertions after migration application to a disposable PostgreSQL 18 schema fixture; 24 real local Auth/REST/PIN checks; browser chooser/PIN/relock flows; copied pre-family native bundle compatibility; snapshot restoration including real local Auth ownership; family-code lint; changed Edge Function TypeScript syntax parsing; and `git diff --check`. TypeScript diagnostic comparison found no new diagnostic identities, but the repository still has pre-existing type errors.

These were isolated synthetic checks, not real-account checks against complete hosted staging. All checklist rows remain unverified against PostgreSQL 15 with the complete schema, deployed hosted Edge runtime, real email/reset flows and physical Android/iOS devices. Log actual staging outcomes before declaring activation verified. Any cross-learner data, parent-lock bypass or retained parent authorization after a new session blocks release.
