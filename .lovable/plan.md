

## Fix: Build Error + Language Re-render Loop + Exercise Not Displaying

Three issues to fix:

### 1. Build error in `generate-lesson-content/index.ts` (line 173)

The `.map(to => to.objectives)` produces a nested array (`[][]`) which can't be cast to a flat array. Need to `.flat()` it.

**File**: `supabase/functions/generate-lesson-content/index.ts` line 173
```typescript
// Change:
const objectives = (topicObjectives?.map(to => to.objectives).filter(Boolean) || []) as Array<...>;
// To:
const objectives = (topicObjectives?.map(to => to.objectives).filter(Boolean).flat() || []) as Array<...>;
```

### 2. Language re-render loop in `SimpleLanguageContext.tsx` (line 440)

The `useEffect` dependency array includes `language` and `getLanguageFromDetection` (unstable). This creates a loop: effect fires → sets language → triggers effect again.

**File**: `src/hooks/useCountryDetection.ts` line 158-163 — wrap in `useCallback`:
```typescript
const getLanguageFromDetection = useCallback(() => {
  if (detection.country) {
    return getLanguageFromCountry(detection.country);
  }
  return 'en';
}, [detection.country]);
```

**File**: `src/context/SimpleLanguageContext.tsx`:
- Add `useRef` to imports (line 1)
- After line 364, add a `languageRef` that tracks current language
- Line 414: use `languageRef.current` instead of `language`
- Line 419: use `languageRef.current` instead of `language`  
- Line 440: change deps to `[user?.id, detection.country]` only
- Lines 311-319: remove the verbose `console.log` in `t()` that fires on every translation call (floods console, degrades performance)

### 3. Exercise display issue

The page reloading from the language loop prevents exercises from being displayed — once the loop is fixed, exercises should render and grade normally. The session replay confirms the page keeps navigating to `/chat` repeatedly with "Loading translations..." appearing each time.

### Summary

| File | Change |
|------|--------|
| `supabase/functions/generate-lesson-content/index.ts` | Add `.flat()` to fix TS2352 type error |
| `src/hooks/useCountryDetection.ts` | Wrap `getLanguageFromDetection` in `useCallback` |
| `src/context/SimpleLanguageContext.tsx` | Fix effect deps, add `languageRef`, remove verbose `t()` logging |

