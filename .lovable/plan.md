

## Plan: Localize Division Explanation Text to User's Language

### Problem
The division explanation strings in `CompactMathStepper.tsx` are hardcoded in French (e.g. "On commence par prendre...", "La division est terminée !"). They should use the user's selected language.

### Fix

**1 file modified**: `src/components/math/CompactMathStepper.tsx`

1. **Import** `useLanguage` from `@/context/SimpleLanguageContext` (or whichever context the app uses)
2. **Read** the current language inside the component: `const { language } = useLanguage();`
3. **Create a translation map** for the ~8 explanation templates, keyed by language (`en`/`fr`):

```typescript
const divTexts = language === 'fr' ? {
  startFirst: (partial, divisor) => `On commence par prendre ${partial}...`,
  startNext: (partial, divisor) => `On obtient ${partial} comme nouveau dividende partiel...`,
  writeQuotient: (divisor, qDigit, product, partial) => `${divisor} × ${qDigit} = ${product}...`,
  writeProduct: (product, partial, rem) => `On écrit ${product} sous ${partial}...`,
  writeRemainder: (partial, product, rem, hasMore) => `${partial} − ${product} = ${rem}...`,
  bringDown: (nextDigit, rem, newPartial) => `On descend le ${nextDigit}...`,
  completeWithRem: (div, dsr, q, r) => `La division est terminée ! ...reste ${r}.`,
  completeExact: (div, dsr, q) => `La division est terminée ! ...exactement.`,
} : {
  startFirst: (partial, divisor) => `Start with ${partial}. How many times does ${divisor} go into ${partial}?`,
  startNext: (partial, divisor) => `The new partial dividend is ${partial}. How many times does ${divisor} go into ${partial}?`,
  writeQuotient: (divisor, qDigit, product, partial) => `${divisor} × ${qDigit} = ${product}, so write ${qDigit} in the quotient.`,
  writeProduct: (product, partial, rem) => `Write ${product} below ${partial} and subtract: ${partial} − ${product} = ${rem}.`,
  writeRemainder: (partial, product, rem, hasMore) => `${partial} − ${product} = ${rem}. ${hasMore ? 'Bring down the next digit.' : 'No more digits to bring down.'}`,
  bringDown: (nextDigit, rem, newPartial) => `Bring down ${nextDigit} next to ${rem}, giving ${newPartial}.`,
  completeWithRem: (div, dsr, q, r) => `Division complete! ${div} ÷ ${dsr} = ${q} remainder ${r}.`,
  completeExact: (div, dsr, q) => `Division complete! ${div} ÷ ${dsr} = ${q} exactly.`,
};
```

4. **Replace** all hardcoded French strings in the `divisionData` useMemo (lines 264-350) with calls to `divTexts.*(...)`
5. **Add `language`** to the `divisionData` useMemo dependency array so phases regenerate on language change

### Files affected
| File | Change |
|------|--------|
| `src/components/math/CompactMathStepper.tsx` | Import `useLanguage`, add translation map, replace ~8 hardcoded French strings |

