

## Goal
Eliminate the faint grey rectangle around the fox animation so it blends seamlessly into the Tutor page background, and ensure the speech bubble stays cleanly centered above the fox.

## Root cause
- The page background is `#F5F7FB` (`--neutral-bg`), not white.
- The video uses `mix-blend-multiply`, which only fully hides **pure white** pixels. The MP4's near-white background (slightly off-white due to compression) multiplies against `#F5F7FB` and produces a visible grey rectangular tint around the fox.
- No actual border/shadow exists on the video itself — the "grey area" is the blend artifact.

## Fix — `src/components/user/chat/WelcomeFox.tsx`

### 1. Give the video wrapper a solid white background, then blend
Wrap the `<video>` in a container with `bg-white` so `mix-blend-multiply` operates against pure white instead of the page's off-white. This makes the near-white video pixels disappear cleanly. Then make that white container itself invisible against the page by giving its **parent** the page background — but cleaner: simply switch strategy and put the video inside a `bg-white` box that's the same shape as the video, so the multiply blend cancels exactly.

Actually simpler and more reliable: **drop `mix-blend-multiply` entirely** and instead set the video container background to the exact page color so any video edge tint matches the page.

Final approach (cleanest):
- Set the immediate video container `style={{ backgroundColor: "#F5F7FB" }}` (matches `--neutral-bg`).
- Remove `mix-blend-multiply` from the `<video>` — it was the source of the grey halo.
- Add explicit reset classes on the `<video>`: `bg-transparent border-none outline-none block object-contain`.
- Keep sizing, centering, leftward shift, `pointer-events-none select-none`.

### 2. Strip any inherited container styling
On the inner wrapper `<div className="relative w-full flex justify-center">`:
- Add `bg-transparent` and ensure no border/shadow/padding is inherited.
- Outer `motion.div` card already has no `bg-*`/`border`/`shadow` — keep as-is.

### 3. Speech bubble — confirm centered above fox
Already correctly positioned with `absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20`. No change needed.

The fox video has `-translate-x-4 sm:-translate-x-6` (shifted left). To keep the bubble truly centered over the fox (not the video frame), nudge the bubble left to match: change `-translate-x-1/2` placement to `left-[calc(50%-16px)] sm:left-[calc(50%-24px)]` so it sits over the fox's actual centerline.

### 4. Final video element
```tsx
<div
  className="relative w-full flex justify-center bg-transparent"
  style={{ backgroundColor: "#F5F7FB" }}
>
  <video
    src="/Baby_Fox.mp4"
    autoPlay loop muted playsInline preload="auto"
    aria-label="Baby fox mascot animation"
    className="w-full max-w-[420px] h-auto mx-auto -translate-x-4 sm:-translate-x-6 block object-contain bg-transparent border-none outline-none pointer-events-none select-none"
  />
  {/* speech bubble unchanged */}
</div>
```

## Keep untouched
- Speech bubble styling, tail SVG, sparkles, ⭐, text, animations.
- Bilingual logic, name resolution, exports.
- Outer card padding (`pt-16 sm:pt-20`) reserving space for the bubble.
- ✦ top-right corner sparkle.

## Files touched
- **Edit**: `src/components/user/chat/WelcomeFox.tsx`
  - Video wrapper: add `backgroundColor: "#F5F7FB"` matching page bg.
  - Video: remove `mix-blend-multiply`, add `bg-transparent border-none outline-none block object-contain`.
  - Bubble: shift `left` to compensate for fox's leftward translate so bubble centers over the fox.

## Out of scope
- Replacing `Baby_Fox.mp4` with a true alpha-channel WebM (the only way to fully eliminate any residual edge pixels — but matching the bg color makes them invisible).
- Changing the page's `--neutral-bg` token or other components.
- Restyling the bubble.

