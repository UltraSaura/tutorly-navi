# Restricted Tester role

## Scope
Tester is a **student-level testing capability**, not an administrator role.

- Existing `public.user_roles` stores the `tester` enum role.
- `useAdminAuth` exposes `isTester` / `canPreviewSchoolLevels`, while `isAdmin` and admin route guards remain unchanged.
- Testers see the existing school-level selector in Account settings and a student preview banner.
- `useActiveSchoolLevel` selects preview level for admins and testers but never changes the persisted user level.
- Previews are display contexts only. They do not grant access to unpublished content or backend administrator endpoints.
- Existing user_roles RLS controls assignment. No public self-registration path can set this role.

## Provisioning
Apply the migration to the intended test environment before deploying frontend changes. An authorized administrator can add the `tester` role to an approved existing student account in `public.user_roles`. Do not add `admin` or alter the account's permanent school level. Review account and family enrollment status before assignment.

## Release verification
- Run unit tests and TypeScript/build CI on the feature branch.
- In staging, assign tester to a disposable non-admin student and confirm CP -> CM2 -> 6eme previews.
- Verify /admin is still inaccessible and admin-only API operations are denied.
- Verify student with no tester role cannot preview, including with a forged localStorage value.
- Verify learning attempts, quizzes, mastery and XP are not persisted in preview mode. **Do not approve release if any path writes progress in preview mode.**
- Verify regular students, guardians and administrators still behave as before.

Do not apply this migration to production or merge without passing the security checks.
