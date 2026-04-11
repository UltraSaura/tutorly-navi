

## Plan: Fix index.ts to Pass Through Tool Calls from DeepSeek

### Problem

When DeepSeek returns a tool calling response (`{ tool_calls: [...], content: null }`), the `index.ts` handler treats it as a plain string. It tries `responseContent.match()` (line 334) which silently fails, then wraps it as `{ content: { tool_calls: [...], content: null } }`. The client-side `useTwoCardTeaching` looks for `data.tool_calls` at the top level, but it's nested under `data.content`, so it falls through to content parsing, finds nothing, and shows "unexpected format."

### Fix

**File: `supabase/functions/ai-chat/index.ts`** (lines ~329-355)

Add a check after the provider call: if `responseContent` is an object with `tool_calls`, return it directly at the top level of the JSON response, bypassing the string-based JSON extraction logic.

```typescript
// After line 329, before the JSON extraction block:
if (responseContent && typeof responseContent === 'object' && responseContent.tool_calls) {
  // Tool calling response — pass through directly
  return new Response(
    JSON.stringify({
      tool_calls: responseContent.tool_calls,
      content: responseContent.content || null,
      modelId,
      modelUsed: modelConfig.model,
      provider: modelConfig.provider,
      isExercise,
      timestamp: new Date().toISOString()
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

This ensures `tool_calls` appears at the top level of the response, which is exactly what `useTwoCardTeaching` expects on line 133: `if (data?.tool_calls?.[0]?.function?.arguments)`.

### Redeploy

After editing, redeploy the `ai-chat` edge function.

### What stays the same
- `deepseek.ts` — already returns correct format
- `useTwoCardTeaching.ts` — already handles `tool_calls` correctly
- `ExplanationModal`, `TwoCards` — untouched
- All other providers — untouched

