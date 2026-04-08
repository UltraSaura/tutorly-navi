

## Plan: Fix Empty Screen / Reload Loop

### Root Cause

The console error says it all:
```
"Could not find a relationship between 'exercise_history' and 'exercise_explanations_cache'"
```

In `src/hooks/useExerciseHistory.ts` line 28, the Supabase query tries to join `exercise_explanations_cache` directly from `exercise_history`, but no such foreign key exists. The FK goes from `exercise_attempts` → `exercise_explanations_cache`, not from `exercise_history`. This query fails on every render, which crashes the hook and causes the UI to break and reload.

### Fix

**1 file modified**: `src/hooks/useExerciseHistory.ts`

Change the `.select()` query (lines 25-29) to remove the invalid join:

```typescript
// Before (broken):
.select(`
  *,
  attempts:exercise_attempts(*),
  explanation:exercise_explanations_cache(*)
`)

// After (fixed — join explanation through attempts):
.select(`
  *,
  attempts:exercise_attempts(
    *,
    explanation:exercise_explanations_cache(*)
  )
`)
```

This nests the explanation under each attempt (where the FK actually exists), instead of trying to join it directly from `exercise_history`.

### What stays the same
- All local grading logic
- All other hooks and components
- The `exercise_explanations_cache` table itself

