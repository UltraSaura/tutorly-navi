

## Goal
Remove the visible rectangular border/frame around the fox animation video on the `/chat` page so the mascot appears fully borderless against the page background.

## Root cause
The `<video>` element in `src/components/user/chat/WelcomeFox.tsx` currently has:
- `drop-shadow-xl` → renders a soft dark rectangular shadow around the video's bounding box, which reads as a "border" since the video frame is rectangular.
- `mix-blend-multiply` → blends near-white pixels into the page, but any subtle off-white/cream tint at the video's edges still shows as a faint rectangle against the page gradient.

The outer container is already transparent (no `bg-white`/`border` left), so the only remaining visible frame comes from the video element itself.

## Fix — `src/components/user/chat/WelcomeFox.tsx`

### Change on the `<video>` className
- **Remove** `drop-shadow-xl` → eliminates the rectangular shadow halo around the video bounding box.
- **Keep** `mix-blend-multiply` → continues to blend white pixels into the page background.
- **Keep** all other classes: sizing (`w-full max-w-[420px] h-auto`), centering (`mx-auto`), leftward shift (`-translate-x-4 sm:-translate-x-6`), and `pointer-events-none select-none`.

That's the only change required.

### Why this works
The "border" the user sees is the soft drop shadow projecting a rectangle around the video's rectangular frame. Without it, only the fox shape (after multiply-blend) remains visible — no rectangle.

### Mobile (768x726) sanity check
- No layout impact: only a visual filter is removed.
- Bubble, sparkle, and text positioning unchanged.

## Keep untouched
- Outer container transparency, padding, top-right ✦ sparkle.
- Speech bubble (position, tail SVG, sparkle bars, ⭐, text, animations).
- Bilingual greeting, name resolution, exports.
- Video sizing, blend mode, leftward shift.

## Files touched
- **Edit**: `src/components/user/chat/WelcomeFox.tsx` (remove `drop-shadow-xl` from the `<video>` className — 1 token).

## Out of scope
- Replacing `Baby_Fox.mp4` with a true alpha-channel asset (would be the only way to fully eliminate any residual edge tint from the video file itself).
- Changing the page background or bubble styling.
- Resizing or repositioning the fox.

