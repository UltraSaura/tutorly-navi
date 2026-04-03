

## Analysis: Explanation Panel Filtering for Animations

### Current behavior

In `src/features/explanations/TwoCards.tsx` (line 149-150), the decision to show the interactive math stepper animation is:

```typescript
const shouldShowInteractiveStepper = !isGuardian && userContext?.student_level && 
  isUnder11YearsOld(userContext.student_level) && exampleExpression;
```

This uses `isUnder11YearsOld()` from `src/utils/gradeLevelMapping.ts`, which maps levels as follows:

| Level | Age | isUnder11 | Gets Animation? |
|-------|-----|-----------|-----------------|
| CP | 6-7 | true | Yes |
| CE1 | 7-8 | true | Yes |
| CE2 | 8-9 | true | Yes |
| CM1 | 9-10 | true | Yes |
| CM2 | 10-11 | true | Yes |
| 6eme | 11-12 | false | No |
| 5eme+ | 12+ | false | No |

### The problem

The current `isUnder11` threshold already aligns with French "college" (6eme+). CP through CM2 get animations; 6eme and above do not. **This is already correct for the French system.**

However, `student_level` comes from `useUserContext` which reads the `level` field from the `users` table (line 30). If a user was registered via the guardian flow, their level is in the `children` table (`grade` field) — not in `users.level`. The `useUserContext` hook does NOT check the `children` table.

### What needs to change

The filtering logic itself is correct. The issue is that `student_level` may be **missing** for child accounts, causing `shouldShowInteractiveStepper` to be `false` (no animation shown even for young students).

### Proposed fix

1. **`src/hooks/useUserContext.ts`** — After fetching from `users`, also check the `children` table for `grade` (same pattern as `useUserSchoolLevel.ts`). If `children.grade` exists, use it as `student_level` (it takes precedence, matching existing convention).

2. **`src/features/explanations/TwoCards.tsx`** — No logic change needed. The existing `isUnder11YearsOld` check already maps French college (6eme+) correctly. Once `student_level` is reliably populated, animations will show for CP-CM2 and the multi-card method will show for 6eme+.

### Technical detail

In `useUserContext.ts`, after the `users` query:
```typescript
// Check children table for grade (takes precedence)
const { data: childData } = await supabase
  .from('children')
  .select('grade')
  .eq('user_id', user.id)
  .single();

return {
  student_level: childData?.grade || data.level || undefined,
  // ... rest unchanged
};
```

This is a one-file change that ensures the animation gate works for all user types.

