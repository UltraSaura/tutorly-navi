

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

