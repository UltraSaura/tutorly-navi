

## Fraction Input for Numeric Questions

### What changes
Add a `"fraction"` answer format to numeric questions. Admin enters the correct fraction (numerator/denominator). Students see two stacked input boxes styled as a fraction. Evaluation accepts any equivalent fraction (e.g., 2/6 is correct for 1/3).

### Changes

**1. `src/types/quiz-bank.ts`** — Extend `NumericQ`
- Add `answerFormat?: "number" | "fraction"`
- Add `fractionAnswer?: { numerator: number; denominator: number }`

**2. `src/utils/quizEvaluation.ts`** — Fraction evaluation
- If `answerFormat === "fraction"`: extract student's `{ numerator, denominator }`, compare via cross-multiplication (`a*d === b*c`), reject denominator 0
- Otherwise: keep current `Number(answer) === q.answer`

**3. `src/components/learning/QuestionCard.tsx`** — Student fraction UI
- When `kind === "numeric"` and `answerFormat === "fraction"`:
  - Render two vertically stacked number inputs with a horizontal divider line between them (numerator on top, denominator below)
  - Store value as `{ numerator: string, denominator: string }`
- Otherwise: keep current single number input

**4. `src/components/admin/learning/QuestionEditor.tsx`** — Admin UI
- Add answer format toggle (Number / Fraction) inside the numeric section
- When "Fraction" selected: replace the single "Correct Answer" field with two fields (Numerator + Denominator)
- Add state: `answerFormat`, `fractionNumerator`, `fractionDenominator`
- Update `handleSave` to include `answerFormat` and `fractionAnswer` in the saved question
- Update `useEffect` to restore fraction state when editing

