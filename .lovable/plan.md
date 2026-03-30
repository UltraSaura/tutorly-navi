

## Add Clear Screen & Dismiss Individual Exercises

### What you'll get
1. **"Clear All" button** at the top of the exercise list — clears all chat messages (resets to welcome) and all exercises in one tap
2. **Small ✕ button** on the top-right corner of each exercise card — removes that single exercise from view

### Changes

| File | Change |
|------|--------|
| `src/hooks/useChat.ts` | Add `clearMessages` function that resets `messages` to just the welcome message. Export it. |
| `src/components/user/ChatInterface.tsx` | Destructure `clearMessages` from `useChat()` and `clearExercises` from `useExercises()`. Pass a combined `onClearAll` and per-card `onDismiss` to `AIResponse`. |
| `src/components/user/chat/AIResponse.tsx` | **Props**: add `onClearAll?: () => void` and `onDismissExercise?: (messageId: string) => void`. **Clear All**: render a small trash/eraser button above exercise list. **Dismiss**: render an `X` icon button at top-right of each `ExerciseCard`. When dismissed, remove that pair from view by filtering it out via parent callback. |
| `src/hooks/useChat.ts` | Add `removeMessage(id: string)` that filters out a message + its paired response from state. Export it. |

### UX details
- Clear All button: small outline button with `Trash2` icon + "Clear" label, positioned top-right above exercise cards
- Per-exercise dismiss: a subtle `X` circle button at the top-right of each card, gray on hover turns red
- Clear All shows a confirmation toast before wiping

