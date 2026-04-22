

## Goal
Reposition the speech bubble so it sits **next to the fox's head** (not floating above), and extend the bubble's tail so it reaches close to the fox's mouth area.

## Current problem
- Bubble is anchored at `top-2 right-2 sm:top-4 sm:right-4` → floats in the upper-right corner, visually disconnected from the fox.
- Bubble tail is a tiny 16px CSS triangle on the bubble's left edge → too short to "touch" the fox's mouth.
- Fox is shifted left (`-translate-x-4 sm:-translate-x-6`), making the gap between bubble and fox even wider.

## Fix — `src/components/user/chat/WelcomeFox.tsx`

### 1. Move the bubble down to head height
Change bubble anchor from `top-2 right-2 sm:top-4 sm:right-4` to roughly the vertical middle-upper region where the fox's head sits in the video frame. Use `top-[35%] right-1 sm:right-2` so it aligns horizontally with the fox's head instead of floating in the corner.

### 2. Make the bubble visually closer to the fox
Slightly reduce the bubble's right offset and allow the tail to extend further left.

### 3. Extend the tail toward the fox's mouth
Replace the tiny CSS-triangle tail (16px wide) with a longer, slimmer SVG tail that visually bridges from the bubble's left edge toward the fox's mouth area (~40–60px long), curving slightly downward like a classic cartoon speech-bubble pointer.

Approach: render an inline SVG positioned at `left: -50px` on the bubble, sized ~`60px × 40px`, drawing a tapered tail (filled white with a subtle border) that points down-left toward where the fox's mouth appears in the video frame.

Example tail SVG (conceptual):
```tsx
<svg
  aria-hidden
  width="60"
  height="40"
  viewBox="0 0 60 40"
  className="absolute -left-[52px] top-1/2 -translate-y-1/2"
  style={{ filter: "drop-shadow(-1px 1px 1px rgba(0,0,0,0.04))" }}
>
  <path
    d="M60 8 Q 30 14, 8 32 Q 28 22, 60 26 Z"
    fill="white"
    stroke="#f3f4f6"
    strokeWidth="1"
  />
</svg>
```
This produces a curved, tapering tail that visually flows from the bubble's left edge toward the fox's head/mouth area, much longer than the current 16px triangle.

### 4. Remove the old CSS-triangle tail
Delete the existing `<div>` with `borderTop/borderBottom/borderRight` styles — replaced by the SVG above.

### 5. Mobile (390px) sanity check
- Bubble keeps `min-w-[160px] max-w-[200px]` → fits within viewport at top-right.
- New `top-[35%]` positions bubble next to the fox's head area regardless of video aspect ratio.
- SVG tail (`-left-[52px]`) extends into the fox's space without pushing the bubble off-screen.
- Outer container padding (`px-4`) stays — bubble doesn't touch the right edge.

## Keep untouched
- Bubble background, border, shadow, sparkle bars, ⭐ star, text content & animations.
- Video element (size, blend mode, leftward shift).
- Outer card transparency and ✦ corner sparkle.
- Bilingual logic, name resolution, exports.

## Files touched
- **Edit**: `src/components/user/chat/WelcomeFox.tsx` (bubble position class + replace triangle tail with SVG tail; ~10 lines changed).

## Out of scope
- Pixel-perfect alignment to the exact mouth pixel (video frame position is fixed; we aim near the head/mouth area).
- Animating the tail (e.g. wiggle, sync to fox blink).
- Replacing the video with an alpha-channel asset.
- Changing bubble copy or sparkle decorations.

