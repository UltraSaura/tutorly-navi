

## Fix: Photo/File Upload Not Triggering on Mobile

### Root cause
In `AttachmentMenu.tsx`, `handleItemClick` calls `originalOnClick()` then immediately `setOpen(false)`. On mobile, `originalOnClick` triggers `photoInputRef.current?.click()` (a hidden file input). When the Sheet closes simultaneously, the browser loses the user-gesture context and suppresses the file picker popup. This is a known mobile browser behavior -- programmatic `.click()` on a file input only works within a trusted user gesture, and closing the Sheet steals that context.

### Fix
In `AttachmentMenu.tsx`, delay `setOpen(false)` slightly so the file picker has time to open before the Sheet dismisses:

```typescript
const handleItemClick = (originalOnClick: () => void) => {
  originalOnClick();
  setTimeout(() => setOpen(false), 300);
};
```

### Files changed

| File | Change |
|------|--------|
| `src/components/user/chat/AttachmentMenu.tsx` | Add `setTimeout` delay before closing sheet/popover after triggering file input |

Single-line change. No other files affected.

