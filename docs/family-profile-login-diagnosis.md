# Parent login diagnosis — 2026-10-10

## Confirmed cause and current running build

The originally running Vite process (PID 90127, port 8080) had working directory `/Users/hiroshigawa/projects/tutorly-development`. Its `App.tsx` has no `/family` route or family provider. Its `AuthPage.tsx` sends authenticated users to their return destination (normally `/`), and `Index.tsx` checks the guardian row and redirects guardians to `/guardian`. This directly explains the reported old Guardian Portal with no chooser.

That server was stopped. Port 8080 now serves `/Users/hiroshigawa/projects/tutorly-parent` (PID 93750 when checked). Both the process working directory and the served `/src/App.tsx` were checked; the served module includes `FamilyProfileProvider`, `FamilyRouteBoundary` and `/family`. No other workspace source files were modified.

## Backend checks, not assumptions

Subsequent read-only hosted inspection is recorded in `docs/family-profile-activation-preparation.md`: it confirmed that the family migration is unrecorded and both `family_private` and `family_bootstrap()` are absent, resolving the schema-cache uncertainty below. It also identified and locally corrected child-approval and existing approval-trigger compatibility issues.

The configured `.env` backend is `https://sibprjxhbxahouejygeu.supabase.co`.

- Read-only POST to `/rest/v1/rpc/family_bootstrap` with the configured public API key: HTTP 404, `PGRST202`, “Could not find the function public.family_bootstrap without parameters in the schema cache”.
- OPTIONS to `/functions/v1/family-manage-pin`: HTTP 404, `NOT_FOUND`, “Requested function was not found”.

The required RPC is unavailable in the Data API schema cache and the new PIN function is unavailable at the configured function endpoint. The requests do not establish whether the SQL was never applied or the schema cache is stale; the migration history was not inspected. They do establish that the corrected client cannot use this backend for the family login/PIN flow yet. Availability of all other updated functions was not inferred from these two checks.

There is no browser environment feature flag for the family route/provider. Activation is controlled by the server cohort: `family_bootstrap` returns family mode only for guardian accounts present in `family_private.rollout_accounts`. Unenrolled guardians remain on the existing portal.

## Corrected redirect and authorization path

1. `AuthContext.signIn` preserves the account's Supabase session and verifies account approval through `family_bootstrap`.
2. `FamilyProfileProvider` initializes once for the Auth session and loads linked cards through `family_profiles`; a saved profile grant must be server-validated.
3. `AuthPage` waits for initialization and sends family accounts to `/family`, taking precedence over an old guardian return destination.
4. `FamilyRouteBoundary` requires profile selection before child or guardian routes mount. Without a selection, `Index` also routes a family to `/family`. `/family` does not use `GuardianLayout` and has no redirect back to `/guardian` without a parent grant.
5. A child card calls `family_select_child`, validates/loads that child, and navigates to `/chat` using the selected learner while retaining the parent's Auth session.
6. Parent entry uses `family_unlock_parent`; setup/reset invokes the password-reauthenticating `family-manage-pin`. Guardian routes only mount in authorized parent mode.
7. Profile switching clears learner state/requests, revokes the grant through `family_lock`, and navigates to `/family` without sign-out. A visible switch bar now appears in guardian and student layouts on desktop/mobile, in addition to avatar-menu switching; it also remains available in student focus sessions.

Missing RPC activation now produces the explicit translated `family.backendUnavailable` message, rather than only a generic approval error. Permission failures and PIN rate-limit results remain distinct. No browser-only PIN fallback or relaxed backend authorization was introduced.

## Actual verification and limitations

- Browser: opened the corrected local build and visited `/family`. With no signed-in account, it returned to `/auth` and displayed the French login form, rather than a guardian dashboard. The browser tab was left available for handoff.
- Authenticated parent login, chooser cards, child selection and PIN entry were **not verified end-to-end in the browser**: no test-parent session was available, and the configured backend lacks the required live endpoints. No fixture or mocked session was presented as a successful real-account login.
- Follow-up checks: 20 tests passed (18 family tests plus 2 translation coverage tests); production build passed; targeted API/menu lint and `git diff --check` were run. These checks do not replace the pending authenticated browser verification.

Before hosted real-account verification, choose the intended staging target and follow `docs/family-profile-staging-verification.md` to apply migration `20261009192443`, deploy its 25 function entry points and build against explicit staging environment values. If the SQL is already present, inspect definitions/schema-cache visibility before rerunning the non-idempotent file. Do not infer application from migration history. Enroll only the approved test parent in the server cohort, then exercise login → chooser → child → switch → PIN → guardian → switch, including an old `/guardian` return destination.

No database migration, function deployment, push, merge, commit or publication was performed during this diagnosis.
