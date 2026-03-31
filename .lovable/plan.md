

## Fix: OCR Misparses Vertical Arithmetic

### Problem
The user wrote `23 × 4 = 6` (vertically on paper). Mistral OCR returned:
```
23
× 2
4
---
6
```

Two issues:
1. **OCR misread**: Mistral read "× 2" instead of "× 4" — this is an OCR accuracy issue we can't fix directly, but we can mitigate
2. **Parser bug**: The vertical arithmetic parser sees `23`, `× 2`, then `4` (a bare number) and treats it as the answer, producing `23 × 2 = 4`. It never reaches the separator `---` and `6`. The parser should recognize that when a number is followed by a separator line + another number, the last number is the real answer.

### Root cause detail
In `extractVerticalArithmetic()` (line 248-253 of `smartMathExtraction.ts`), after finding `num1` and `op num2`, it checks if `lines[i+2]` is a number. If yes, it takes it as the answer immediately. But in this case, `4` was an OCR artifact (part of the expression), and the real answer `6` was after the separator `---`.

### Fix

**File: `supabase/functions/document-processor/extraction/smartMathExtraction.ts`**

1. **Improve vertical arithmetic parser** — When the line after `op num2` is a bare number, look ahead further: if the next lines contain a separator + number, prefer that as the answer structure. This handles cases where OCR splits digits across lines.

2. **Add inline arithmetic as a parallel check** — Before vertical parsing, also try inline patterns on the raw text (e.g., `23 × 4 = 6` on a single reconstructed line). This provides a cross-check.

3. **Add a "reconstruct single-line" pass** — Join all non-separator lines into a single string and try inline arithmetic extraction on it. For the OCR output `23\n× 2\n4\n---\n6`, joining non-separators gives `23 × 2 4 6` which doesn't help much, but for cleaner OCR output it would catch inline expressions.

**Concrete parser fix** (primary):
```
// After finding num1 and op+num2:
// Check if lines[i+2] is a number AND lines[i+3] is a separator AND lines[i+4] is a number
// If so, the "bare number" at i+2 might be OCR noise — skip it and use i+4 as answer
// Otherwise, check if lines[i+2] is a separator → use lines[i+3] as answer  
// Otherwise, if lines[i+2] is a number, use it as answer (current behavior)
```

Specifically:
- At `nextIdx = i+2`: if line is a number, peek ahead — if `lines[nextIdx+1]` is a separator and `lines[nextIdx+2]` is a number, then the real answer is `lines[nextIdx+2]` and advance `i` past it
- If no separator follows, use the bare number as answer (current behavior)

4. **Add Mistral OCR prompt hint** — Modify the Mistral API call to include a `prompt` or system instruction asking it to preserve arithmetic expressions as inline text (e.g., `"23 × 4 = 6"`) rather than splitting into vertical lines. The Mistral OCR API might not support a prompt, but we should check if adding a structured output hint helps.

### Files changed

| File | Change |
|------|--------|
| `supabase/functions/document-processor/extraction/smartMathExtraction.ts` | Fix vertical parser look-ahead logic; add inline-first attempt on joined lines |

### Expected result
- OCR output with mixed vertical/inline formatting is parsed more accurately
- When separator + answer exists after a stray number, the parser uses the correct answer
- Redeploy edge function after change

