

## Goal
Reposition the speech bubble higher and shift its tail downward so it points naturally toward the fox's waving paw / mouth area instead of overlapping the fox's face.

## Observed problem (from screenshot)
- Bubble sits at `top-[32%]` → its tail crosses through the fox's ear and forehead.
- Tail exits the bubble's vertical center and points slightly down-left, but its tip lands on the fox's eye/cheek rather than near the mouth or raised paw.
- Bubble feels too low and too close to the fox's head.

## Fix — `src/components/user/chat/WelcomeFox.tsx`

### 1. Raise the bubble
Change bubble position from `top-[32%] right-1 sm:right-2` → `top-[18%] right-2 sm:right-4`.
- Moves the bubble up so it floats above the fox's head, clear of the ears.
- Adds a small right-margin so the bubble doesn't kiss the card edge on mobile (390px).

### 2. Re-aim the tail downward toward the fox's mouth/paw
Currently the tail anchors at the bubble's vertical middle (`top-1/2 -translate-y-1/2`) and curves only slightly. With the bubble raised, the tail needs to:
- Exit from the bubble's **bottom-left corner** instead of mid-left.
- Travel further down-left to reach the fox's mouth/waving paw.

Changes to the SVG:
- Reposition: `className="absolute -left-[40px] -bottom-[28px] pointer-events-none"` (anchored to bottom-left, no vertical centering).
- Resize: `width="72" height="60" viewBox="0 0 72 60"` for a longer reach.
- New path that exits the bubble at top-right of the SVG and curves down-left to a point:
  ```
  d="M72 4 Q 40 10, 8 52 Q 32 32, 72 22 Z"
  ```
  This starts near the bubble's bottom-left edge (top-right of SVG), curves down and left to a tip at `(8, 52)`, then curves back up-right to close the shape — producing a tapered tail aimed at the fox's mouth/paw region below.

### 3. Mobile (390x726) sanity check
- Bubble keeps `min-w-[160px] max-w-[200px]` → fits well within 390px viewport with `right-2`.
- `top-[18%]` keeps the bubble well within the video frame's vertical bounds.
- Tail at `-left-[40px] -bottom-[28px]` extends into the fox's space without pushing the bubble off-screen and without clipping (parent has `relative` and the outer card is no longer `overflow-hidden` for the bubble area — bubble already overflows fine via `z-20`).

## Keep untouched
- Bubble background, border, shadow, sparkle bars, ⭐ star, text content & animations.
- Video element (size, blend mode, leftward shift, `mix-blend-multiply`).
- Outer container transparency, top-right ✦ sparkle.
- Bilingual greeting, name resolution, exports.

## Files touched
- **Edit**: `src/components/user/chat/WelcomeFox.tsx` (bubble `top`/`right` classes + SVG tail position, size, and path — ~5 lines changed).

## Out of scope
- Pixel-perfect alignment to the exact paw/mouth pixel (fox position is fixed by the video frame).
- Animating the tail.
- Replacing the video with an alpha-channel asset.
- Restyling bubble copy or decorations.

