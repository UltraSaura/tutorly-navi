# One-family family-profile pilot

This is a prepared pilot plan. The hosted project and rollout cohort remain unchanged. Enrollment occurs only after the target, release and named account are explicitly authorized.

## Required before authorization

- Confirm whether the target project is staging or production and record its project reference, public web URL, current web release and installed native build IDs.
- Name one approved guardian Auth account for the pilot. It must have a current guardian row and two active, approved linked children with distinguishable homework, chat, progress and points data. Record the account UUID, both `children.id` values and both learner `children.user_id` values in the private test record.
- Provide tester-controlled access to the parent password and inbox. Choose the PIN interactively; never place the password, PIN, access token or family grant in the release record.
- Keep a second, unenrolled test family available only for cross-family rejection. It is not added to the cohort.
- Record a complete pre-activation database snapshot and prove its restore procedure. Save the preceding 24 function artifacts/configuration and preceding web/native artifacts. Record storage separately if uploads will be tested.
- Apply only migration `20261009192443_family_profiles.sql`, deploy the reviewed 25 functions and publish the matching client before enrollment. Keep `VITE_ENABLE_LEARNING_ANALYTICS=false`, preserve existing provider secrets, and keep `family_private` outside exposed Data API schemas.
- Verify provider-backed lesson/quiz/objective generation, exam/training/curriculum import, teacher classes/students and admin management on complete-schema staging. Use synthetic content and an approved provider budget. Successful local mocks do not satisfy this requirement.
- Have an operator with database access available to enroll, revoke and remove the account. Have application/function logs and database query monitoring available for the pilot window.

## Final pre-enrollment gate

Run this operator-only read using the approved account UUID. It must return one approved guardian, at least two active linked children and no existing cohort row:

```sh
: "${STUWY_FAMILY_TEST_ACCOUNT_ID:?Supply the approved parent auth.users ID}"
psql "$STUWY_STAGING_DB_URL" -X -v ON_ERROR_STOP=1 \
  -v account_id="$STUWY_FAMILY_TEST_ACCOUNT_ID" \
  -c "SELECT u.id AS account_id, u.approval_status, g.id AS guardian_id, count(*) FILTER (WHERE c.status='active' AND cu.approval_status='approved') AS active_children, EXISTS (SELECT 1 FROM family_private.rollout_accounts r WHERE r.account_id=u.id) AS already_enrolled FROM public.users u JOIN public.guardians g ON g.user_id=u.id LEFT JOIN public.guardian_child_links l ON l.guardian_id=g.id LEFT JOIN public.children c ON c.id=l.child_id LEFT JOIN public.users cu ON cu.id=c.user_id WHERE u.id=:'account_id'::uuid GROUP BY u.id,u.approval_status,g.id;"
```

Enrollment is a separate authorized step. After confirming the command targets the approved project and the preflight result is correct:

```sh
psql "$STUWY_STAGING_DB_URL" -X -v ON_ERROR_STOP=1 \
  -v account_id="$STUWY_FAMILY_TEST_ACCOUNT_ID" \
  -c "INSERT INTO family_private.rollout_accounts(account_id) VALUES (:'account_id'::uuid) ON CONFLICT (account_id) DO NOTHING RETURNING account_id, enabled_at;"
```

## Pilot checks and exit criteria

Immediately run the complete real-account checklist in `docs/family-profile-staging-verification.md`. The minimum pilot evidence is: fresh login opens `/family`; both children appear; each child sees only its own data; profile switching and refresh work; PIN setup/reset/rate limits work; direct APIs and the other family's child ID are rejected; leaving parent mode relocks the portal; the independent student and unenrolled guardian flows remain unchanged; and the supported physical Android/iOS builds pass cold-start, background and sign-out behavior.

Any cross-family data, parent access without a valid grant, retained parent authorization after switching/sign-out, failed existing-client login, or material admin/teacher/provider regression stops the pilot. Do not add another cohort row.

## Immediate containment and rollback

First revoke grants and remove the pilot row. This returns the account to the legacy guardian classification without waiting for a client release:

```sh
psql "$STUWY_STAGING_DB_URL" -X -v ON_ERROR_STOP=1 \
  -v account_id="$STUWY_FAMILY_TEST_ACCOUNT_ID" \
  -c "BEGIN; DELETE FROM family_private.grants WHERE account_id=:'account_id'::uuid; DELETE FROM family_private.rollout_accounts WHERE account_id=:'account_id'::uuid; COMMIT;"
```

Require sign-out/sign-in and verify the legacy guardian portal. If the release itself must be reversed, keep access closed and follow the complete snapshot, function and client restoration procedure in `docs/family-profile-staging-verification.md`. Removing the cohort row contains the pilot but does not reverse the migration.
