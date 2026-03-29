

## Guardian Children Tab: Show Details & Enable Editing

### Problem
1. The child card only shows `grade` (often empty), `email`, and `status` — it does **not** display the child's **country** or **school level**
2. The **Settings** (gear) button on each child card does nothing
3. There is no way to **edit** a child's information after creation

### What the query fetches vs what exists
- The query joins `children` → `users` but only reads `grade`, `curriculum`, `status` from `children` and `first_name`, `last_name`, `username`, `email` from `users`
- The `users` table has `country`, `level` (school level code) columns
- The `children` table has `curriculum_country_code`, `curriculum_level_code`
- Neither country nor school level is displayed on the child card

### Solution

**1. Update the query to fetch country and school level** (`GuardianChildren.tsx`)
- Add `country`, `level` from the `users` join
- Add `curriculum_country_code`, `curriculum_level_code` from `children`

**2. Display country and school level on each child card** (`GuardianChildren.tsx`)
- Show country name (resolve from `countries` table or the `useCountriesAndLevels` hook)
- Show school level name (resolve from `school_levels` table)
- Show username

**3. Create an Edit Child dialog** (new component `EditChildDialog.tsx`)
- Opens when clicking the Settings gear icon
- Pre-fills: first name, last name, email, country, school level, username
- Allows editing: first name, last name, email, country, school level
- On save: updates `users` table (first_name, last_name, country, level) and `children` table (grade, curriculum_country_code, curriculum_level_code, contact_email)

**4. Wire up the Settings button** (`GuardianChildren.tsx`)
- Click opens the Edit Child dialog with the selected child's data
- On successful save, invalidate the `guardian-children` query to refresh the list

### Files changed

| File | Change |
|------|--------|
| `src/pages/guardian/GuardianChildren.tsx` | Expand query to include country/level; display them on cards; add edit dialog state; wire Settings button |
| `src/components/guardian/EditChildDialog.tsx` | **New** — edit form with country/level selectors, pre-filled with child data, saves to both `users` and `children` tables |

### RLS consideration
- The `children` table already has an UPDATE policy for guardians
- The `users` table does NOT have a guardian UPDATE policy — we need to verify if guardians can update their children's user records. If not, we'll use the existing `create-child-account` edge function pattern or add an RLS policy allowing guardians to update their linked children's user rows

