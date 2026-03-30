

## Fix: OCR Exercises Not Displayed After Photo Upload

### Problem
OCR successfully extracts 5 exercises and the toast confirms "Graded 5 exercises from your photo!" but nothing appears in the tutor page.

### Root cause
`AIResponse` renders exercise cards by pairing user messages with assistant responses. But:
1. The photo upload creates a user message with `type: 'image'` which is **excluded** from pairing (line 715 of AIResponse.tsx)
2. `addExercises()` stores exercises in `useExercises` hook state, but `AIResponse` does not read from that state -- it only reads from chat messages
3. So the exercises exist in memory but have no visible rendering path

### Fix
In `src/utils/chatFileHandlers.ts`, after OCR extracts exercises, inject each exercise as a synthetic user+assistant message pair into the chat messages. This way `AIResponse` can pick them up and render exercise cards.

Specifically, in the photo upload success branch (where `processingResult.exercises.length > 0`):
- For each graded exercise, create a user message (type='text') with the exercise question
- Create a matching assistant message with the grading result (CORRECT/INCORRECT + explanation)
- Add all these messages to the chat via `setMessages`
- Keep `addExercises()` call for the exercises state (grade tracking)

Also fix: the "Could not grade exercises" false warning. Exercises without student answers (`userAnswer = ""`) should skip grading, not fail it. Update `gradeDocumentExercises` in `src/utils/documentProcessor.ts` to only grade exercises that have a non-empty answer, and leave others as ungraded (no warning).

### Files changed

| File | Change |
|------|--------|
| `src/utils/chatFileHandlers.ts` | After OCR success, inject exercise question/answer pairs as chat messages so AIResponse renders them |
| `src/utils/documentProcessor.ts` | Skip grading for exercises with empty answers; remove false "Could not grade" warning |

### Expected result
- Upload worksheet image
- 5 exercise cards appear in tutor page with math rendering
- Exercises with no student answer show as "needs answer" (no false warning)
- Exercises with answers show grading result

