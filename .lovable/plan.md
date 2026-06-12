## Problem

On `/admin/learning`, when previewing a quiz with a "Compléter l'expression" (`fill-expr`) question, the preview only shows the expression with answers filled in and a small `blank: answer` legend. The "suggested responses" chips that the student would drag into the blanks are missing.

Cause: `src/components/admin/learning/QuizPreviewDialog.tsx` (lines 119–139) has its own custom renderer for `fill-expr` that ignores `question.chips`. The student-facing `FillExprQuestionView` does render them, but it's not used here.

## Fix

Update the `case 'fill-expr':` block in `QuizPreviewDialog.tsx` so the admin preview shows the same layout a student sees, with the answer revealed:

1. Render the template, replacing each `___` with a green pill containing the correct answer for that blank (keep current behavior — answers stay visible since this is the "answers revealed" dialog).
2. **Add a chips row below the expression**, rendered from `question.chips`, styled like the student `FillExprQuestionView` chips (square rounded tiles, neutral background). These are non-interactive in the admin preview — purely a visual representation of what the student will see to drag.
3. Add a small caption above the chips row: `Suggested responses (drag targets):` so admins understand the role of the chips.
4. Keep the existing `blank: answer` badge legend below the chips as an answer key.

No changes to question data, types, or the student-facing component. Scope is purely the admin preview renderer.

## Files

- `src/components/admin/learning/QuizPreviewDialog.tsx` — replace the `fill-expr` case in `AnswerDisplay`.
