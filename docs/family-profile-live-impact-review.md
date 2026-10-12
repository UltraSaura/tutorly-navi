# Family activation approval packet — 2026-10-10

Prepared in `tutorly-parent`, branch `parent`. No hosted SQL, deployment, secret change, migration-history repair, push or publication was performed. **Activation remains blocked on live-target evidence and release/rollback readiness.**

## Public deployment versus local configuration

| Evidence inspected | What it establishes |
|---|---|
| Local `.env` project ID/URL; client URL fallback; `supabase/config.toml`; CLI project reference | `tutorly-parent` targets `sibprjxhbxahouejygeu`, `https://sibprjxhbxahouejygeu.supabase.co`. No secret values are reproduced. |
| Supabase metadata and branch inventory | Active main project, EU Central, PostgreSQL 15.8; no development branches listed. Its name does **not** establish staging or production. |
| Repository `index.html` metadata | Advertises `https://stuwy.app/`; public retrieval failed and the system DNS lookup returned ENOTFOUND. No served bundle/configuration was inspected. |
| Repository sitemap/robots | Advertise `https://stuwy.com/`; retrieval failed certificate validation, including with system CA support. Certificate verification was not disabled. |
| Repository README | Links a Lovable project, not proof of the published URL or build. Opening that private project dashboard was rejected by automatic approval review because it could expose private project/account content beyond the requested public deployment. Permission was requested; no bypass was attempted. |

**Conclusion: neither production nor staging is confirmed.** The live-versus-local comparison is incomplete because no actual public deployment was retrieved. Obtain the published URL (or explicit read-only permission for its hosting dashboard), then inspect the served app's Supabase endpoint and compare its project reference to the local reference above. Record final URL, build asset/release identifier and endpoint without keys/tokens. A repository domain, project name, active status, guardian records or main-branch status is insufficient evidence. Do not activate this project on the assumption that it is staging.

## Dependencies and divergent history

Read-only hosted catalog inspection, rather than replaying migration versions, confirmed all 13 directly referenced public tables: `users`, `children`, `guardians`, `guardian_child_links`, `user_roles`, `teachers`, `classes`, `class_student_links`, `delegation_tokens`, `parent_child`, `exercise_history`, `exercise_attempts`, `exercise_explanations_cache`. Required ownership/join/approval columns, `auth.users`, `auth.sessions`, `app_role`, pgcrypto in `extensions`, and the three existing helper/trigger signatures are present. `children.approval_status` does not exist; the reviewed SQL uses `children.status` and `users.approval_status` instead. PostgreSQL supports security-invoker views.

There are 135 local and 136 remote migration versions. Exact differing versions are in [activation preparation](family-profile-activation-preparation.md). Family version `20261009192443`, `family_private`, and `public.family_bootstrap()` are absent remotely. `family-manage-pin` is absent; the other 23 function names exist, but their family-compatible runtime is not verified.

**Apply only `20261009192443_family_profiles.sql`. Do not run `db push`, `migration up`, repair history, or replay any other local-only version.** No earlier local-only migration is required to compile the family SQL against the inspected hosted schema.

Missing V2 dependencies are removed from this release. Hosted `topic_lesson_level_progress` and `learning_interaction_events` are absent; the unrelated local level-progress migration also references absent `learning_topics`. The current family flow no longer queries the V2 progress table. Per-level UI state remains learner-scoped in local storage and authoritative mastery continues through existing tables. Analytics reads/writes are disabled unless `VITE_ENABLE_LEARNING_ANALYTICS=true`, which must remain false for this release. No unrelated V2 migration is included. Hosted `chat_messages` is also absent, so a deployed chat-row isolation claim still requires the actual chat persistence path to be identified in complete staging.

## Effects if this is the live project

Treat these as potential production impacts until classification is resolved:

- The server cohort starts empty. Existing guardian accounts remain on the prior portal until an operator inserts that account into `family_private.rollout_accounts`; no browser role can self-enroll. Only enrolled accounts require the chooser/PIN/grant flow. This provides a backward-compatible browser/native transition, provided an account is enrolled only after its clients are updated.
- Private PIN hashes, attempts and session grants are added. Parent grants expire after 15 minutes; child grants after 8 hours. PIN setup/reset uses password reauthentication in the new Edge Function. PIN entry is limited to five attempts per 15-minute window. Switching, reset, expiry, removed links and revoked Auth sessions invalidate access as specified in the verification checklist.
- Eleven existing learner-owner tables receive additional restrictive RLS: `children`, `class_student_links`, `curriculum_task_attempts`, `exercise_history`, `lesson_sessions`, `objective_mastery`, `quiz_bank_attempts`, `spaced_review_states`, `student_mastery`, `training_item_answers`, `user_learning_progress`. They already have RLS enabled. Restrictive policies constrain legacy permissive policies for enrolled families while the reviewed legacy-guardian predicates preserve existing linked-child access for unenrolled guardians.
- Additional rules protect `users`, `user_roles`, `exercise_attempts`, related explanation data and parent-owned `parent_child`, `guardians`, `guardian_child_links`, `delegation_tokens`. No matching hosted billing/subscription/payment table was found in the parent-table scan. Existing role/guardian helpers and the approval-trigger function are replaced. Selected-child updates are limited to learning preferences; approval/account changes remain protected.
- New family quiz INSERT and spaced-review INSERT/UPDATE policies allow the selected learner to work despite the parent Auth UUID. Quiz UPDATE/DELETE and review DELETE permissions are not added. Existing independent approved students retain their own identity; live-session and approval checks now also constrain their learner access. Teacher/admin access needs real-account regression checks.
- All 174 existing explanation-cache rows and global `exercise_hash` uniqueness remain unchanged for old clients. Updated enrolled families use the separate `learner_explanations_cache`, unique on `(learner_user_id, exercise_hash)`. Enrolled accounts are denied the legacy unowned cache, so their explanations regenerate into the new table. Existing `onConflict: exercise_hash` writes remain valid for unenrolled old clients.
- Relevant hosted views were absent in the inspected view inventory, so the security-invoker loop currently has no matching work. Recheck immediately before release.
- Service-role Edge Functions bypass RLS. The full updated 25-function set is required; SQL alone cannot secure the complete request path. The source audit added the previously omitted `import-curriculum-bundle` guard. Existing installed Android/iOS bundles were confirmed to target this Supabase reference and contain no family RPCs. A copied pre-family native bundle successfully logged an unenrolled synthetic parent into the legacy portal against the isolated activated stack.

**Do not approve SQL-only activation.** Release the new client and 25 functions before enrolling any account. The cohort avoids forcing an upgrade on unenrolled old clients, but enrolled users on an old device will fail closed rather than get the family chooser. Establish the actual live web/native build inventory and complete-schema staging results first.

## Exact targeted activation after approval

The exact `psql`, 25-function deployment, secrets and frontend build commands are in [activation preparation](family-profile-activation-preparation.md). The reviewed SQL SHA-256 is:

`6cd5e226858ded26d8ffba0450779b902027fe0cb2420878809613b49b1defe4`

Execute those blocks step by step only after explicit target/release approval:

1. Confirm the project from public-deployment evidence. Recheck hosted catalog, migration inventory and SQL checksum. A checksum change requires another review. Capture a complete restorable baseline, previous function sources/JWT settings, web artifact and native releases. Enter a maintenance window that prevents old clients and service integrations from writing, not merely a frontend maintenance banner.
2. Apply only the complete transaction with `psql ... -X -v ON_ERROR_STOP=1 -f supabase/migrations/20261009192443_family_profiles.sql`. Stop on errors and verify rollback before retrying. If the connection outcome is uncertain, inspect catalog state; do not blindly rerun.
3. Record target, checksum, successful SQL result and release identifiers in the external release ledger. **Leave remote migration history unchanged.** The version will still be absent there after direct SQL application; use catalog evidence to determine whether activation occurred. Future history reconciliation requires separate authorization.
4. Deploy the listed 25 functions to that same reference with existing JWT settings. No new family secret is required: reserved `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` names are present. Preserve provider secrets; names do not establish runtime validity. Never upload root `.env` or print credentials.
5. Build/release the matching web/native artifacts through the confirmed host/release process with `VITE_ENABLE_LEARNING_ANALYTICS=false`. No exact host publication command can be supplied until that host is identified. Verify SPA routing to `/family`, CORS grant headers and private-schema exposure settings.
6. Enroll only the approved test account using an operator-side parameterized insert into `family_private.rollout_accounts`; never expose this table through the client. Keep all other families unenrolled.
7. Keep access restricted until the [real-account checklist](family-profile-staging-verification.md) passes: fresh parent login, every child, own data, switching without logout, PIN setup/verification, and relocking. Also test direct APIs, independent students and supported native flows. Record actual browser/device results. Then expand the cohort deliberately.

