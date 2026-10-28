# Family backend activation preparation — 2026-10-10

**Prepared only. No hosted SQL, migration repair, deployment, secret update, push or publication has been performed.** Read with the setup, staging verification, login diagnosis and **family-profile-live-impact-review.md** documents. The live-impact review is the approval packet and records the public-deployment evidence gap. This report supersedes their earlier uncertainty about whether the family SQL exists on the configured backend.

## Exact configured target and environment

| Evidence | Result |
|---|---|
| Workspace / Git branch | `/Users/hiroshigawa/projects/tutorly-parent` / `parent` |
| `.env` project ID and URL | `sibprjxhbxahouejygeu` / `https://sibprjxhbxahouejygeu.supabase.co` |
| Client fallback / `supabase/config.toml` / CLI `.temp/project-ref` | Same project reference |
| Supabase project metadata | **StudyWiz**, organization `wapzjksvurqwdmcuiemw`, region `eu-central-1`, `ACTIVE_HEALTHY` |
| Hosted database | PostgreSQL 15.8; pgcrypto installed in `extensions` |
| Supabase development branches | None listed |
| Production versus staging | **Unconfirmed.** This is the primary, unbranched project. Neither metadata nor repository configuration labels its intended environment. It must not be described as a confirmed staging target. Owner confirmation or a separately identified staging project is required before activation. |

Project Dashboard: https://supabase.com/dashboard/project/sibprjxhbxahouejygeu

## Hosted migration and schema inspection

Read-only Supabase queries confirmed:

- 136 remote migration versions; latest `20261006125452` (`add_student_product_tour_completion`).
- `20261009192443` is **not recorded** remotely. `family_private` and `public.family_bootstrap()` do **not exist**. This is not merely a stale Data API cache.
- `family-manage-pin` is absent from the hosted function inventory. The other 24 required function names exist; their versions still require the coordinated family update. Existence does not mean their family authorization code is deployed.
- All 13 directly required public tables exist. The hosted `users` approval fields, child status/grade fields and exercise attempt foreign key were inspected.
- The local repository has 135 migration versions, with six local-only and seven remote-only versions. **Do not bulk push, repair or replay that unrelated history.** Apply only the reviewed family migration after authorization.

Local-only versions:
`20260923130000`, `20260924113000`, `20260929155529`, `20260930204500`, `20261006125011`, `20261009192443`.

Remote-only versions:
`20260924112059`, `20260924222945`, `20260924223933`, `20260924224040`, `20260924224208`, `20260924224439`, `20261006125452`.

Release compatibility issues were found and corrected **locally** during preparation:

1. Hosted `children` has no `approval_status`; the family migration now uses `children.status` plus the existing learner's `users.approval_status`, without adding a competing approval column.
2. The hosted `protect_user_approval_fields` trigger rejects every non-admin cross-user update, including selected-child preferences. The migration now replaces its function with a narrow exception for an authorized learner's learning preference fields; all original approval restrictions remain. The existing child-field guard still rejects credential/role/approval edits in child mode.

3. Existing quiz-attempt and spaced-review policies allow only the account UUID. The migration now adds selected-child quiz INSERT and review INSERT/UPDATE policies. It preserves append-only quiz attempts and does not add review DELETE permission.

4. Family enforcement is now an empty, operator-managed cohort in `family_private.rollout_accounts`. Existing browser/native parents stay on the prior guardian flow until their account is explicitly enrolled. Enrollment is impossible through the public API. Updated clients detect server classification and use the chooser only for enrolled accounts.

5. The existing global explanation cache and `exercise_hash` upsert contract remain intact for unenrolled old clients. Enrolled families use the new `learner_explanations_cache`, unique by learner and hash; enrolled accounts cannot read the unowned legacy cache.

6. `topic_lesson_level_progress` and `learning_interaction_events` are absent remotely and are not required by the family feature. The V2 path now keeps per-level UI state in learner-scoped local storage while authoritative mastery continues through existing tables. Optional learning analytics network access is disabled unless `VITE_ENABLE_LEARNING_ANALYTICS=true`; this release must leave it false.

