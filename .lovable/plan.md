

## Plan: Clean Up Hybrid Grading — Ensure No AI at Grade Time, No Answer Leaks

### Current State

The hybrid local-first flow **exists** but has leftover issues from the old AI-grading path:

1. **AI fallback in `evaluateHomework()` still generates explanations eagerly** — when local grading fails and AI is used, it immediately fetches a full explanation (lines 187-250). This should be lazy like the local path.
2. **AI fallback reveals correct answers** in the explanation text (e.g. "The correct answer is X").
3. **`generateEnhancedMathGuidance()` reveals correct answers** — the fallback guidance function literally says "The correct answer is ${correctAnswer}".
4. **Missing state fields** on AI-graded exercises (`gradingMethod`, `explanationLoading`, `explanationRequested`, `correctAnswer`).

The local grading path (arithmetic, geometry, algebra) works correctly — it returns `explanation: undefined` and sets `gradingMethod: 'local'`. The issue is the AI fallback path doesn't follow the same pattern.

### Changes

**File 1: `src/services/homeworkGrading.ts`**

Refactor the AI fallback path (everything after line 72) to match the local grading pattern:

- After getting `CORRECT`/`INCORRECT` from AI, return immediately with `explanation: undefined` (lazy)
- Set `gradingMethod: 'ai'`, `explanationLoading: false`, `explanationRequested: false`
- Remove all inline explanation generation (the `guidancePrompt` section, lines 187-250)
- Remove the `generateEnhancedMathGuidance` function entirely (it leaks answers)
- Remove inline success/failure messages that contain answers
- Keep the AI grading call (just CORRECT/INCORRECT), but strip all explanation fetching from this function
- For error/invalid responses, return `isCorrect: false, explanation: undefined` — don't generate guidance inline

**File 2: `src/services/explanationService.ts`**

No changes needed — already works correctly as the lazy explanation loader.

**File 3: `src/components/user/chat/Exercise.tsx`**

Already correct — shows "Show explanation" button that triggers `onFetchExplanation`. The `formattedExplanation` regex on line 72 strips `correct answer:` patterns, which is good as a safety net. No changes needed.

**File 4: `src/hooks/useExercises.ts`**

Already correct — `fetchExplanation` method works with the lazy loading pattern. No changes needed.

### Summary of what changes

| File | What |
|------|------|
| `src/services/homeworkGrading.ts` | Remove eager explanation generation from AI fallback; make it return the same lazy structure as local grading; delete `generateEnhancedMathGuidance` |

### What stays the same
- Local grading engine (`localMathGrader.ts`, `geometryGrader.ts`) — already working
- `explanationService.ts` — already the lazy loader
- `Exercise.tsx` UI — already shows minimal result + "Show explanation" button
- `ChatInterface.tsx` — already intercepts local-graded exercises
- `useExercises.ts` — already has `fetchExplanation` method

### Result
After this change, **both** local and AI grading paths will:
- Return only `isCorrect` + grade immediately
- Set `explanation: undefined`
- Never reveal the correct answer in the initial result
- Load explanation lazily via `explanationService.ts` on button click

