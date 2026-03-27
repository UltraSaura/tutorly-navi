

## Drag-and-Drop Number Chips for Fraction Answers

### What it does
Instead of typing numbers into the fraction boxes, the student sees a set of **draggable number chips** (e.g., 1, 2, 3, 4, 5, 6) and two empty drop zones (numerator / denominator). They drag a number into each zone to form their answer. The correct numbers are always included among the choices, mixed with distractors.

### How number suggestions are generated
The app auto-generates the chip options based on the admin's correct fraction answer:
- Always include the correct numerator and denominator
- Add 4-6 distractor numbers (multiples, nearby integers, common wrong answers)
- Example: correct = 2/5 → chips might be: **1, 2, 3, 4, 5, 10** (shuffled)
- Store these as `dragOptions?: number[]` on `NumericQ` so admins can optionally customize them

### Admin side (`QuestionEditor.tsx`)
- Auto-generate suggested drag options when the admin sets the fraction (numerator/denominator)
- Show the generated chips as editable tags — admin can add/remove numbers
- Algorithm: include correct numerator, correct denominator, ±1 of each, one multiple of each, and a random small number — deduplicated and shuffled

### Student side (`QuestionCard.tsx`)
- Replace the two `<input>` fields with two **drop zones** (numerator box / denominator box) separated by a fraction line
- Below, show a row of **draggable number chips**
- Use HTML5 drag-and-drop (onDragStart/onDrop) — no external library needed
- Also support **tap-to-select**: tap a chip, then tap a zone to place it (mobile-friendly)
- A chip placed in a zone is visually dimmed in the chip row; dropping a new chip replaces the old one
- Value stored as `{ numerator: string, denominator: string }` (same format, no evaluation changes needed)

### Type change (`quiz-bank.ts`)
- Add `dragOptions?: number[]` to `NumericQ` — the set of number chips to display

### Evaluation (`quizEvaluation.ts`)
- No changes — already uses cross-multiplication equivalence

### Changes summary

| File | Change |
|------|--------|
| `src/types/quiz-bank.ts` | Add `dragOptions?: number[]` to `NumericQ` |
| `src/components/admin/learning/QuestionEditor.tsx` | Auto-generate drag options from fraction; show editable chip list |
| `src/components/learning/QuestionCard.tsx` | Replace fraction `<input>`s with drag-and-drop zones + number chips |

