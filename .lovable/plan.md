## Goal
For every `numeric` question (non-fraction variant), render a tap-to-fill keypad under the input so students can answer without a hardware keyboard. Matches CM1 mobile-first UX.

## Scope
- Student-facing and admin preview both use `QuestionCard.tsx` numeric branch, so a single change covers both.
- Only the `numeric` kind with `answerFormat !== "fraction"` (lines 586–630). The fraction variant already has its own keypad and is untouched.

## Design (follows project tokens)
- Layout: 3×4 grid centered below the existing input, max-width ~240px.
  - Row 1–3: `1 2 3 / 4 5 6 / 7 8 9`
  - Row 4: `± 0 ⌫`
- Chip style: `w-14 h-12 rounded-xl bg-white border border-[#EAECEF] text-[#0F172A] font-bold text-xl shadow-sm active:scale-95 active:bg-[#F2FBF8]`, Poppins.
- `±` toggles sign of current value (no-op when empty / when range.min ≥ 0).
- `⌫` removes last character.
- Digit tap appends digit; if appending would exceed `range.max` or fall below `range.min`, ignore the tap.
- Tap also calls existing `setVal(...)` so `onChange` flows through unchanged. The native `<input>` stays mounted and editable (keyboard typing still works).

## Edits
- File: `src/components/learning/QuestionCard.tsx`
  - Inside the existing `question.kind === "numeric" && answerFormat !== "fraction"` block (around line 586–630), add a `<NumericKeypad value={value} onChange={setVal} range={(question as any).range} />` directly below the range hint.
  - Add a small inline `NumericKeypad` component at the bottom of the same file (kept local to avoid new files). Pure presentational, no new deps.

## Out of scope
- Fraction numeric input (already has keypad).
- Fill-expr chips (separate change).
- Hiding the native input — kept for accessibility and admins.

## Verification
- Open admin Preview on a numeric question → keypad visible, taps fill the box, `⌫` deletes, `±` toggles, out-of-range taps ignored.
- Run a student quiz with a numeric question → same behavior.
- Build passes (no new types).
