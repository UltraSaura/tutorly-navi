

## Plan: Add Auto-Read Toggle Back to MathExplanationReader

### Change

**1 file modified**: `src/components/math/MathExplanationReader.tsx`

Add a small toggle button next to the speaker icon that lets the user enable/disable auto-read. It will be a compact icon-only button (same `h-7 w-7` size) using a `Volume2` with a small indicator dot or a distinct icon like `AudioLines` when auto-read is on vs off.

Implementation:
1. Add a small toggle button after the main speaker button (only visible when not speaking/paused — idle state)
2. Use `AudioLines` icon (from lucide) when auto-read is ON, with a colored highlight (e.g. `bg-primary/20 text-primary`)
3. Use a muted style when OFF
4. On click, call `onAutoReadChange(!autoRead)`
5. Add a tooltip-like `aria-label`: "Auto-read: on" / "Auto-read: off"

The button sits inline in the same `gap-1` row, keeping the compact layout.

### Files affected
| File | Change |
|------|--------|
| `src/components/math/MathExplanationReader.tsx` | Add auto-read toggle icon button in idle state |

