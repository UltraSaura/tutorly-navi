

## Fix: OCR Exercises Show Empty Answer Field Despite Being Graded

### Problem
When OCR extracts exercises that already have student answers (e.g., exercises a and b), the app grades them correctly but still shows an empty input field asking for a response. The grading status (correct/incorrect styling, emoji) appears, but the actual answer text is missing.

### Root cause
In `chatFileHandlers.ts` line 186, the synthetic user message only contains `exercise.question`:
```ts
content: exercise.question,
```

The `ExerciseCard` component uses `parseUserMessage(userMessage.content)` to extract `question`, `answer`, and `hasAnswer`. Since the user message has no answer embedded, `hasAnswer` is always `false`, so it renders the input field instead of displaying the submitted answer.

The student's answer only exists in the assistant message text (`Your answer: 30/63`), but the card never reads it from there.

### Fix

**`src/utils/chatFileHandlers.ts`** — Include the student answer in the synthetic user message content when the exercise has one:

```ts
// Line ~186: Change from
content: exercise.question,
// To
content: exercise.userAnswer?.trim()
  ? `${exercise.question}\nAnswer: ${exercise.userAnswer}`
  : exercise.question,
```

This way `parseUserMessage` will detect the answer pattern and set `hasAnswer: true`, causing the card to display the answer badge instead of an empty input field.

### Files changed

| File | Change |
|------|--------|
| `src/utils/chatFileHandlers.ts` | Include `userAnswer` in synthetic user message content for OCR exercises that have answers |

Single-line change. No other files affected.

