

## Goal
Fix three visual issues on `/chat` welcome screen:
1. Remove the grid pattern background showing behind the chat (the "scrolling animation background").
2. Make the fox bigger (match the reference screenshot scale).
3. Move the speech bubble **above** the fox's head (not below).

## Changes

### 1. `src/components/layout/MainLayout.tsx` — remove grid overlay
Delete the grid-pattern overlay div entirely (line 15). It tiles `/grid-pattern.svg` across the page and is what reads as a "scrolling background" behind the chat.

Result: clean solid white background, matching the reference image.

### 2. `src/components/user/chat/WelcomeFox.tsx` — restructure layout

**Reorder**: bubble FIRST (on top), fox SECOND (below).

**Bubble positioning**:
- Switch the triangle pointer from upward-pointing to **downward-pointing** (so it points down at the fox's head).
- Replace `-mt-4` with positive margin so the bubble sits above with the pointer touching near the fox's head.
- Change pointer SVG path: `M0 0 L32 0 L16 20 Z` (downward triangle), positioned at `-bottom-[18px]` instead of `-top-[18px]`.

**Fox sizing** — make it bigger to match reference:
- Change `max-w-xs sm:max-w-sm` → `max-w-sm sm:max-w-md` (wider).
- Change `maxHeight: "45vh"` → `maxHeight: "60vh"` (taller).
- This roughly doubles the visual presence of the fox to match the screenshot proportions.

**Animation entrance**: bubble's `y` initial flips from `-10` to `+10` so it drops down into place naturally above the fox.

Final structure (top → bottom):
```
[ Speech Bubble ]
       ▼  (downward pointer)
[   Fox Video   ]
```

## Files touched
- **Edit**: `src/components/layout/MainLayout.tsx` (delete 1 div with grid overlay).
- **Edit**: `src/components/user/chat/WelcomeFox.tsx` (reorder bubble/fox, flip pointer direction, enlarge fox).

## Out of scope
- Changing the fox video file itself.
- Touching `ChatInterface.tsx`, header, or bottom tabs.
- Changing translations, name resolution, or auth integrations.

