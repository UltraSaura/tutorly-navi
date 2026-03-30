

## Fix: Re-creating a Deleted Child Fails ("email already registered")

### Root cause
When a guardian deletes a child, only the `children` row and `guardian_child_links` are removed. The **auth user** (`fanta@child.local`) remains in Supabase Auth. When the guardian tries to recreate the same username, `createUser` fails with "A user with this email address has already been registered."

### Solution
Update the `create-child-account` edge function to handle the case where the auth user already exists:

1. Try to create the auth user as before
2. If it fails with `email_exists`, look up the existing auth user by email (`username@child.local`)
3. Check if there's already an active `children` profile linked to another guardian — if so, reject (prevent hijacking)
4. If the user exists but has no active child profile, reuse the auth user ID:
   - Update the auth user's metadata (name, country, etc.) and password
   - Create a new `children` row and `guardian_child_links` entry

### Changes

**`supabase/functions/create-child-account/index.ts`**
- After the `createUser` call, catch the `email_exists` error
- Use `supabaseAdmin.auth.admin.listUsers()` filtered by email to find the existing user
- Update their metadata and password via `supabaseAdmin.auth.admin.updateUserById()`
- Continue with the existing child profile creation logic (which already handles idempotent creation)

Single file change + redeploy.

