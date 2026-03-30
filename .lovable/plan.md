

## Fix: Exercise Graded Incorrect Despite No Answer

### Root cause
`AIResponse.tsx` pairs user and assistant messages by **global array index** (line 719: `aiMessages[index]`). When there are any other messages in the chat (welcome message, previous conversations, the photo upload message), the OCR exercise pairs get **misaligned** — exercise 1's question gets paired with a wrong assistant response (possibly one containing "INCORRECT" from a previous interaction), making it look incorrectly graded.

### Fix

**`src/components/user/chat/AIResponse.tsx`** — Replace index-based pairing with **adjacency-based pairing**. Instead of separating all user and assistant messages into two arrays and matching by index, iterate through messages sequentially and pair each user message with the immediately following assistant message. This guarantees OCR synthetic message pairs stay together regardless of other messages in the chat.

```text
Current (broken):
  userMessages = messages.filter(user + not image)
  aiMessages = messages.filter(assistant)
  pairs[i] = (userMessages[i], aiMessages[i])  ← offset breaks everything

Fixed:
  for each message:
    if user (not image/file) → save as pendingUser
    if assistant (not welcome) and pendingUser exists → create pair, clear pendingUser
```

### Also fix: Exercises with no answer should explicitly show neutral status

**`src/utils/chatFileHandlers.ts`** — For exercises with empty `userAnswer`, prefix the synthetic assistant message with `UNANSWERED` instead of plain text, so `AIResponse` can explicitly detect and render a neutral "awaiting answer" card style (not accidentally matching any grading keywords).

**`src/components/user/chat/AIResponse.tsx`** — Add `UNANSWERED` detection in `getStatusStyles` to return a distinct neutral/blue style, ensuring these cards never accidentally show as correct or incorrect.

### Files changed

| File | Change |
|------|--------|
| `src/components/user/chat/AIResponse.tsx` | Replace index-based pairing with adjacency-based pairing; add UNANSWERED status style |
| `src/utils/chatFileHandlers.ts` | Prefix empty-answer exercise messages with `UNANSWERED` keyword |

### Expected result
- Exercises without student answers show a neutral "awaiting answer" card
- Exercises with answers show correct/incorrect based on grading
- No misalignment regardless of other messages in the chat

