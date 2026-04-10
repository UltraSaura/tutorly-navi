

## Plan: Restore Multi-Card Explanation (TwoCards + ExplanationModal) in Chat

### Problem

The recent wiring of lazy explanation loading in `AIResponse.tsx` uses `explanationService.ts`, which returns **plain text** from the AI. This is then rendered as a simple text block in a Dialog. The original explanation flow uses `useTwoCardTeaching` which returns **structured sections** (concept, method, example, pitfall, check, etc.) and renders them via the `TwoCards` component inside `ExplanationModal` — with proper multi-card layout, animations, and interactive math steppers for young students.

### Fix

**File: `src/components/user/chat/AIResponse.tsx`**

1. Replace `explanationService.ts` import with `useTwoCardTeaching` and `ExplanationModal` imports
2. In the `ExerciseCard` component, replace the local `explanationText`/`explanationLoading` state and `handleShowExplanation` with a call to `useTwoCardTeaching().openFor()`
3. Replace the inline `Dialog` with `ExplanationModal` — which already handles loading, error, and renders `TwoCards` with all the multi-card sections
4. The "Show explanation" button should call `teaching.openFor({ prompt: question, userAnswer: answer, subject: 'math' }, { response_language: language === 'fr' ? 'French' : 'English', grade_level: 'High School' })`
5. Render `<ExplanationModal>` with the teaching hook's state (`open`, `loading`, `sections`, `error`)
6. Remove the `fetchExplanation` import from `explanationService.ts` (no longer needed here)
7. Apply to both the JSON-parsed exercise card path and the fallback path

### What this restores
- Multi-card layout: Exercise, Concept, Method, Example, Pitfall, Check yourself
- Guardian view with Parent Help Hint + Current Exercise Solution
- Interactive math stepper for young students
- "Watch Video" lesson link when topic data is available
- Explanation caching to `exercise_explanations_cache` table

### What stays the same
- Local grading logic — untouched
- `ChatInterface.tsx` — untouched
- `useTwoCardTeaching.ts`, `TwoCards.tsx`, `ExplanationModal.tsx` — already work correctly, just need to be connected

