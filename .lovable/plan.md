

## Plan: Hybrid Local Grading with Lazy AI Explanations

### Summary

Refactor the grading flow into two phases: (1) instant local grading for arithmetic and basic geometry — no AI call, (2) on-demand AI explanation only when the user clicks "Show explanation". The correct answer is never shown in the result card.

### Current State

- `evaluateHomework()` in `src/services/homeworkGrading.ts` calls AI (via `ai-chat` edge function) for **every** grading request, even simple `2+3`
- `areMathematicallyEquivalent()` in `src/utils/mathValidation.ts` already solves arithmetic, fractions, equations, powers, roots locally — but it's only used as a fallback/override, not as the primary grader
- The `Exercise.tsx` component shows explanation inline after grading and has a "Show explanation" dialog button
- Explanation is generated during grading (same AI call or second AI call), not lazily

### Architecture

```text
submitAnswer()
  └─> evaluateHomework()
        ├─ Phase 1: localGrade(question, answer)
        │    ├─ arithmetic (+, -, ×, ÷, decimals, fractions, %)
        │    ├─ powers / roots
        │    ├─ simple algebra (2x + 3x)
        │    ├─ simple equations (2x + 4 = 10)
        │    └─ basic geometry (area, perimeter, angles, formulas)
        │    Returns: { isCorrect, correctAnswer (hidden), confidence, method: "local" }
        │
        ├─ If confidence HIGH → return immediately, no AI
        └─ If confidence LOW or unsupported → fall back to AI grading (existing flow)

User clicks "Show explanation"
  └─> fetchExplanation(exercise, correctAnswer)
        └─ Call AI edge function with exercise + student answer + hidden correct answer
        └─ Cache result on exercise state
```

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/services/localMathGrader.ts` | **Create** | Local grading engine: arithmetic, algebra, equations, geometry |
| `src/services/geometryGrader.ts` | **Create** | Geometry formula solver (rectangle, triangle, circle area/perimeter/angles) |
| `src/services/explanationService.ts` | **Create** | Lazy AI explanation fetcher with caching |
| `src/services/homeworkGrading.ts` | **Modify** | Try local grading first; skip AI if confident; don't generate explanation during grading |
| `src/types/chat.ts` | **Modify** | Add `gradingMethod`, `explanationLoading`, `correctAnswer` (internal) fields to Exercise |
| `src/components/user/chat/Exercise.tsx` | **Modify** | Minimal result card (correct/incorrect + grade + "Show explanation" button); lazy-load explanation on click |
| `src/hooks/useExercises.ts` | **Modify** | Add `fetchExplanation` function for on-demand explanation loading |

### Detailed Changes

**1. `src/services/localMathGrader.ts`** (new)

- Export `localGrade(question: string, userAnswer: string): LocalGradeResult | null`
- Reuse and extend the logic already in `mathValidation.ts` (`extractCorrectAnswer`, `areMathematicallyEquivalent`)
- Add pattern matching for:
  - Percentage calculations (e.g. "20% of 50")
  - Power/root expressions (already partially in mathValidation)
  - Simple algebra combining like terms
  - Simple linear equations
- Return `{ isCorrect: boolean, correctAnswer: number | string, confidence: "high" | "low", method: "local" }` or `null` if unsupported
- Tolerance: accept answers within 0.01 for decimals, accept π approximations (3.14, 3.1416) within 0.01

**2. `src/services/geometryGrader.ts`** (new)

- Detect geometry keywords in question (area, perimeter, circumference, angle, rectangle, triangle, circle, square)
- Extract dimensions from question text using regex
- Formulas:
  - Rectangle: A = l × w, P = 2(l + w)
  - Square: A = s², P = 4s
  - Triangle: A = (b × h) / 2, angle sum = 180°, P = a + b + c
  - Circle: A = πr², C = 2πr
- Unit normalization (strip "cm", "m", "cm²" from answer for comparison)
- Accept π approximations within tolerance
- Export `gradeGeometry(question: string, userAnswer: string): LocalGradeResult | null`

**3. `src/services/explanationService.ts`** (new)

- Export `fetchExplanation(exercise, language, modelId): Promise<string>`
- Calls `ai-chat` edge function with tutoring prompt including the hidden correct answer
- Returns step-by-step explanation
- Caching: store explanation on exercise object so repeated clicks don't re-call AI

**4. `src/services/homeworkGrading.ts`** (modify)

- At the top of `evaluateHomework()`, call `localGrade()` then `gradeGeometry()`
- If either returns a high-confidence result:
  - Set `isCorrect` from local result
  - Set `explanation = undefined` (not generated yet)
  - Set `gradingMethod = "local"`
  - Store `correctAnswer` internally on exercise (not displayed)
  - Return immediately — **no AI call**
- If local grading returns null or low confidence, proceed with existing AI grading flow
- Remove explanation generation from the grading step for locally-graded exercises

**5. `src/types/chat.ts`** (modify)

Add to `Exercise` interface:
```typescript
gradingMethod?: "local" | "ai";
explanationLoading?: boolean;
explanationRequested?: boolean;
correctAnswer?: string; // internal, never displayed directly
```

**6. `src/components/user/chat/Exercise.tsx`** (modify)

- After grading, show only: checkmark/X icon + grade badge + "Show explanation" button
- Remove inline explanation display from the main card view
- "Show explanation" dialog button:
  - On click: if no cached explanation, call `fetchExplanation`, show loading spinner
  - Once loaded, display in dialog (existing dialog structure)
  - Cache so subsequent clicks are instant
- Never display `correctAnswer` field in UI

**7. `src/hooks/useExercises.ts`** (modify)

- Add `fetchExplanation(exerciseId)` function that:
  - Sets `explanationLoading = true` on the exercise
  - Calls `explanationService.fetchExplanation()`
  - Updates exercise with the returned explanation
  - Sets `explanationLoading = false`, `explanationRequested = true`
- Expose `fetchExplanation` in the return object

### What stays the same

- All existing `mathValidation.ts` utilities (reused by localMathGrader)
- The AI edge function (`ai-chat`) — still used for explanations and fallback grading
- Guardian result cards and explanation views
- Exercise history saving
- Grade calculation logic
- The "Show explanation" dialog UI structure (just made lazy)

