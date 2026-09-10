# Application languages

The app supports English (`en`) and French (`fr`). `src/i18n/index.ts` owns the active language and persists it under `localStorage.lang`. `SimpleLanguageProvider` exposes the existing API, updates the document language, and protects manual selection from country/profile detection. The older context imports adapt to this same provider.

`src/i18n/resources.ts` combines the historical catalogs so React i18next and `useLanguage().t()` resolve the same messages. Legacy exercise aliases and single-brace parameters remain supported.

For interface copy, use `useInterfaceTranslation()` and add matching entries to both `src/locales/en/interface.json` and `src/locales/fr/interface.json`. Keep complete sentences together. Use interpolation and `_one` / `_other` entries for counts. Call translation functions while rendering; do not store translated text in identifiers, route slugs, state enums, query keys, or answer values. Include the translator in memo dependencies when deriving translated display data.

Use `useLocale()` for date/number formatting and `useSubjectLabel()` for known subject display names. Pass the selected language to curriculum label lookup. Keep the original country and curriculum identifiers independent of the interface language.

## Authored content

Interface translations do not translate arbitrary stored lesson prose, uploaded exercises, official exam papers, or video audio. Existing quiz and video selection requests already include the selected language. Material with only one authored language needs an additional translated content version; preserve its source text rather than changing answers or silently inventing a translation.

## Verification

- `npm test -- --run src`: application tests, including language switching, catalog coverage, interpolation, plurals, and state-identifier protection.
- `npm run build`: production compilation.

The repository also has pre-existing full TypeScript errors in `FillExprQuestion`, `QuestionCard`, `CompactMathStepper`, and `columnFillBuilder`, and failures in the separate exam-import test suite. They are independent of interface localization.
