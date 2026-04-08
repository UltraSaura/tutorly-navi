

## Plan: Skip AI Chat Call When Local Grading Succeeds

### Problem
Local grading IS implemented and works, but the user doesn't see the instant result because `handleSendMessageWithGrading` in `ChatInterface.tsx` **always** calls `handleSendMessage` (AI chat), which takes 20-30 seconds. The loading spinner stays active the entire time, making it feel like grading is slow.

The flow currently:
1. `handleSendMessage` → AI chat call (24s, keeps `isLoading=true`)
2. `processHomeworkFromChat` → `evaluateHomework` → `localGrade` (instant)

Both run, but the user waits for the slow AI chat response.

### Fix

**1 file modified**: `src/components/user/ChatInterface.tsx`

Refactor `handleSendMessageWithGrading` to:
1. First, check if the message looks like a math exercise (contains `=` with a question and answer)
2. If so, try `processHomeworkFromChat` first
3. If local grading succeeds (exercise graded with method `"local"`), **skip** the AI chat call entirely — no `handleSendMessage`
4. If local grading fails or the message isn't a math exercise, proceed with the normal AI chat flow

**1 file modified**: `src/hooks/useExercises.ts`

Make `processHomeworkFromChat` return a result indicating whether local grading succeeded, so `ChatInterface` can decide whether to skip the AI call.

### Technical detail

```text
handleSendMessageWithGrading(message)
  ├─ Is it a math exercise? (contains "=" with digits)
  │   ├─ YES → processHomeworkFromChat(message)
  │   │         ├─ localGrade succeeded? → Show result instantly, SKIP AI chat
  │   │         └─ localGrade failed? → Fall through to handleSendMessage (AI)
  │   └─ NO → handleSendMessage (AI chat as usual)
```

### What stays the same
- All local grading logic (localMathGrader, geometryGrader)
- AI fallback grading in evaluateHomework
- The explanation lazy-loading flow
- All other chat functionality (questions, file uploads, etc.)

