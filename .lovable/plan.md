# Numeric Question — Drag‑and‑Drop Suggestion Chips

Currently, the `numeric` (non‑fraction) question only shows a "Tape ta réponse" input box. We will add a row of **suggestion chips below the input**, including the correct answer plus a few distractors, that the student can drag into (or tap) the answer box — matching the pattern already used by the fraction quiz (second screenshot).

## Behavior

- Chips appear **below** the answer box, in the same visual style as fraction chips (`w-12 h-12 rounded-xl`, neutral bg, Poppins, primary teal active state).
- **4 chips total**: the correct answer + 3 random distractors, shuffled.
- Distractors are deterministic per question (seeded by `question.id`) so the order is stable across re‑renders and previews.
- **Drag and drop**: chip → answer box fills the input (HTML5 drag, same `dataTransfer text/plain` approach as `FillExprQuestion`).
- **Tap**: tapping a chip fills the input with that value; tapping again clears it.
- Used chip shows the dimmed/used state (same styling as fraction chips).
- Caption below: `Glisse un nombre, ou tapote pour le placer.`
- Keyboard typing into the input still works as today (chips are an aid, not a restriction).

## Source of chips

- If the question payload already has `dragOptions: number[]` (existing optional field on `NumericQ`), use it as‑is (shuffled).
- Otherwise auto‑generate 3 distractors around the correct `answer`:
  - Integers: pick `answer ± 1, ± 2, ± 3` (clamped to `range.min/max` when present), drop duplicates, pick 3.
  - If `range` exists and is small (≤10 span), pick from the range excluding the answer.
  - Always include the correct answer; shuffle deterministically by `question.id`.

## Scope (files)

- `src/components/learning/QuestionCard.tsx` — extend the existing `numeric && answerFormat !== "fraction"` block (lines ~586–630) to render a chip row beneath the input, with drag/drop + tap handlers wired to `setVal`.
- Small helper for deterministic distractor generation, colocated in the same file (or `src/lib/quiz/numericSuggestions.ts` if you prefer a dedicated util — flag your preference).

No changes to types (`dragOptions` already exists), DB, admin builder, or grading logic.

## Out of scope

- Fraction numeric variant (already has its own chips).
- Admin UI for manually editing `dragOptions` (can be a follow‑up).
- Changing answer validation — typed and dropped values are both written to the same `value` state.

## Open question

Do you want the admin to be able to **define** the distractor chips per question (edit `dragOptions` in the admin builder), or is auto‑generation enough for now? Default in this plan: auto‑generate, ignore `dragOptions` editing UI for now.
