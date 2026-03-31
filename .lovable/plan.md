

## Fix: OCR Misreads Handwritten Arithmetic — Add LLM Post-Processing

### Problem
Mistral OCR returned `"23\nX\n6"` for the handwritten image `23 × 4 = 6`. It dropped the "4" entirely and the separator line. The regex-based parser can't reconstruct what was lost at the OCR level — this is fundamentally an OCR quality problem with handwritten math.

### Root cause
The Mistral OCR API (`/v1/ocr`) is a pure text-extraction endpoint with no prompt. It struggles with handwritten arithmetic, especially vertically stacked operations. The regex parser then fails because the input is incomplete.

### Solution: Add an LLM vision pass for handwritten math

Instead of relying solely on the OCR endpoint, add a **Mistral vision (Pixtral) pass** that sends the image to `mistral-large-latest` (or `pixtral-large-latest`) with a chat prompt asking it to extract arithmetic exercises as structured JSON. This LLM can reason about handwritten math far better than raw OCR.

### Flow change

```text
Current:  Image → Mistral OCR → regex parser → exercises
Proposed: Image → Mistral Vision Chat → structured JSON → exercises
                 ↓ (fallback if vision fails)
          Image → Mistral OCR → regex parser → exercises
```

### Changes

| File | Change |
|------|--------|
| `supabase/functions/document-processor/extractors/mistral.ts` | Add `extractWithMistralVision()` — sends image to Mistral chat API with a prompt like "Extract all math exercises from this image. Return JSON array of {question, answer}." |
| `supabase/functions/document-processor/extractors.ts` | Try vision extraction first; fall back to OCR + regex if it fails |
| `supabase/functions/document-processor/extraction/smartMathExtraction.ts` | Add handler for operator-only lines (e.g., "X" without a number) as a secondary parser improvement |

### Technical details

**Mistral Vision call** (`extractWithMistralVision`):
```typescript
const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    model: 'mistral-small-latest',
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: dataUrl } },
        { type: 'text', text: 'Extract all math exercises from this image. For each exercise, identify the math expression/question and the student answer if provided. Return ONLY a JSON array like: [{"question": "23 × 4", "answer": "92"}]. If no answer is visible, set answer to empty string.' }
      ]
    }]
  })
});
```

**Parser improvement** for operator-only lines:
- When line matches `^[xX×*+\-−÷/]$` (operator alone, no number), treat the next numeric line as the second operand and look further for the answer
- This handles degraded OCR like `23\nX\n4\n6` → `23 × 4 = 6`

### Expected result
- Handwritten `23 × 4 = 6` → extracted as question `23 × 4`, answer `6`
- Works for any handwritten arithmetic regardless of OCR formatting issues
- Falls back to current regex pipeline if vision call fails

