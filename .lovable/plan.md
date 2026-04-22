

## Goal
Anchor the speech bubble to the fox so it stays visually attached across all screen sizes — centered horizontally above the fox's head — instead of floating in the top-right corner.

## Current problem
- Bubble is positioned at `top-[18%] right-2 sm:right-4` → anchored to the right edge of the video container, not to the fox itself.
- Because the fox is shifted left (`-translate-x-4 sm:-translate-x-6`) and its position within the video frame depends on viewport width, the bubble drifts away from the fox on different screen sizes.
- Tail SVG is hard-coded to point down-left from the bubble's bottom-left corner, which only works when the bubble sits to the upper-right of the fox.

## Fix — `src/components/user/chat/WelcomeFox.tsx`

### 1. Restructure: bubble centered above the fox
The video already lives inside a `relative` wrapper (`<div className="relative w-full flex justify-center">`). Reposition the bubble within that same wrapper using horizontal centering:

- Change bubble container classes from:
  ```
  absolute top-[18%] right-2 sm:right-4 z-20 ...
  ```
  to:
  ```
  absolute top-0 left-1/2 -translate-x-1/2 z-20 ...
  ```
- This centers the bubble horizontally relative to the video wrapper (which is itself centered on the page), so the bubble stays above the fox regardless of viewport width.
- Add a small upward offset so the bubble sits **above** the fox's head rather than overlapping it: combine with `-translate-y-2` (and keep `-translate-x-1/2`) → final transform: `-translate-x-1/2 -translate-y-2`.
- Optional: nudge slightly left to compensate for the fox's `-translate-x-4` shift, e.g. `left-[calc(50%-12px)]` so the bubble visually centers over the fox's actual position rather than the video frame's center.

### 2. Re-aim the tail straight down
With the bubble now centered above the fox, the tail must point **straight down** (toward the fox's head) instead of down-left.

Replace the current SVG tail with a centered downward tail:
```tsx
<svg
  aria-hidden
  width="40"
  height="32"
  viewBox="0 0 40 32"
  className="absolute left-1/2 -translate-x-1/2 -bottom-[24px] pointer-events-none"
  style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.04))" }}
>
  <path
    d="M8 0 Q 14 18, 20 30 Q 22 18, 32 0 Z"
    fill="white"
    stroke="#f3f4f6"
    strokeWidth="1"
  />
</svg>
```
- Tail anchors at the bubble's bottom-center (`left-1/2 -translate-x-1/2 -bottom-[24px]`).
- Path draws a tapered teardrop pointing straight down toward the fox's head below.

### 3. Keep the bubble compact and clean
No changes to the bubble's visual styling — it already has:
- `bg-white rounded-3xl border border-gray-100 shadow-[0_6px_32px_0_rgba(0,0,0,0.10)]`
- `min-w-[160px] max-w-[200px]`
- Centered text, sparkles, ⭐ decoration

These all carry over. Only position + tail direction change.

### 4. Responsive sanity check
- **390px (mobile)**: bubble width ~200px, centered → comfortably fits within video's 420px max-width.
- **Desktop**: video stays centered, bubble follows above it.
- Bubble no longer depends on viewport-relative right offsets, so it stays anchored on every breakpoint.
- Top of the WelcomeFox card has `pt-6` → bubble at `top-0 -translate-y-2` peeks slightly above the video without clipping.

### 5. Reserve vertical space for the bubble
Since the bubble now sits **above** the video (overflowing the wrapper's top), increase the outer card's top padding from `pt-6` to `pt-16 sm:pt-20` so the bubble has visual breathing room and doesn't collide with the ✦ corner sparkle or the page content above.

## Keep untouched
- Outer card transparency, ✦ top-right sparkle.
- Video element (size, blend mode, leftward shift, `mix-blend-multiply`).
- Bubble content: greeting, name, subtitle, sparkle bars, ⭐ star, all entrance animations.
- Bilingual logic, name resolution, exports.

## Files touched
- **Edit**: `src/components/user/chat/WelcomeFox.tsx`
  - Bubble container: change position classes (`top-[18%] right-2 sm:right-4` → `top-0 left-1/2 -translate-x-1/2 -translate-y-2`).
  - Tail SVG: re-anchor to bottom-center and update path to point straight down.
  - Outer card: increase top padding (`pt-6` → `pt-16 sm:pt-20`).

## Out of scope
- Replacing `Baby_Fox.mp4` with an alpha-channel asset.
- Animating the tail or syncing it to the fox.
- Restyling bubble copy, colors, or sparkles.
- Changing the page background or other components.

