# Private beta candidate

This release branch includes the existing `practice` features; it does not
activate PR #28's empty specification registry or deploy any backend code.

## Repeatable preparation

`npm ci`, `npm run build:beta`, then `npm run sync:beta:android`.
The beta build fixes the backend to staging and includes its source SHA in
`dist/beta-build.json`. It is a production-optimized bundle with dev routes off.
The staging app ID is `com.tutorly.learning.staging`, separate from the public app.

The **Private beta Android candidate** GitHub workflow runs on a PR to
`development` or manually. It runs tests and
builds a debug APK plus an **unsigned** release AAB using Java 21 and Android SDK.
It never uploads to a store, calls an AI provider or deploys database/functions.
The unsigned AAB needs the organization's upload signing key before Play upload.
Do not share the debug APK outside the private test group.

## Native authentication

The App plugin consumes both cold-start and already-open auth callbacks at
`stuwy-staging://auth/callback`. Tokens never enter browser history or logs.
Staging Supabase must allow this redirect; real email delivery, device links and
expired-link behavior must be verified on the candidate APK, not inferred from
unit tests. No Auth settings are changed by the build.

## Release acceptance (not yet certified)

- Register/sign in, email confirmation and password reset on Android.
- Parent/child profile selection, parent PIN, logout and language change.
- Verify access isolation between two test accounts and between child profiles.
- Published lessons: four levels, visuals, exercises, feedback and resume.
- Practice, videos, photo/file upload, homework, AI explanation and history.
- Permission denial, network loss and application restart recover gracefully.
- No admin access for ordinary test accounts; no draft lessons exposed.

Local web tests/build do not prove these device/backend behaviors. Existing
published content is not edited. Any real paid AI acceptance run requires a
separately approved budget. Production migrations/deployments are out of scope.

## Verification in this preparation

- 962 Vitest tests passed (89 files); TypeScript and optimized beta build passed.
- Capacitor Android sync passed and registered App 7.1.2.
- Android SDK, Java 21 and the upload signing key are not available on this host;
  no native APK/AAB compilation or physical-device acceptance is claimed here.
- Existing Capacitor core/Android version mismatch warning requires checking
  the native CI result; no untested wholesale dependency upgrade was applied.
- Staging functions were inventoried read-only. The security advisor still
  reports function grants/search-path warnings, OTP expiry/password-protection
  warnings and a database patch advisory. These are not proof of an exploit,
  nor are they a completed security review. See the Supabase advisor dashboard.
- `run-sql` has gateway JWT verification disabled but checks the service-role
  credential internally; no SQL execution request was sent to it.
