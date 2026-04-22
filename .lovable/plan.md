

## Goal
Remove the speech bubble currently sitting below the fox video and replace it with a **cartoon dialogue bubble floating next to the fox's head** (top-right area), with its tail pointing toward the fox's mouth. Keep the same greeting content (`Salut` / `{firstName}` / subtitle) and bilingual logic.

## Visual target
```text
┌──────────────────────────────────────────┐
│                          ╭────────────╮  │
│                          │  Salut     │  │
│                          │  harouna   │  │
│      [BIG FOX VIDEO]     │ Soumets ta │  │
│      (static, looping)   ╰──◁─────────╯  │
│                                          │
│                                          │
└──────────────────────────────────────────┘
```
Bubble is anchored top-right, overlapping the upper portion of the video next to the fox's head; tail points left toward the fox.

## Changes — `src/components/user/chat/WelcomeFox.tsx` (single file rewrite)

### 1. Layout: video-only stack, bubble overlaid
- Remove the vertical stack pairing video → bubble.
- Wrap the video in a `relative` container so the bubble can be absolutely positioned over it.
- Card padding stays roughly the same; remove the `mt-[-12px]` overlap trick (no longer needed).

### 2. Fox video — unchanged behavior
- Keep `<video src="/Baby_Fox.mp4" autoPlay loop muted playsInline preload="auto">`.
- Keep `w-full max-w-[420px] h-auto mx-auto drop-shadow-xl pointer-events-none select-none`.
- Keep the static frame (no float / no sway).

### 3. Speech bubble — repositioned next to the head
- Position: `absolute top-2 right-2 sm:top-4 sm:right-4` (overlapping top-right of the video area, near the fox's head).
- Tail direction: **left-pointing** (since bubble is to the right of the fox), centered vertically on the bubble's left edge:
  ```
  borderTop: 12px solid transparent
  borderBottom: 12px solid transparent
  borderRight: 16px solid white
  left: -14px; top: 50%; transform: translateY(-50%)
  ```
- Bubble width tightened for the overlay context: `min-w-[160px] max-w-[200px]`, `px-5 py-4`.
- Slightly smaller text so it fits gracefully next to the head:
  - Greeting: `text-lg` (was `text-2xl`)
  - First name: `text-2xl sm:text-3xl` (was `text-4xl`)
  - Subtitle: `text-xs` (was `text-sm`)
- Keep purple sparkle bars + yellow ⭐ accents, scaled down slightly.
- Keep staggered entrance animations (`Salut` 0.45s, `{firstName}` 0.62s, subtitle 0.80s).

### 4. Mobile (390px viewport) consideration
- At `w-full max-w-[420px]` the video already fills the mobile width. The bubble overlay (`max-w-[200px]`) sits comfortably in the top-right corner without covering the fox's face (the fox is centered in the frame, head occupies center-left of the upper portion at typical mascot framing).
- If the bubble feels cramped on the smallest screens, the `min-w-[160px]` keeps it readable; text wraps naturally.

### 5. Keep untouched
- Outer card: white bg, `rounded-3xl`, orange-tinted shadow, warm radial glow, top-right ✦ sparkle.
- Name resolution (`useUserProfile` → `useAuth` → email fallback, `Élève`/`Student` defaults).
- Bilingual greeting/subtitle via `useLanguage()`.
- Default + named exports — no change to `ChatInterface.tsx`.

### 6. Files touched
- **Edit**: `src/components/user/chat/WelcomeFox.tsx` (one file, ~30 lines changed).

No changes to `ChatInterface.tsx`, `public/Baby_Fox.mp4`, dependencies, routes, DB, or edge functions.

## Out of scope
- Pixel-perfect alignment of the tail to the exact mouth pixel in the video (the fox's head position is fixed by the video frame; we aim the tail at the head area generally).
- Animating the bubble entrance synced to a fox blink/wave moment in the video.
- A "tap to dismiss" interaction on the bubble.
- Reduced-motion handling.

