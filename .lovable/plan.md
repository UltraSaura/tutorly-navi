

## Goal
Show the entire fox (head to toe) at its current size, with no scrolling, and remove the speech bubble entirely.

## Changes

### `src/components/user/chat/WelcomeFox.tsx`

**1. Remove the speech bubble**
- Delete the entire bubble `motion.div` block (greeting, subtitle, sparkles, ⭐, pointer SVG).
- Keep the outer wrapper, hooks (`useUserProfile`, `useAuth`, `useLanguage`), name resolution logic, exports, and `WelcomeFoxProps` interface untouched (still imported/used elsewhere for `userName` prop signature).

**2. Make the full fox visible without resizing**
- Keep the video element's intrinsic sizing class `max-w-xl sm:max-w-3xl` so the fox's **rendered width is unchanged**.
- Replace the height cap that's forcing it off-screen:
  - `maxHeight: "87vh"` → `maxHeight: "100%"` and let the flex parent (`ChatInterface` welcome state, already `h-full flex flex-col items-center justify-start`) constrain it.
  - Keep `object-contain` so nothing is cropped — the browser will letterbox horizontally if needed, guaranteeing head-to-toe visibility.
- Remove the negative `-mt-2` offset (was tucking the fox under the bubble — no longer needed).

**3. Center the fox in the available viewport**
- Outer wrapper: change `flex flex-col items-center gap-0` → `flex items-center justify-center h-full`.
- This anchors the fox in the middle of the welcome area regardless of viewport height.

### No other files touched
- `ChatInterface.tsx` already has `overflow-hidden` + `flex flex-col items-center justify-start` on welcome state — no change needed.
- `MainLayout.tsx` already strips padding on `/chat` — no change needed.

## Result
- Bubble gone.
- Fox fully visible from head to toe at 390×726.
- Same on-screen size (width unchanged; height naturally fits because nothing else competes for vertical space).
- Zero scrolling.

## Files touched
- `src/components/user/chat/WelcomeFox.tsx`

