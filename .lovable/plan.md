

## Fix: Bottom Tab Stays Highlighted on Sub-Pages

### Problem
Both `MobileBottomTabs` and `GuardianBottomNav` use exact path matching (`currentPath === url`), so navigating to a sub-page like `/learning/mathematics` drops the highlight from the "Learning" tab.

### Fix
Change `isActive` to use **prefix matching** (`startsWith`) instead of exact matching, with a special case for root paths like `/chat` to avoid false positives.

### Files changed

| File | Change |
|------|--------|
| `src/components/layout/MobileBottomTabs.tsx` | Change `isActive` to: `currentPath === url \|\| (url !== '/' && currentPath.startsWith(url + '/'))` |
| `src/components/guardian/GuardianBottomNav.tsx` | Same prefix-matching fix for `isActive` |

This ensures `/learning/mathematics`, `/exercise-history/some-id`, `/guardian/children/xyz`, etc. all keep their parent tab highlighted.

