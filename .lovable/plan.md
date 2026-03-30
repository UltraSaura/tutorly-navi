

## Fix: Child's Country & School Level Not Defined After Creation

### Root cause

Two gaps in the `create-child-account` edge function:

1. **`children` table**: The insert sets `grade` and `curriculum` but does NOT set `curriculum_country_code` or `curriculum_level_code`. The app reads from `curriculum_country_code` / `curriculum_level_code` to display the child's program.

2. **`users` table**: The `handle_new_user` trigger populates `country` from `user_metadata.country`, but the guardian's `ManualChildCreationTrigger` does NOT send a `country` field in the request body. Also, `users.curriculum_country_code` and `users.curriculum_level_code` are never set — the `useUserCurriculumProfile` hook reads these columns and finds them null.

### Fix

**`supabase/functions/create-child-account/index.ts`**

1. In the `children` insert (line ~175), add:
   - `curriculum_country_code: country || null`
   - `curriculum_level_code: schoolLevel || null`

2. After the trigger populates the `users` row, update it with curriculum fields:
   ```sql
   UPDATE users SET
     curriculum_country_code = country,
     curriculum_level_code = schoolLevel,
     country = country,
     level = schoolLevel
   WHERE id = childUserId
   ```

**`src/components/guardian/ManualChildCreationTrigger.tsx`**

3. Pass the `country` field in the request body (it's currently missing — check if the form collects it; if not, it needs to be added to the guardian child creation form).

### Files changed

| File | Change |
|------|--------|
| `supabase/functions/create-child-account/index.ts` | Add `curriculum_country_code` and `curriculum_level_code` to children insert; update `users` row with curriculum fields after trigger |
| `src/components/guardian/ManualChildCreationTrigger.tsx` | Pass `country` in the request body if available from the form |

