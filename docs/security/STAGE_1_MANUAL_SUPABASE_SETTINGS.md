# Stage 1 Manual Supabase Settings

These items were identified for manual review. They were not changed in production.

## Auth and session settings

- leaked-password protection
- password policy strength
- email OTP expiry
- session/JWT lifetime
- refresh-token/session revocation behavior for deleted or suspended users

## Edge Function/runtime settings

- production `ALLOWED_ORIGINS` secret/env values
- function secrets inventory
- log-retention and redaction settings

## Database settings

- database patch level / maintenance window
- backups and restore testing
- Data API exposure settings for newly created or existing tables

## CAPTCHA / abuse controls

The student self-registration path still assumes product-supported self-registration. `create-student-account` therefore remains intentionally public (`verify_jwt = false`) in this branch. If production wants to keep that path public, add a dashboard-backed CAPTCHA or equivalent abuse control in addition to the new server-side throttling.
