

## Goal
Make the fox video blend seamlessly into the welcome card by removing the visible white/colored rectangle behind the video so its background matches the surrounding card.

## Root cause
The `Baby_Fox.mp4` video file has a solid (likely white or off-white) background baked into the frames. Since CSS can't make pixels inside a video transparent, the video will always show its own background unless we either:
1. Match the card background to the video's background, OR
2. Use a CSS blend mode to drop the video's light background, OR
3. Replace the video with a transparent-background version (WebM with alpha or HEVC with alpha) — requires a new asset.

Option 2 is the best fit here: it requires no new asset and works with the existing MP4.

## Change — `src/components/user/chat/WelcomeFox.tsx`

Apply `mix-blend-mode: multiply` to the `<video>` element. On a white/near-white card background, this makes the video's white pixels disappear (multiply with white = unchanged background) while preserving the fox's colors.

### Edit
Add `mix-blend-multiply` to the video's className:

```tsx
<video
  src="/Baby_Fox.mp4"
  autoPlay
  loop
  muted
  playsInline
  preload="auto"
  aria-label="Baby fox mascot animation"
  className="w-full max-w-[420px] h-auto mx-auto -translate-x-4 sm:-translate-x-6 drop-shadow-xl pointer-events-none select-none mix-blend-multiply"
/>
```

### Why this works here
- The card background is white (`bg-white`) with a very subtle warm radial glow overlay.
- `mix-blend-multiply` makes white pixels in the video transparent against the white card, so the fox appears to sit directly on the card's surface with no visible video rectangle.
- The fox's orange/brown/black tones are preserved (they're darker than white, so multiply darkens them only marginally — visually unchanged).
- Side effect: the `drop-shadow-xl` will no longer apply to the video's rectangular bounding box (since whites are blended out), which is exactly what we want — the shadow effectively disappears with the rectangle.

### Fallback considerations (out of scope, mentioned for awareness)
- If the video's background turns out to be off-white/gray rather than pure white, multiply may leave a faint tint. In that case the next step would be `mix-blend-darken` or sourcing a transparent-background version of `Baby_Fox.mp4` (WebM/VP9 with alpha).

## Files touched
- **Edit**: `src/components/user/chat/WelcomeFox.tsx` (one className addition).

## Out of scope
- Re-encoding `Baby_Fox.mp4` with a true alpha channel (would require a transparent-background source file).
- Changing the card background color to match the video.
- Adjusting the video's drop shadow strategy (currently fine to lose).