## Rollback procedure

There is no reviewed down migration. A verified restore point and the actual project's restoration procedure must be recorded before approval; neither has been established during this read-only review.

1. If validation fails, keep/reinstate the server-side maintenance/write freeze. Record the failed stage and whether the SQL transaction committed. A failed SQL transaction rolls back its SQL; a partial function deployment still needs function restoration.
2. Restore the complete pre-activation database baseline through the recorded, tested target restoration procedure. It must restore Auth, original `has_role`, `is_guardian_of_child`, `prevent_non_admin_approval_changes`, triggers, RLS policies, view options, explanation cache rows/indexes and migration history together. Restore affected storage objects separately if necessary. Do not drop `family_private CASCADE` or recreate global hash uniqueness over potentially duplicated new cache rows.
3. Redeploy the recorded previous versions of all changed functions with their former JWT settings, and restore the previous web/native release configuration. Installed native builds need the recorded distribution/upgrade plan; a web rollback does not replace them.
4. Verify old parent login/portal behavior, independent student reads/writes, provider endpoints and original cache uniqueness before reopening. Invalidate family grants/sessions through the restoration/session plan, never by exposing stored tokens.
5. Snapshot rollback is suitable before reopening, when only disposable verification writes occurred. After real users resume writes, restoring an old snapshot can lose their work. Keep access frozen and choose a separately reviewed data-preserving reversal or forward fix. No automatic destructive rollback is authorized.

## Evidence already passed versus pending

- Latest corrected SQL transaction and **74 authorization checks passed** on an isolated local PostgreSQL fixture with the hosted approval trigger, disabled cohort behavior, legacy cache contract, real quiz/review limits and enrolled/independent teacher/admin role behavior.
- A native local Supabase stack ran actual Auth, REST and Edge Functions. Twenty-four API checks passed: password login, family classification, two chooser cards, pre-PIN denial, password-reauthenticated PIN setup, two-child homework/chat/progress/points isolation, other-family rejection, PIN unlock, relock and independent login.
- Actual browser results passed for enrolled parent login → `/family`, both child selections, switch without logout, refresh restoration, incorrect/valid PIN, guardian portal and relock. An existing copied native web bundle passed unenrolled parent login → legacy guardian portal. This is browser execution of a native bundle, not an installed-device test.
- A complete local real-Auth snapshot restored successfully into a separate database with six Auth accounts, six profiles, three links, original Auth ownership, approval trigger, legacy global cache uniqueness and no family schema/policies/new cache. Hosted backup restoration remains unverified.
- Targeted family/analytics tests passed (26 tests), generation/import parser and contract tests passed (109), privileged-function guard contracts passed (13), and the production build passed. The isolated fixture lacks several application tables and real provider credentials, so complete provider/import/admin/teacher workflows, physical Android/iOS builds and PostgreSQL 15 staging remain pending.

Approval scope: **one reviewed family SQL transaction, the 25 listed function updates, the matching app release, explicit cohort enrollment, and no new secrets or history repair**. Remaining blockers are the public URL/build evidence, confirmed target classification, complete-schema PostgreSQL 15 rehearsal, hosted backup/restore readiness, physical-device verification and real-provider/complete-schema workflow checks. No activation is requested by this document alone.
