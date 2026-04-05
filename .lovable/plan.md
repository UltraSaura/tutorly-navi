

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

