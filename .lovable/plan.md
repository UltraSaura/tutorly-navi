

## Goal
Make the entire fox visible (head to feet) on the 390×726 mobile viewport, with the bubble above, no scrolling, and nothing clipped behind the input composer.

## Root cause
In the welcome state the layout is:
- top header (~64px) + bubble (~150px) + fox (`maxHeight: 87vh` ≈ 631px) + input bar (~80px) + bottom tabs (~64px)

That sums to far more than 726px. With `justify-start`, the fox is anchored from the top and its lower half (feet/legs) gets pushed under the fixed input bar — exactly what the screenshot shows.

The fox's `87vh` cap was sized for a full-viewport context, not for the chat screen which also has a bubble above and a composer + tabs below.

## Fix

### File: `src/components/user/chat/WelcomeFox.tsx`
Change only the fox video's `maxHeight` so it's bounded by the *available* space, not the full viewport:

- `style={{ maxHeight: "87vh" }}` → `style={{ maxHeight: "min(420px, calc(100vh - 360px))" }}`

Reasoning:
- 360px reserves room for: header (64) + bubble (~160) + input bar (~72) + bottom tabs (~64).
- `object-contain` keeps the fox proportional, so reducing the height cap shrinks the *frame*, not the fox's aspect ratio — and the fox stays as wide as `max-w-xl sm:max-w-3xl` allows. Visually the fox stays large but no longer overflows.
- On taller viewports (tablets/desktop), the 420px floor keeps it from getting tiny; on the 390×726 phone, it caps at ~366px so feet are visible.

Everything else in `WelcomeFox.tsx` is unchanged: bubble offset (`mt-2`), `-mt-2` on the video, width classes, `object-contain`, `mix-blend-multiply`, animations, exports.

### Files NOT touched
- `ChatInterface.tsx` — welcome state already uses `overflow-hidden` and `justify-start`; that's correct.
- `MainLayout.tsx` — already strips padding on `/chat`.

## Result
- Bubble fully visible at the top (matches reference).
- Full fox visible — head, body, and feet — sitting just above the input bar.
- No scrolling.
- Fox aspect ratio preserved; appears the same proportionally, just framed to fit the available space.

## Files touched
- `src/components/user/chat/WelcomeFox.tsx` (one-line change)