7. The service-backed `import-curriculum-bundle` endpoint was missing the privileged-family guard. It is now included, increasing the coordinated function set from 24 to 25.

The disposable local fixture now includes the hosted approval trigger and omits the nonexistent child approval column. The corrected migration passed **74 authorization checks**, including selected-child preference writes, rejection of unapproved learners, disabled-cohort legacy behavior, preservation of the old cache upsert contract and enrolled/independent teacher/admin roles. This is local verification, not a hosted dry run.

Reviewed migration SHA-256:
`6cd5e226858ded26d8ffba0450779b902027fe0cb2420878809613b49b1defe4`.

## Exact commands — execute only after target and activation are authorized

These commands target the currently configured project. If a different staging project is selected, substitute its confirmed reference and database URL together; do not use StudyWiz's credentials for it. First record a complete restorable database snapshot and previous function/frontend/native artifacts as described in the staging runbook. The snapshot must also preserve the existing approval-trigger function now being changed. Keep access restricted during the coordinated release.

Provide `STUWY_FAMILY_DB_URL` through the operator's secure environment/secret manager; it must be the confirmed target's PostgreSQL connection URL with percent-encoded credentials. Do not print it or place credentials in this document or shell history. `SUPABASE_ACCESS_TOKEN` must already be available through the normal CLI login/environment. CLI help was checked for the flags below.

```sh
cd /Users/hiroshigawa/projects/tutorly-parent
export STUWY_FAMILY_PROJECT_REF='sibprjxhbxahouejygeu'
: "${STUWY_FAMILY_DB_URL:?Provide the confirmed target database URL securely}"

# Read-only inventory immediately before activation.
supabase migration list --db-url "$STUWY_FAMILY_DB_URL"
psql "$STUWY_FAMILY_DB_URL" -X -v ON_ERROR_STOP=1 \
  -c "SELECT to_regnamespace('family_private') AS family_schema, to_regprocedure('public.family_bootstrap()') AS bootstrap;"
shasum -a 256 supabase/migrations/20261009192443_family_profiles.sql

# APPLY ONLY THIS MIGRATION; stop on any error. It includes BEGIN/COMMIT.
psql "$STUWY_FAMILY_DB_URL" -X -v ON_ERROR_STOP=1 \
  -f supabase/migrations/20261009192443_family_profiles.sql

# No migration-history repair or unrelated migration application.
# Record the successful transaction, target and checksum in the release ledger.

# Deploy the 25 required entry points, preserving supabase/config.toml JWT settings.
supabase functions deploy --project-ref "$STUWY_FAMILY_PROJECT_REF" --use-api \
  family-manage-pin ai-chat document-processor validate-training-answer \
  create-child-account delete-account export-guardian-report \
  quiz-bank-all quiz-bank-visible quiz-bank-attempt recommendations student-progress \
  class-students teacher-classes generate-lesson-content \
  generate-quiz-from-topics generate-quiz-from-transcripts generate-topics-from-objectives \
  import-exam-bundle import-training-items import-curriculum-bundle ingest-curriculum-edition \
  manage-api-keys subject-icon-upload suggest-topic-objectives
```

Run blocks step by step, inspecting each result; do not paste through a failed step. The direct SQL procedure leaves migration history unchanged by explicit request. After success, absence of this version in history does NOT mean SQL is unapplied. Inspect the schema and release ledger; do not rerun the non-idempotent migration. Later history reconciliation is a separate task requiring authorization. Do not use `--prune` or globally disable JWT verification. `_shared/family-access.ts` is bundled with its consumers. Keep `family_private` outside exposed API schemas.

### Secrets

