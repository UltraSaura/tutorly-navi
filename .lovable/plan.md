

## Plan: Fix Language Not Applied Across the App

### Problem

The app detects French correctly for user Fanta (country: FR), but multiple parts of the app ignore the detected language and hardcode English:

1. **Explanations always in English**: `useTwoCardTeaching.ts` reads `profile?.response_language` which doesn't exist in the database (no `response_language` column in `users` table), so it defaults to `"English"`. This means both the `language` param and `response_language` context sent to the AI are always English.

2. **Exercise History explanations hardcoded**: `ExerciseHistoryPage.tsx` hardcodes `response_language: 'English'`.

3. **Guardian pages hardcoded**: `GuardianResults.tsx` and `GuardianExplanations.tsx` hardcode `response_language: 'English'`.

4. **Voice reads in English**: The `MathExplanationReader` in `TwoCards.tsx` and `CompactMathStepper` correctly use `useLanguage()`, but since the AI-generated explanation text is in English (due to issue #1), the voice reads English text.

### Root Cause

`useTwoCardTeaching.ts` line 83:
```typescript
const response_language = profile?.response_language ?? "English";
```
There is no `response_language` column — it always falls back to `"English"`.

### Fix

**File 1: `src/features/explanations/useTwoCardTeaching.ts`**
- Import `useLanguage` from SimpleLanguageContext
- Get `language` from the hook inside the component
- Pass it into `openFor` or use it directly instead of `profile?.response_language`
- Since `openFor` is an async function (not a hook), we need to either:
  - Accept `language` as a parameter to `openFor`, or
  - Store the language in a ref that `openFor` reads

Approach: Add `language` parameter to `openFor` signature, and derive `response_language` from it instead of from `profile`.

Change line 83 from:
```typescript
const response_language = profile?.response_language ?? "English";
```
to:
```typescript
const response_language = langOverride === 'fr' ? 'French' : 'English';
```
where `langOverride` is a new parameter.

**File 2: `src/components/user/chat/AIResponse.tsx`** (line 314-317)
- Already passes `language` correctly. Update to pass it as the new parameter.

**File 3: `src/pages/ExerciseHistoryPage.tsx`**
- Import `useLanguage`, use its `language` value instead of hardcoded `'English'`.

**File 4: `src/pages/guardian/GuardianResults.tsx`**
- Same fix: use `useLanguage()` instead of hardcoded `'English'`.

**File 5: `src/pages/guardian/GuardianExplanations.tsx`**
- Same fix.

**File 6: `src/components/guardian/ExerciseRow.tsx`**
- Check if it also hardcodes language and fix.

### What stays the same
- `SimpleLanguageContext` — detection works correctly
- `useSpeechSynthesis` / `MathExplanationReader` — already use correct language
- Edge function `ai-chat` — already handles `response_language` and `language` params correctly
- Prompt templates — already use `{{response_language}}`

