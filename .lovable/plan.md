

## Diagnosis: Exercise Not Graded on Android

### What's working
- The prompt **IS available** in Supabase — "Unified Math Chat Assistant" is active with priority 100
- The edge function reads it using `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS)
- Variable substitution has sensible fallbacks for missing user data
- `AIResponse.tsx` correctly parses JSON and reads `isCorrect` from the AI response

### Root cause: DeepSeek JSON reliability

The default model is **DeepSeek Chat** (`deepseek-chat`). The prompt instructs the AI to return structured JSON with `"isCorrect": true/false`. However:

1. **DeepSeek frequently returns non-strict JSON** — it may wrap JSON in markdown fences differently, add conversational text before/after the JSON, or return partially malformed JSON. When `parseAIResponse()` in `AIResponse.tsx` fails to parse, it returns `null` and the card renders as ungraded plain text.

2. **Dual grading detection conflict** — `unifiedChatService.ts` (line 278) uses regex `/\bCORRECT\b/i` to detect grading. When the AI returns JSON containing `"isCorrect": false`, the regex matches the word "CORRECT" inside the key name `isCorrect`, so it always evaluates to `true`. The `INCORRECT` marker is never present in JSON output. This means `data.isCorrect` in `useChat.ts` is unreliable.

3. **Silent failures on Android** — if the edge function errors (API key issue, timeout, model not found), the fallback response has no grading. The user sees a generic message with no grading UI.

### Fix (2 files)

| File | Change |
|------|--------|
| `src/services/unifiedChatService.ts` | Parse `isCorrect` from JSON response instead of regex; add JSON extraction from response content |
| `supabase/functions/ai-chat/index.ts` | Extract JSON fields from AI response content and include them as top-level response fields (`isCorrect`, `isMath`, `sections`) |

### Detail

**1. Edge function — extract structured data from AI response** (`ai-chat/index.ts`, after getting `responseContent`):

Before returning the response, try to parse the AI's text as JSON. If it contains `isCorrect`, `isMath`, or `sections`, include them as top-level fields in the response:

```typescript
let parsedFields: any = {};
try {
  const jsonMatch = responseContent.match(/```json\n([\s\S]*?)\n```/);
  const jsonStr = jsonMatch ? jsonMatch[1] : responseContent;
  const parsed = JSON.parse(jsonStr);
  if (parsed.isCorrect !== undefined) parsedFields.isCorrect = parsed.isCorrect;
  if (parsed.isMath !== undefined) parsedFields.isMath = parsed.isMath;
  if (parsed.sections) parsedFields.sections = parsed.sections;
} catch (e) { /* not JSON, that's fine */ }

return new Response(JSON.stringify({
  content: responseContent,
  ...parsedFields,  // Include structured fields if available
  modelId, modelUsed: modelConfig.model, provider: modelConfig.provider
}));
```

**2. Client service — use structured fields from response** (`unifiedChatService.ts`):

Replace the regex-based detection with the structured fields from the edge function:

```typescript
const response: UnifiedChatResponse = {
  content: data.content,
  isMath: data.isMath ?? !data.content.includes('NOT_MATH'),
  isCorrect: data.isCorrect ?? undefined,  // Use server-parsed value
  needsRetry: data.isCorrect === false,
  hasAnswer: /=\s*[^=]*$/.test(inputMessage),
  confidence: data.content.includes('NOT_MATH') ? 95 : 85,
  sections: data.sections ?? undefined
};
```

### Expected result
- AI returns JSON with `isCorrect` — edge function extracts it and passes it through
- Client uses the parsed boolean directly instead of unreliable regex
- Grading displays correctly on Android and all platforms
- Falls back gracefully if AI doesn't return JSON

