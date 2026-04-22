

## Goal
Eliminate the visible off-white rectangle around the fox video on the `/chat` page so the mascot appears to sit directly on the page background, with no card/frame around it.

## Root cause
Two layers are fighting the blend:
1. The `WelcomeFox` component wraps the video in a **white card** (`bg-white border border-orange-100 shadow-... rounded-3xl`). Even with `mix-blend-multiply`, the video's near-white pixels blend against this white card — but the card itself is a visible white rectangle sitting on the page's light-blue gradient background (`from-blue-50 to-white`). That's the off-white frame you see in the screenshot.
2. `mix-blend-multiply` only "erases" white pixels against whatever is **directly behind** the video. Because the card is white, the video blends into the card — but the card stays opaque on top of the page gradient, so a visible white block remains.

## Fix — make the card transparent so the video blends with the page itself

### Change — `src/components/user/chat/WelcomeFox.tsx`

Strip the visible card chrome from the outer `motion.div`:
- Remove `bg-white`
- Remove `border border-orange-100`
- Remove `shadow-[0_8px_40px_0_rgba(251,146,60,0.12)]`
- Remove the warm radial-glow background overlay (the `aria-hidden` div with the radial gradient)
- Keep `rounded-3xl` and padding for layout consistency, OR drop them too if you want a fully edge-to-edge mascot. Recommend keeping padding so the bubble doesn't touch the screen edges.
- Keep the top-right ✦ sparkle, the video, and the speech bubble exactly as they are.

### Why this works
- With the card transparent, `mix-blend-multiply` on the video now blends the video's white pixels against the **page's blue→white gradient** directly. White video pixels become the page background → the rectangle vanishes.
- The fox's gray/green/orange tones remain visible (multiply darkens them only marginally against a near-white page).
- The speech bubble keeps its own white background + shadow, so it still reads as a distinct floating bubble (no blend mode on it).

### Mobile (390px) check
- Card padding (`px-4 pt-6 pb-8`) preserved → bubble stays inside viewport, ✦ sparkle stays in the corner area.
- Video keeps `-translate-x-4` shift and `max-w-[420px]` sizing → no layout reflow.

### Edge case: bubble shadow
The speech bubble currently uses `filter: drop-shadow(...)` on its parent and an inner `shadow-[...]`. Both are scoped to the bubble (not the video), so they remain unaffected.

## Files touched
- **Edit**: `src/components/user/chat/WelcomeFox.tsx` (remove card bg/border/shadow + remove radial-glow overlay div).

## Out of scope
- Replacing `Baby_Fox.mp4` with a true alpha-channel video (WebM/VP9 with alpha) — would be the cleanest long-term fix but requires a new asset.
- Changing the `/chat` page background gradient.
- Restyling the speech bubble.
- Adjusting the `GeneralChatPage` (different route, not affected).

