# Staging mobile signup

The staging build uses Supabase project `sibprjxhbxahouejygeu` only. The
production project and production app identifiers are unchanged.

## Build inputs

```sh
VITE_SUPABASE_URL=https://sibprjxhbxahouejygeu.supabase.co \
VITE_AUTH_REDIRECT_URL=stuwy-staging://auth/callback \
VITE_AUTH_RESET_REDIRECT_URL=stuwy-staging://auth/callback \
npm run build
npx cap sync --config capacitor.config.staging.ts
```

The staging Capacitor config uses `com.tutorly.learning.staging` and
`Stuwy Staging`, so an install cannot replace the public app.

## Supabase Auth settings required

In the staging project's Auth URL Configuration, set the Site URL to the
staging web origin used by testers and add exactly:

```text
stuwy-staging://auth/callback
```

Email confirmation must remain enabled for staging. The confirmation and
password-reset templates must use `{{ .ConfirmationURL }}` so the requested
redirect is preserved. No service-role key belongs in the client build.

The project settings API was not available through the connected management
tools in this run, and no staging web origin was supplied. Therefore those
dashboard changes and an end-to-end email/deep-link test remain pending.

## Server onboarding

Migration `20261011160000_staging_self_service_family_onboarding.sql` is
applied to staging only. It approves new parent signups in the server-side
Auth trigger, creates the normal guardian profile, and enrolls that newly
created guardian in `family_private.rollout_accounts`. Existing accounts and
production users are not imported or changed. The rollout table remains empty
until a real tester self-registers.
