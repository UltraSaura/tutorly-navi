

## Plan: Fix Explanation Failing with DeepSeek Provider

### Problem

When the user clicks "Show explanation", `useTwoCardTeaching` calls the `ai-chat` edge function with `requestExplanation: true`. This flag enables **tool calling** (structured JSON output) — but only for the **OpenAI provider**. The DeepSeek provider ignores `requestExplanation` entirely: it doesn't receive the parameter, doesn't add tool definitions, and returns plain text. The client then fails to parse the plain text as JSON, resulting in "The AI returned an unexpected format."

### Root Cause

- `callOpenAI()` accepts `requestExplanation` and adds tool calling when true
- `callDeepSeek()` does NOT accept `requestExplanation` — its signature only has `(systemMessage, history, userMessage, model, isExercise, maxTokens)`
- The `index.ts` switch statement doesn't pass `requestExplanation` to DeepSeek (or any non-OpenAI provider)
- DeepSeek's API supports tool calling (OpenAI-compatible), so we can add the same logic

### Changes

**File 1: `supabase/functions/ai-chat/providers/deepseek.ts`**

Add `requestExplanation` parameter (same as OpenAI). When true, add the same `tools` and `tool_choice` to the request body. Parse tool call response when present, otherwise return content as before.

**File 2: `supabase/functions/ai-chat/index.ts`**

Pass `requestExplanation` to `callDeepSeek()` in the switch statement (line ~296-303), matching how it's passed to `callOpenAI()`.

**File 3 (optional): Other providers (Anthropic, Google, Mistral, xAI)**

Same pattern — add `requestExplanation` support. But since DeepSeek is the active provider, we prioritize it. For other providers that don't support tool calling, we can add a JSON instruction to the system prompt as fallback.

### Technical Detail

DeepSeek's API is OpenAI-compatible and supports tool calling. The implementation mirrors `openai.ts`:

```typescript
// deepseek.ts - add requestExplanation param
export async function callDeepSeek(
  systemMessage, history, userMessage, model,
  isExercise, requestExplanation, maxTokens  // add requestExplanation
) {
  // ... existing code ...
  const requestBody = { model, messages, temperature: 0.7, max_tokens: maxTokens };
  
  if (requestExplanation) {
    requestBody.tools = [/* same tool definition as openai.ts */];
    requestBody.tool_choice = { type: "function", function: { name: "generate_math_explanation" }};
  }
  
  // ... fetch ...
  
  // Handle tool call response
  if (requestExplanation && data.choices?.[0]?.message?.tool_calls) {
    return { tool_calls: data.choices[0].message.tool_calls, content: null };
  }
  return data.choices[0].message.content;
}
```

In `index.ts`, update the DeepSeek case:
```typescript
case 'DeepSeek':
  responseContent = await callDeepSeek(
    formattedSystemMessage, formattedHistory, message,
    modelConfig.model, isExercise, requestExplanation, maxTokens  // add requestExplanation
  );
  break;
```

### What stays the same
- `useTwoCardTeaching.ts` — already handles both `tool_calls` and `content` parsing
- `ExplanationModal`, `TwoCards` — untouched
- OpenAI provider — untouched
- Local grading logic — untouched

