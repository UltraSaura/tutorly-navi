

## Plan: Show Exercise Card After Local Grading

### Problem
When local grading succeeds, the code adds a user message to chat but skips the AI call — meaning no assistant message is created. The `AIResponse` component requires user+assistant message **pairs** to render exercise cards. No pair = nothing displayed.

The toast ("Incorrect. Tap 'Explanation' to understand.") fires correctly, but the exercise card never appears.

### Fix

**1 file modified**: `src/components/user/ChatInterface.tsx`

After local grading succeeds, create a synthetic assistant message with a minimal grading result (matching the format `AIResponse` expects — `CORRECT` or `INCORRECT` prefix) and add it to the chat via `addMessage`. This gives `AIResponse` the pair it needs to render the exercise card.

Change in `handleSendMessageWithGrading`:

```typescript
if (result.localGraded) {
  // Add user message
  addMessage({
    id: Date.now().toString(),
    role: 'user',
    content: messageToSend,
    timestamp: new Date(),
  });
  
  // ADD THIS: synthetic assistant message so AIResponse renders the card
  const isCorrect = result.isCorrect;
  const grade = isCorrect ? '10/10' : '0/10';
  addMessage({
    id: (Date.now() + 1).toString(),
    role: 'assistant',
    content: isCorrect ? `CORRECT\n${grade}` : `INCORRECT\n${grade}`,
    timestamp: new Date(),
  });
  
  setInputMessage('');
  return;
}
```

Also need `processHomeworkFromChat` to return `isCorrect` alongside `localGraded`.

**1 file modified**: `src/hooks/useExercises.ts`

Update the return type of `processHomeworkFromChat` to include `isCorrect: boolean` so ChatInterface can build the synthetic message.

### What stays the same
- All local grading logic (localMathGrader, geometryGrader)
- AIResponse rendering logic (already handles CORRECT/INCORRECT prefixes)
- Explanation lazy-loading flow
- Exercise.tsx component

