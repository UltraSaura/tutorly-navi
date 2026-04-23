

## Goal
Make the entire welcome composition (bubble + fox) fit within the visible chat area without page scrolling on any device.

## Root cause
The fox video uses `maxHeight: 87vh` and the wrapper has `mb-6`, while the chat scroll container is only `100vh - 4rem` (header) minus another ~80–128px reserved for the fixed input. On a 390×726 viewport that leaves roughly ~500px usable, but the bubble (~140px) + 87vh fox (~630px) overflows and forces scrolling.

## Change
**File**: `src/components/user/chat/WelcomeFox.tsx`

1. **Constrain the outer wrapper to the available area** so it never overflows the chat scroll region:
   - Replace `<div className="w-full mb-6">` with  
     `<div className="w-full h-[calc(100vh-4rem-9rem)] max-h-[calc(100vh-4rem-9rem)] flex items-center justify-center overflow-hidden">`
   - The `9rem` accounts for header (already subtracted via `4rem`) + fixed input bar + mobile bottom tabs (≈128px) with a small safety margin.

2. **Cap the fox video to the remaining space** instead of viewport height:
   - Change `style={{ maxHeight: "87vh" }}` →  
     `style={{ maxHeight: "calc(100vh - 4rem - 9rem - 160px)" }}`  
     (subtracts bubble height ~140px + gap so bubble + fox together fit).
   - Keep `w-full max-w-xl sm:max-w-3xl object-contain` so width still scales but height is the binding constraint on short viewports.

3. **Remove `mb-6`** on the outer wrapper (no longer needed; centering handles spacing).

## Result
- Mobile (390×726): bubble + fox fit inside the visible chat area, no scroll.
- Desktop: fox can still grow up to `max-w-3xl` width, capped vertically by available space.
- No changes to bubble styling, animations, bilingual logic, exports, or any other file.

## Out of scope
- Touching `MainLayout`, `ChatInterface`, or input bar sizing.
- Resizing the speech bubble.

