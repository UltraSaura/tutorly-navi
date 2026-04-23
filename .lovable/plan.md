

## Goal
Move the speech bubble in `WelcomeFox` down by ~1.5cm (~57px) so it sits closer to/overlapping the fox's head, without changing the fox size or layout structure.

## Change
**File**: `src/components/user/chat/WelcomeFox.tsx`

Add a downward offset to the speech bubble `motion.div` only:
- Add `mt-[57px]` (≈1.5cm at 96dpi) to the bubble's className.
- Keep the existing `-mt-2` on the video so the relative pointer-to-head tuck still works (the bubble shifting down will pull its pointer further into/over the fox's head area).

## Preserved
- Fox video size, crop, and position.
- Bubble styling, sparkles, ⭐, downward pointer.
- Bilingual greeting, name resolution, animations, exports.

## Out of scope
- Resizing bubble or fox.
- Layout, padding, or scroll behavior changes.

