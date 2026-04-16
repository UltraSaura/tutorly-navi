

## Fix: All 5 questions not visible in review step

### Problem
The edge function returns all 5 questions correctly, but the review step's `ScrollArea` has no explicit height constraint. Inside a flex column with `max-h-[90vh]` on the dialog, the ScrollArea's `flex-1` doesn't create a proper scrollable region — it overflows and gets clipped by the dialog's overflow hidden.

### Fix

**File: `src/components/admin/learning/TopicQuizGenerator.tsx`**

Give the `ScrollArea` in the review step (line 446) an explicit max height so it becomes scrollable:

Change:
```tsx
<ScrollArea className="flex-1 border rounded-lg">
```
To:
```tsx
<ScrollArea className="flex-1 border rounded-lg max-h-[50vh]">
```

This ensures the question list scrolls within the dialog rather than being clipped. The same fix should be applied to the topics step ScrollArea (line 300) for consistency.

### One file, two lines changed.

