I checked the data for child `fanta` and the database is correct:
- `users.curriculum_country_code = fr`
- `users.curriculum_level_code = cm1`
- the `Fraction` topic exists for `fr/cm1`
- the topic has an active video allowed for `FR:CM1`

Do I know what the issue is? Yes.

### Root cause
This is not a curriculum/RLS problem anymore. The video is being removed by strict language filtering.

In `src/hooks/useCoursePlaylist.ts`:
1. topic videos are fetched
2. `filterContentByUserLevel(...)` removes any video whose `language !== userLanguage`
3. only after that, `selectBestVariants(...)` runs

So if `fanta` opens a topic where the only available video is French, and the app language is currently English, the French video gets filtered out before fallback logic can choose it. That leaves the page empty.

### Fix
1. `src/hooks/useCoursePlaylist.ts`
- Stop filtering playlist videos by exact UI language before variant selection
- First filter only by age/school level
- Then choose the best available variant:
  - user language first
  - else English
  - else first available variant
- Keep standalone videos if they match level/age, even when their language differs from the UI language

2. `src/utils/schoolLevelFilter.ts`
- Split the helper so language filtering is optional
- Keep age/level filtering reusable without forcing exact language matches

3. `src/hooks/useSuggestedVideos.ts`
- Apply the same fallback-aware behavior there, so suggested videos do not disappear for the same reason

4. `src/context/AuthContext.tsx` (defensive)
- Normalize `user.user_metadata.country` before language detection so `FR` and `fr` behave the same
- This is not the main bug, but it prevents wrong fallback to English during login/session switches

### Result after implementation
- `fanta` will see the `Fraction` video again
- French-only content will still appear even if the interface is in English
- when both French and English variants exist, the app will still prefer the current language

### Verification
- Log in as `fanta`
- Open `/learning/mathematics/Fraction`
- Confirm the playlist is visible again
- Confirm language preference still works when multiple variants exist
- Confirm switching between guardian and child accounts no longer makes the topic appear empty

No database change is needed for this fix.