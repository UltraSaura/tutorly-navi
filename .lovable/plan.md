

## Fix: Strip Markdown Table Pipes from OCR Text

### Problem
Mistral OCR returns vertical multiplication as markdown tables with `|` pipe characters. The parser can't match any patterns because pipes aren't stripped.

### Fix
Add one normalization step at the top of `extractSmartMathExercises()` in `smartMathExtraction.ts`, right after the opening log line (before any extraction):

```typescript
// Strip markdown table pipes: "| 58 |" → "58"
text = text.split('\n')
  .map(l => l.replace(/^\|+\s*|\s*\|+$/g, '').replace(/\|/g, ' ').trim())
  .join('\n');
console.log(`Normalized text (pipes stripped):\n${text}`);
```

This converts:
```
| 58 |
| --- |
| × 32 |
| 16 |
```
into:
```
58
---
× 32
16
```

Which the existing vertical arithmetic parser already handles.

### Files changed

| File | Change |
|------|--------|
| `supabase/functions/document-processor/extraction/smartMathExtraction.ts` | Add pipe-stripping at start of `extractSmartMathExercises()` |

Then redeploy `document-processor` edge function.

