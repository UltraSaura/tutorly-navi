

## Goal
Fit the fox fully inside the `/chat` welcome viewport with no scrolling — **without cropping the fox itself and without shrinking it**. Crop only the empty padding around the fox in the video frame, and reclaim layout space elsewhere.

## Strategy
The `Baby_Fox.mp4` file has empty space (transparent/white halo) around the fox. We zoom into the video so the fox fills the frame edge-to-edge while staying fully visible (head to paws), then reclaim space from layout padding so the page doesn't scroll.

Key idea: use `object-cover` with a wider container than the video's natural aspect ratio, so cropping happens on the **sides** (empty space) — not the top/bottom where the fox lives. The fox is never clipped.

## Changes

### 1. `src/components/user/chat/WelcomeFox.tsx` — crop empty halo, keep fox whole
- Wrap the `<video>` in a fixed-aspect container (`aspect-[4/3]` or similar wider-than-video ratio) with `overflow-hidden`.
- Video sizing inside the wrapper:
  - `object-contain` → `object-cover` with `object-center` (centers the fox; sides of empty space get trimmed by the wider wrapper).
  - Width: keep current `max-w-xl sm:max-w-3xl` so the fox stays as large as today.
  - Height cap: `maxHeight: "87vh"` → `maxHeight: "min(480px, 60vh)"` — applied to the **wrapper**, so the wrapper fits the viewport while the fox inside scales to fill it without being cut.
- Remove outer `mb-6` to reclaim bottom slack.
- Bubble, sparkles, ⭐, bilingual text, animations, exports — unchanged.

If the fox's aspect ratio means `object-cover` would still clip head/feet at any breakpoint, fall back to `object-contain` + a tighter wrapper height — fox stays whole, with minimal letterboxing only as needed.

### 2. `src/components/user/ChatInterface.tsx` — lock welcome state to viewport, no scroll
- Compute `showWelcomeState` (no user messages, not loading, not processing).
- Outer wrapper: `h-[calc(100vh-4rem)]` → `h-full min-h-0`.
- Scroll container: keep `overflow-auto` for normal chat; switch to `overflow-hidden flex items-center justify-center` when `showWelcomeState` is true.
- Fixed composer + keyboard handling untouched.

### 3. `src/components/layout/MainLayout.tsx` — drop padding on `/chat` only
- Detect `/chat` via `useLocation`.
- On `/chat`: remove `py-6` and `pb-20` from `<main>`. Other routes unchanged.
- Reclaims ~104px of vertical space on mobile.

## Result
- Fox displays **fully** (no part clipped) at the same on-screen size as today.
- Empty halo around the fox is cropped, so it visually fills more of its frame.
- Welcome screen fits the 390×726 viewport with no page scroll.
- Bubble stays above the head; composer stays fixed at the bottom.
- All other routes unaffected.

## Files touched
- `src/components/user/chat/WelcomeFox.tsx`
- `src/components/user/ChatInterface.tsx`
- `src/components/layout/MainLayout.tsx`

