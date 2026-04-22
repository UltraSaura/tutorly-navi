

## Goal
Shift the fox character slightly to the left within the welcome card so the speech bubble has more breathing room on the right and the tail aims more naturally at the fox's head.

## Change — `src/components/user/chat/WelcomeFox.tsx`

Add a small leftward translation to the `<video>` element so the fox visually sits left-of-center, while the absolutely-positioned speech bubble stays anchored top-right.

### Edit
On the `<video>` tag, add a `-translate-x-4 sm:-translate-x-6` class (≈16px shift on mobile, ≈24px on larger screens):

```tsx
<video
  src="/Baby_Fox.mp4"
  autoPlay
  loop
  muted
  playsInline
  preload="auto"
  aria-label="Baby fox mascot animation"
  className="w-full max-w-[420px] h-auto mx-auto -translate-x-4 sm:-translate-x-6 drop-shadow-xl pointer-events-none select-none"
/>
```

### Why this approach
- `translate-x` shifts the rendered video without affecting layout flow, so the parent `flex justify-center` container and the absolutely-positioned bubble stay where they are.
- The bubble (anchored `right-2 sm:right-4`) remains in the top-right corner, so shifting the fox left increases the visual gap between fox and bubble and makes the left-pointing tail aim more clearly at the fox's head area.
- No changes to bubble position, sizing, animations, or text logic.

### Keep untouched
- Outer card, radial glow, top-right ✦ sparkle.
- Bubble: position, tail, sparkle bars, ⭐ star, staggered text entrance.
- Name resolution, bilingual greeting, exports.

## Files touched
- **Edit**: `src/components/user/chat/WelcomeFox.tsx` (one className change on the `<video>` tag).

## Out of scope
- A larger shift (e.g. `-translate-x-8` / `-translate-x-12`) — easy to dial up if 16–24px isn't enough.
- Repositioning the bubble or adjusting the tail angle.
- Cropping the video frame itself.

