

## Goal
Make the fox mascot another 30% bigger and reposition the speech bubble **above** the fox's head (instead of below).

## Changes
**File**: `src/components/user/chat/WelcomeFox.tsx`

### 1. Enlarge the video by 30%
- `max-w-md` (28rem) → `max-w-xl` (36rem) — mobile width +29%
- `sm:max-w-xl` (36rem) → `sm:max-w-3xl` (48rem) — desktop width +33%
- `maxHeight: "67vh"` → `maxHeight: "87vh"` — vertical cap +30%

### 2. Move the speech bubble above the fox
- Reorder JSX inside the flex column: render the **bubble first**, then the **video**.
- Flip the pointer triangle so it points **down** (toward the fox's head):
  - Swap the SVG path from `M16 0 L32 20 L0 20 Z` (up-arrow) to `M0 0 L32 0 L16 20 Z` (down-arrow).
  - Move it from `-top-[18px]` to `-bottom-[18px]`.
- Adjust the negative-margin spacer: change video's `-mt-4` (which pulled bubble up under fox) to a small `-mt-2` on the **video** so the bubble's pointer tucks neatly into the top of the fox's head.
- Tweak entrance animation y-offset on the bubble from `y: -10` to `y: 10` so it now slides down into place from above (small polish, optional but matches the new direction).

## Preserved
- All bilingual text, name resolution, auth/profile hooks.
- Bubble styling (size, shadow, sparkles, ⭐, rounded corners).
- `mix-blend-multiply`, `object-contain`, autoplay attrs, video src `/Baby_Fox.mp4`.
- Named + default exports and `WelcomeFoxProps` interface.

## Out of scope
- Resizing the bubble itself.
- Background, layout, or other consumers of `WelcomeFox`.

