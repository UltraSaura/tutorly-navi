
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

## Fix: /auth Page Auto-Reloads Every ~25 Seconds

### Root cause

In `SimpleLanguageContext.tsx` (line 363-435), there's a `useEffect` for auto-detecting language from the user profile:

```typescript
useEffect(() => {
  // ... detectLanguageFromUser logic ...
}, [user?.id, detection.country, detection.method, language, getLanguageFromDetection]);
```

Two problems create a re-render loop:

1. **`getLanguageFromDetection` is unstable** — it's returned from `useCountryDetection()` as a plain function (not `useCallback`), so it's a new reference every render. This causes the effect to fire on every render.

2. **`language` is both a dependency and something the effect can change** — the effect calls `setLanguage(detectedLanguage)` which updates `language`, which triggers the effect again. Even when the language doesn't change, the unstable `getLanguageFromDetection` keeps re-triggering the effect.

3. **Country detection resolves asynchronously** (~10-20s for geolocation timeout + IP fallback), which updates `detection.country` and `detection.method`, triggering the effect again. This explains the ~25-second reload cycle.

Each cycle: effect fires → async detection completes → state updates → effect fires again → eventually causes enough re-renders or state thrashing to remount the page.

### Fix (2 files)

| File | Change |
|------|--------|
| `src/hooks/useCountryDetection.ts` | Wrap `getLanguageFromDetection` in `useCallback` to stabilize its reference |
| `src/context/SimpleLanguageContext.tsx` | Remove `language` and `getLanguageFromDetection` from the auto-detect effect's dependency array; use a ref for current language instead; also remove the excessive `console.log` in the `t()` function (lines 307-315) that fires on every translation call |

### Technical detail

**useCountryDetection.ts** — stabilize callback:
```typescript
const getLanguageFromDetection = useCallback(() => {
  if (detection.country) {
    return getLanguageFromCountry(detection.country);
  }
  return 'en';
}, [detection.country]);
```

**SimpleLanguageContext.tsx** — fix the auto-detect effect (line 363-435):
```typescript
// Use a ref for current language to avoid dependency loop
const languageRef = useRef(language);
useEffect(() => { languageRef.current = language; }, [language]);

useEffect(() => {
  const detectLanguageFromUser = async () => {
    // ... same logic but use languageRef.current instead of language ...
  };
  detectLanguageFromUser();
}, [user?.id, detection.country]); // Remove language, detection.method, getLanguageFromDetection
```

Also remove the verbose `console.log` in `t()` (line 307-315) — it logs on every single translation call, flooding the console.

### Expected result
- /auth page loads once and stays stable
- Language auto-detection still works on login
- No re-render loops from unstable function references
