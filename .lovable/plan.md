

## Goal
Replace the static `<img src="/fox-mascot.png" />` in `WelcomeFox.tsx` with an autoplaying, silent, looping `<video>` element pointing to `/Baby_Fox.mp4`. Keep the speech bubble, text animations, sparkles, star, and bilingual greeting exactly as they are now.

## Changes to `src/components/user/chat/WelcomeFox.tsx`

1. **Swap the `<img>` for a `<video>`** inside the existing float + sway `motion.div` wrappers, so the video itself inherits the gentle bob and sway motion (the speech-bubble pointer is positioned next to where the fox's mouth roughly sits — no layout change needed).

   Replace:
   ```tsx
   <img
     src="/fox-mascot.png"
     alt="Fox mascot waving"
     className="w-40 h-auto sm:w-52 drop-shadow-xl pointer-events-none select-none"
     draggable={false}
   />
   ```
   With:
   ```tsx
   <video
     src="/Baby_Fox.mp4"
     autoPlay
     loop
     muted
     playsInline
     preload="auto"
     aria-label="Baby fox mascot animation"
     className="w-40 h-auto sm:w-52 drop-shadow-xl pointer-events-none select-none"
   />
   ```

2. **Why each attribute**
   - `autoPlay` + `muted` + `playsInline` → required combo for browsers (especially iOS Safari) to autoplay without user gesture.
   - `loop` → continuous animation.
   - No `controls` attribute → no play/pause/volume UI.
   - `preload="auto"` → starts loading immediately so the loop is smooth.
   - `pointer-events-none select-none` → matches the previous `<img>` behavior; prevents right-click menu interfering and keeps the card non-interactive.
   - Same `w-40 sm:w-52 drop-shadow-xl` sizing → preserves layout so the speech bubble pointer still aligns to roughly where the fox's mouth is.

3. **Keep untouched**
   - Outer card (`bg-white border-orange-100`, rounded-3xl, warm radial glow).
   - Float loop (`y: [0, -10, 0]`, 3.6s) wrapping sway loop (`rotate: [0, 3, -2, 3, 0]`, 1.8s, 1.4s repeatDelay, origin center 80%).
   - Purple ✦ sparkle near fox.
   - Speech bubble: white, rounded-3xl, left-pointing tail (desktop only, `top-[44px]` — sits next to the fox's mouth area at the current sizing), purple sparkle bars top-right, yellow ⭐ bottom-right, staggered text entrance.
   - Bilingual greeting via `useLanguage()`, name resolution via `useUserProfile` + `useAuth`.
   - Default + named exports.

## Files touched
- **Edit**: `src/components/user/chat/WelcomeFox.tsx` — swap one element, ~10 lines changed.

No new files, no dependencies, no changes to `ChatInterface.tsx`, routes, DB, or edge functions. `public/Baby_Fox.mp4` already exists.

## Out of scope
- Adjusting the speech-bubble pointer position to pixel-perfectly hit the mouth in the video (current `top-[44px]` already lands in the upper-body area; can fine-tune in a follow-up once you see it live with the actual video frame).
- Adding a poster image (first-frame fallback). Can add `poster="/fox-mascot.png"` later if you want a fallback while the video loads.
- Removing `public/fox-mascot.png` (kept in case you want to revert or use as poster).
- Conditional reduced-motion handling (e.g. pausing video for `prefers-reduced-motion`). Easy to add if needed.

