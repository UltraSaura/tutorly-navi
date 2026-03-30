
Goal: make child curriculum assignment reliable so children like **fanta** always get learning content immediately after login.

What I found (confirmed)
- `users` row for fanta has: `curriculum_country_code = FR`, `curriculum_level_code = CM1`.
- `learning_topics` data is stored with lowercase curriculum keys (example: `fr` + `cm1`).
- Curriculum bundle IDs (`src/data/curriculumBundle.json`) are also lowercase (`fr`, `cm1`).
- Because matching is exact, uppercase values from child creation/edit lead to “no program defined” and empty learning content.

Implementation plan

1) Normalize curriculum codes at write-time (source of truth fix)
- File: `supabase/functions/create-child-account/index.ts`
- Before saving, normalize:
  - `country` → lowercase curriculum country code
  - `schoolLevel` → lowercase curriculum level code
- Save normalized values into:
  - `users.curriculum_country_code`
  - `users.curriculum_level_code`
  - `children.curriculum_country_code`
  - `children.curriculum_level_code`
- Keep existing display/profile fields (`users.country`, `users.level`, `children.grade`) as-is for UI compatibility.

2) Fix guardian edit flow so edits don’t re-break curriculum
- File: `src/components/guardian/EditChildDialog.tsx`
- On save:
  - continue updating `users.country` and `users.level`
  - also update `users.curriculum_country_code` / `users.curriculum_level_code` using normalized values
  - keep `children.curriculum_*` updates, but normalized

3) Add read-time safety normalization (defensive)
- File: `src/hooks/useUserCurriculumProfile.ts`
- Normalize fetched `users.curriculum_*` before:
  - `getCountry(...)` / `getLevel(...)`
  - returning `profile.countryCode` and `profile.levelCode`
- This ensures legacy uppercase values still resolve while data is being cleaned.

4) Backfill existing bad rows (including fanta)
- Add a migration to normalize historical data:
  - `users.curriculum_country_code = lower(...)`
  - `users.curriculum_level_code = lower(...)`
  - `children.curriculum_country_code = lower(...)`
  - `children.curriculum_level_code = lower(...)`
- Restrict updates to non-null fields only.

5) Verify end-to-end
- Guardian creates child with country + school level.
- Child logs in:
  - Profile “School Program” is pre-filled
  - Learning page shows subjects/topics (not empty setup state)
- Re-test edit flow (change country/level in guardian edit dialog) and confirm learning updates correctly after child login/refresh.

Technical details
- Core mismatch is **case/ID format inconsistency** between:
  - write paths (`FR`, `CM1`)
  - content filters (`fr`, `cm1`)
- Durable fix = enforce normalization at all write points + backfill old data + defensive read normalization.
- No auth model or RLS policy changes required for this bug.
