

## Plan: Make Read Aloud Button Compact and Side-Positioned

### Change

**1 file modified**: `src/components/math/MathExplanationReader.tsx`

Redesign the reader to be a small inline element rather than a centered block:

1. **Default state**: Show only a small icon-only button (Volume2 icon, 28×28px) positioned to the right of the explanation text — not in its own centered row
2. **When speaking**: Show small icon-only Pause + Stop buttons inline (same size)
3. **When paused**: Show small icon-only Play + Stop buttons inline
4. **After ended**: Show small RotateCcw icon button
5. **Auto-read toggle**: Hide it by default, or move it into the button as a long-press/secondary action — simplest approach: remove it from the visible layout entirely (keep state, just don't render the switch)
6. **Remove** `mt-3 space-y-2` container spacing — make it `inline-flex items-center gap-1`
7. All buttons become `size="icon"` with `h-7 w-7` and icons at `h-3 w-3`

### Layout change in CompactMathStepper

Each `<MathExplanationReader>` currently sits below the explanation div as a separate block. Instead, wrap the explanation text and the reader in a `flex` row so the tiny speaker icon sits at the end of the explanation text:

```text
Before:
┌──────────────────────────┐
│  "Look at the ones..."   │
├──────────────────────────┤
│     🔊 Read Aloud        │
│     □ Auto-read           │
└──────────────────────────┘

After:
┌──────────────────────────┐
│  "Look at the ones..." 🔊│
└──────────────────────────┘
```

### Files affected
| File | Change |
|------|--------|
| `src/components/math/MathExplanationReader.tsx` | Shrink to inline icon buttons, remove auto-read toggle UI |
| `src/components/math/CompactMathStepper.tsx` | Wrap explanation + reader in a flex row at each of the 5 insertion points |

