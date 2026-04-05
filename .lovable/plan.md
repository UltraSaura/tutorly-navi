
## Fix: Constant Page Reloading from Language Context

### Root Cause

The `useLanguage()` hook (lines 459-482) has `console.log` calls that fire on **every single render** of **every component** that uses translations. The console logs show dozens of `[Translation] useLanguage hook called` and `[Translation] Context available` entries per second. This isn't the reload itself, but it's a symptom of excessive re-renders.

The actual reload comes from two places:

1. **`language-select.tsx` and `language-selector.tsx`** both call `setTimeout(() => window.location.reload(), 100)` when the language changes. If anything triggers a language change (like auto-detection on line 362-434), it reloads the page, which re-triggers auto-detection, creating a loop.

2. **Line 98**: `console.log('[Translation] SimpleLanguageProvider render, ...)` fires on every provider render, contributing to performance degradation.

3. **Line 408**: `getLanguageFromDetection()` is in the effect body but not in deps — however `detection.country` changing can still trigger the effect and call `setLanguage`, which re-renders the provider, which may interact with the reload cycle.

### Fix

**1. `src/context/SimpleLanguageContext.tsx`** — Remove noisy logs and prevent reload loops:
- Remove `console.log` at line 98 (fires every render)
- Remove `console.log` at lines 461, 480 in `useLanguage()` (fires hundreds of times)
- Remove debug logs in `t()` function (lines 341-348)

**2. `src/components/ui/language-select.tsx`** — Remove `window.location.reload()`. The context already handles language switching reactively via state; a full page reload is unnecessary and causes the loop.

**3. `src/components/ui/language-selector.tsx`** — Same: remove `window.location.reload()`.

### Files changed

| File | Change |
|------|--------|
| `src/context/SimpleLanguageContext.tsx` | Remove excessive console.logs from useLanguage hook, provider render, and t() function |
| `src/components/ui/language-select.tsx` | Remove `setTimeout(() => window.location.reload(), 100)` |
| `src/components/ui/language-selector.tsx` | Remove `setTimeout(() => window.location.reload(), 100)` |

### Expected result
- No more page reloads when language is set or auto-detected
- Console no longer flooded with translation logs
- Language switching still works reactively through React state

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