The remote secret inventory was filtered to **names only**. Required `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are present. These are Supabase-injected reserved variables; no new family secret or `secrets set` command is needed. Secret values were not inspected, printed, changed or validated by invoking the new runtime.

Existing AI/document provider secret names are present, including `OPENAI_API_KEY`, `MISTRAL_API_KEY`, `DEEPSEEK_API_KEY`, `GOOGLE_VISION_CREDENTIALS`, `SIMPLETEX_APP_ID`, `SIMPLETEX_APP_SECRET` and `LOVABLE_API_KEY`. Preserve their existing values. Presence alone does not prove provider credentials work.

If an independently confirmed **custom** provider secret needs provisioning on a new staging target, the exact command is:

```sh
# Only when separately needed and authorized; file contains custom names only.
# Store it outside the repository with mode 0600. Do not cat it or enable shell tracing.
supabase secrets set --project-ref "$STUWY_FAMILY_PROJECT_REF" \
  --env-file /absolute/private/path/stuwy-custom-functions.env
```

Do not upload the root `.env`: it mixes frontend values and reserved `SUPABASE_*` variables. Supabase rejects custom secret names with that reserved prefix. [Official function secret documentation](https://supabase.com/docs/guides/functions/secrets).

### Frontend and post-activation checks

Build against the same confirmed project; obtain the public client key through the secure operator environment, never the service-role key:

```sh
export VITE_SUPABASE_URL="https://${STUWY_FAMILY_PROJECT_REF}.supabase.co"
: "${VITE_SUPABASE_PUBLISHABLE_KEY:?Provide the matching public client key securely}"
export VITE_ENABLE_LEARNING_ANALYTICS='false'
npm run build
supabase migration list --db-url "$STUWY_FAMILY_DB_URL"
psql "$STUWY_FAMILY_DB_URL" -X -v ON_ERROR_STOP=1 \
  -c "SELECT to_regnamespace('family_private') AS family_schema, to_regprocedure('public.family_bootstrap()') AS bootstrap;"
```

Release only to the authorized frontend target and restart the local Vite server after any environment change. Confirm `/family` SPA fallback, CORS `x-family-grant`, and the full function set. Follow the staging runbook's coordinated snapshot rollback if validation fails; a frontend-only rollback does not undo SQL. Migration history must remain untouched.

## Browser verification status and next authorized run

**Actual isolated rehearsal:** a native local Supabase stack supplied real Auth, REST and Edge Function services. A synthetic parent login opened `/family`, displayed two linked children, selected Alice and Benoit into their own student interfaces, preserved Benoit after refresh, switched without logout, rejected an incorrect PIN, accepted a server-verified PIN, opened the guardian portal, and relocked direct portal navigation after returning to child mode. An unenrolled synthetic guardian also opened the existing guardian portal through a copied pre-family native bundle. These results do not constitute verification against the complete hosted schema or a physical device.

After activation is authorized and completed, use an identified approved test family with two distinct linked learners. The user must complete new PIN credential entry/setup in the browser. Record actual URL, visible identity and data evidence for each check, without tokens or credentials:

| Required result | Current status |
|---|---|
| Fresh enrolled-parent login opens `/family` | Passed in isolated local browser; hosted staging pending |
| All linked children appear with correct identity/level | Passed in isolated local browser |
| Each child opens `/chat` and reads only its own homework/chat/progress/points | Browser identity plus real local REST isolation passed; complete dashboards pending |
| “Changer de profil” returns to `/family` without replacing the Auth session | Passed in isolated local browser |
| Password-reauthenticated PIN setup and server-verified PIN entry work | Passed through real local Edge Function/browser |
| Leaving parent mode revokes its grant; direct navigation cannot reopen parent portal without PIN | Passed in isolated local browser/REST |

Remaining blockers before hosted activation approval: confirm whether the primary unbranched project is production or staging; identify the public web/native builds that target it; rehearse against the complete PostgreSQL 15 staging schema; prove the hosted backup/restore path; run real-provider generation/import and complete-schema admin/teacher workflows; verify physical Android/iOS devices; and prepare the approved pilot family described in `docs/family-profile-pilot.md`. Local mocks, parsers, bundle validation, guard checks and RLS regressions passed but do not clear those hosted/device checks.
