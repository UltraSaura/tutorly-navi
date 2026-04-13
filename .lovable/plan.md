
Goal: make the app consistently use French for Fanta when France is the selected country, including chat UI, explanation modal, AI explanations, and voice.

What I found
- The app currently has 2 competing language systems:
  1. `SimpleLanguageContext` using `src/locales/*` and localStorage key `lang`
  2. `react-i18next` using `src/i18n/*` and its own detection/storage
- Different screens use different systems, so the app can stay in English or become mixed.
- Country-based detection is also split across different data sources:
  - `users.country`
  - `user_metadata.country`
  - `curriculum_country_code`
  So “France selected” does not always feed the language actually used by the app.
- There is still a direct explanation bug: `useTwoCardTeaching` sends `"french"` as the `language` param, but the edge function only maps `"fr"` correctly, so it falls back to English.

Implementation plan

1. Unify language state
- Make `SimpleLanguageContext` the single source of truth for app language.
- Add shared helpers for:
  - normalizing language codes (`en` / `fr`)
  - mapping AI names (`fr -> French`)
  - syncing storage + i18next together
- Update `src/i18n/index.ts` so i18next reads the same active language as the app.

2. Fix auto-detection for logged-in users
- In `SimpleLanguageContext`, detect language in this order:
  manual selection -> `users.country` -> `users.curriculum_country_code` -> browser/country detection -> English
- Stop duplicate detection logic in `AuthContext` from changing only i18next and drifting out of sync.

3. Route all language changes through one API
- Update header/mobile language menus and selectors to call `useLanguage().changeLanguage(...)` instead of changing i18next directly.
- This keeps UI state, storage, and translations aligned.

4. Fix AI explanation language
- In `useTwoCardTeaching`, send `language: 'fr' | 'en'`, not `"french" | "english"`.
- Keep `response_language: 'French' | 'English'` only for prompt variables.
- Reuse the same language-mapping helper in:
  - `AIResponse.tsx`
  - `ExerciseHistoryPage.tsx`
  - `GuardianResults.tsx`
  - `GuardianExplanations.tsx`
  - `ExerciseRow.tsx`
- Add backend normalization in `supabase/functions/ai-chat/index.ts` so `"French"` / `"french"` also resolves safely to `fr`.

5. Clean up remaining hardcoded English in the affected flow
- Replace visible hardcoded English labels in chat/history/guardian/account screens with translation keys so French actually appears once language state is fixed.

Files likely involved
- `src/context/SimpleLanguageContext.tsx`
- `src/i18n/index.ts`
- `src/context/AuthContext.tsx`
- `src/components/layout/HeaderNavigation.tsx`
- `src/components/layout/MobileLanguageMenuItems.tsx`
- `src/components/ui/language-selector.tsx`
- `src/features/explanations/useTwoCardTeaching.ts`
- `src/components/user/chat/AIResponse.tsx`
- `src/pages/ExerciseHistoryPage.tsx`
- `src/pages/guardian/GuardianResults.tsx`
- `src/pages/guardian/GuardianExplanations.tsx`
- `src/components/guardian/ExerciseRow.tsx`
- `supabase/functions/ai-chat/index.ts`

Expected result
- Logging in as Fanta with France selected will switch the app to French automatically.
- Chat buttons and explanation modal labels will be French.
- AI explanations will be generated in French.
- Voice will read French explanation text instead of English.

QA after implementation
- Log in as Fanta and verify `/chat` is French immediately.
- Open “Show explanation” and confirm the modal title, CTA, and explanation sections are French.
- Refresh and sign in again to confirm persistence.
- Test one guardian/history explanation flow on mobile end to end.
