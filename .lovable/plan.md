

## Goal
Make the fox animation feel like a native part of the Tutor page: no visible video frame, no right-side blank strip, no nested scrolling, with the speech bubble cleanly anchored above the fox.

## Root cause analysis

1. **Baked-in video background**: `/public/Baby_Fox.mp4` is a standard MP4 with a solid (near-white/cream) background baked in. CSS `mix-blend-multiply` was previously used to hide it but caused a grey halo against the page's `#F5F7FB`. There is no alpha-channel WebM or Lottie/Rive file in `/public` — only `Baby_Fox.mp4` and a static `fox-mascot.png`.
2. **Right-side grey strip**: The video is shifted left with `-translate-x-4 sm:-translate-x-6` inside a `w-full max-w-[420px]` container. The container itself stays full width, so the area on the right (where the video used to be before the translate) shows the wrapper background `#F5F7FB`. Even when that matches the page, the surrounding chat container isn't always exactly the same tone, producing a visible strip.
3. **Internal scroll feeling**: The fox component itself has no `overflow-auto`, but `ChatInterface.tsx` wraps everything in a tall scroll container with `h-full overflow-auto`. That's correct page-level scroll — but the fox card has `overflow-hidden rounded-3xl` with no max-height, which is fine. The "scrolling inside the box" perception comes from the rectangular video frame visually reading as a media player. Removing the framing illusion (right-side strip + rectangular bounds) fixes the perception.

## Fix — `src/components/user/chat/WelcomeFox.tsx`

### 1. Tightly contain the fox media (kill the right-side strip)
Replace the loose `w-full max-w-[420px]` + `translate-x` setup with a **tight inline-block wrapper** sized to the visible fox area. The wrapper uses `overflow-hidden` to clip any blank video edges, and `object-cover` on the video to crop instead of letterbox.

- Outer fox row: `flex justify-center w-full` (centers the tight wrapper, no background color needed).
- Tight wrapper: `relative inline-block w-[280px] sm:w-[340px] aspect-square overflow-hidden` (fixed visible region, square crop window — adjust if the fox aspect differs).
- Video inside: `absolute inset-0 w-full h-full object-cover` with a small negative inset (`-inset-x-2`) if needed to crop blank pixels at the edges of the source MP4.

This guarantees: no right-side strip, no rectangular frame extending past the fox, no `translate-x` exposing background.

### 2. Match the wrapper background to the page so any residual edge pixel is invisible
- Set the tight wrapper `style={{ backgroundColor: "rgb(241,247,255)" }}` (the page background per the user's spec).
- Drop the previous outer `bg-transparent` / `style={{ backgroundColor: "#F5F7FB" }}` on the row — only the tight wrapper needs it.

### 3. Strip every framing artifact from the video element
Final video classes: `absolute inset-0 w-full h-full object-cover block bg-transparent border-0 outline-none ring-0 shadow-none pointer-events-none select-none`.
No `mix-blend-*`, no `drop-shadow`, no `border`, no `ring`, no `translate`.

### 4. Add a code comment documenting the asset limitation
Above the `<video>`, add a comment so future devs can swap to a transparent asset without redesigning:

```tsx
// NOTE: /Baby_Fox.mp4 has a baked-in opaque background (no alpha channel).
// We blend by sizing the wrapper to the visible fox region and matching the
// page background. To get true transparency, replace this <video> with one of:
//   1. <video> sourcing a transparent WebM (VP9 alpha) — preferred
//   2. <Lottie animationData={...} /> from lottie-react
//   3. <Rive src="..." /> from @rive-app/react-canvas
// The surrounding wrapper layout requires no changes for any of those.
```

### 5. Re-anchor the speech bubble to the tight wrapper
The bubble is already inside the same `relative` wrapper that now holds the tight fox container — but step 1 changes that structure. Move the bubble inside the **tight wrapper** so it stays anchored to the fox region (not the row).

- Bubble position: `absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20` (no more `calc(50% - 16px)` compensation, since the fox is no longer translated).
- Tail SVG: keep current straight-down path, anchored `left-1/2 -translate-x-1/2 -bottom-[24px]`.
- All bubble visual styling (white pill, rounded corners, shadow, sparkles, ⭐, text, animations) untouched.

### 6. No internal scrolling
Confirm and keep:
- Fox card outer `motion.div`: keep `overflow-hidden rounded-3xl` (decorative clip only — no fixed height, so no scroll).
- Tight fox wrapper: `overflow-hidden` (decorative crop only — fixed dimensions, no scrollable content).
- Remove any leftover `max-w-[420px]` patterns that previously made the section behave like an embedded media box.

The page-level scroll continues to be handled by `ChatInterface.tsx`'s `h-full overflow-auto` wrapper — that's correct and stays as-is.

## Final structure (conceptual)

```text
<div mb-6>                                  ← page row
  <motion.div relative overflow-hidden rounded-3xl px-4 pt-16 pb-8>
    [✦ corner sparkle]
    <div flex justify-center w-full>        ← centers the tight crop
      <div relative inline-block            ← TIGHT crop wrapper
           w-[280px] sm:w-[340px] aspect-square
           overflow-hidden
           bg=[rgb(241,247,255)]>
        <video absolute inset-0 object-cover ... />
        <motion.div absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2>
          [speech bubble + tail + sparkles]
        </motion.div>
      </div>
    </div>
  </motion.div>
</div>
```

## What this delivers
- No right-side grey strip (tight wrapper + `object-cover` crops blank video edges).
- No rectangular media-player feel (wrapper is sized to the fox, blends into the page).
- No internal scroll (no fixed heights with overflow-auto anywhere in the fox tree).
- Bubble stays anchored above the fox at every breakpoint (it lives inside the tight wrapper).
- Asset swap path documented in code for future Lottie / Rive / WebM-alpha upgrade.

## Keep untouched
- `ChatInterface.tsx` page scroll container (correct as-is).
- Bubble visual styling, tail SVG, sparkles, ⭐, greeting/name/subtitle, animations.
- Bilingual logic, name resolution, exports, ✦ corner sparkle.

## Files touched
- **Edit**: `src/components/user/chat/WelcomeFox.tsx` (~25 lines: restructure fox container into a tight cropped wrapper, move bubble inside it, simplify video classes, add asset-swap comment).

## Out of scope
- Adding a true alpha-channel asset (no transparent WebM, Lottie, or Rive file exists in `/public` today — would require a new asset upload).
- Restyling the bubble or page background.
- Touching `ChatInterface.tsx`'s scroll container.

