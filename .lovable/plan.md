

## Unify OCR Upload Response Format with Chat Response Format

### Problem
When a user types a math exercise in chat (e.g., `23×4=92`), the AI returns a structured JSON response with `isMath`, `sections` (explanation, example, steps), and `isCorrect`. The `AIResponse` component detects this JSON and renders a rich card with color-coded borders, emoji status, and an explanation dialog.

When a photo is uploaded, OCR extracts exercises but the synthetic assistant messages are plain text like `"CORRECT ✅\nYour answer: 92"`. Since `parseAIResponse()` can't find JSON in this text, it falls back to a basic text-only card — no explanation, no step-by-step, no rich formatting.

### Solution
After OCR extracts and grades exercises, **route each exercise through `sendUnifiedMessage`** (the same AI pipeline used for chat-typed exercises) so the response comes back as structured JSON. This way `AIResponse` renders the exact same rich card format for both upload and chat input.

### Changes

| File | Change |
|------|--------|
| `src/utils/chatFileHandlers.ts` | In `handlePhotoUpload`, after OCR extracts exercises, instead of creating plain-text synthetic messages, call `sendUnifiedMessage()` for each exercise (with question + answer as input). Use the AI's structured JSON response as the assistant message content. |

### Detail

In `handlePhotoUpload` (line ~182 onwards), replace the current synthetic message generation:

```typescript
// Current: plain text synthetic messages
assistantContent = `CORRECT ✅\nYour answer: ${exercise.userAnswer}...`;
```

With:

```typescript
// New: route through AI for structured JSON response
import { sendUnifiedMessage } from '@/services/unifiedChatService';

for (const exercise of gradedExercises) {
  const inputText = exercise.userAnswer?.trim()
    ? `${exercise.question} = ${exercise.userAnswer}`
    : exercise.question;
  
  const { data } = await sendUnifiedMessage(inputText, [], selectedModelId, language);
  
  // Use AI's structured JSON as assistant content
  const assistantContent = data?.content || fallbackPlainText;
  // Create user+assistant message pair with this content
}
```

This ensures every OCR exercise gets the same rich JSON response (with `isMath`, `sections`, `isCorrect`) that chat-typed exercises receive.

### Trade-off
- Each uploaded exercise requires one AI call (~1-2s each). For 5 exercises this adds ~5-10s total.
- Could parallelize with `Promise.all` to reduce to ~2-3s.
- The alternative (constructing fake JSON locally) would miss explanations and step-by-step breakdowns.

### Expected result
- Photo upload exercises render identically to chat-typed exercises
- Same color-coded cards, same explanation dialog, same step-by-step format
- Grading + explanation handled by the AI, not by local heuristics

