

## Goal
Redesign `WelcomeFox` to match the uploaded reference: a standing fox in a teal hoodie/backpack waving its raised paw, next to a **speech bubble** containing the welcome message — instead of the current shared card layout.

## Visual changes

### Fox mascot (rebuilt SVG)
- **Posture**: standing upright (full body), facing forward — not the current sitting/floating round body.
- **Outfit**: teal/mint-green hoodie (`#3FB8A0`) with hood drawstrings, kangaroo pocket, and a small tan/orange backpack strap visible over the shoulder.
- **Raised left arm**: fully raised above the head with paw open, pink paw pads visible (`#F4A29A` pads on cream `#FFF7ED` palm). This is the arm that waves.
- **Right arm**: hanging naturally at the side, brown paw.
- **Head**: large rounded fox head, big expressive dark-brown eyes with white shine, small black nose, open smiling mouth with pink tongue, cream cheeks/inner ears, dark-brown ear outlines.
- **Tail**: bushy orange tail with cream tip curling out behind.
- **Feet**: two small brown standing feet.
- **Motion lines**: 3 small purple curved lines next to the raised paw to emphasize the wave (matches reference).
- Color palette: fox orange `#F47A20`, cream `#FFF3E0`, hoodie teal `#3FB8A0`, dark outline `#3A2418`, paw-pad pink `#F4A29A`, accent purple `#8B7BD8`, accent yellow `#F5C842`.

### Speech bubble (replaces shared card)
- Rounded white bubble (`rounded-[2rem]`) with light border and soft shadow.
- **Tail/pointer** on its left side pointing toward the fox (small triangular notch made via SVG or a rotated div).
- Content stacked and centered:
  - Line 1: `Hi` (dark navy, bold)
  - Line 2: `{firstName}` (purple `#8B7BD8`, larger, bold) — French: same structure, `Salut {firstName}`.
  - Line 3 (smaller, dark navy): `Submit your question for help` / `Soumets ta question pour obtenir de l'aide`.
- Small purple "sparkle lines" top-right inside the bubble, small yellow star bottom-right (decorative, matching reference).

## Animation (Framer Motion, kept lightweight)
- **Container**: fade-in + scale `0.95 → 1` on mount (unchanged).
- **Body**: subtle breathing `y: [0, -4, 0]` over ~3.5s.
- **Raised paw only**: rotate `[-8°, 14°, -8°]` around the shoulder pivot, ~1.6s loop with ease-in-out — this is the wave on the *raised* hand, exactly as in the reference.
- **Motion lines next to paw**: sync opacity pulse `[0.4, 1, 0.4]` with the wave to feel like motion bursts.
- **Eyes**: blink (`scaleY` to 0.1) every ~4s.
- **Speech bubble**: fade + slide-in from right with a small `delay: 0.25s` so the fox lands first; text lines stagger (delays 0.4s, 0.55s, 0.7s).
- **Sparkle/star inside bubble**: gentle scale + opacity pulse loop.
- Exit animation (handled by `AnimatePresence` in `ChatInterface`) unchanged.

## Layout
- Outer wrapper unchanged: centered, `max-w-3xl`, generous padding.
- **Desktop (≥md)**: `flex-row`, fox on the left (~220px), speech bubble on the right (flex-1), gap-8.
- **Mobile (<md)**: `flex-col`, fox centered on top (~180px), speech bubble below — the bubble's pointer rotates to point upward (toward the fox) via a responsive class swap.
- No outer card/border around both — the speech bubble itself is the only "card" surface, matching the reference's airy white background. Background stays the page's `bg-neutral-bg`.

## Name resolution
Unchanged: `useUserProfile().firstName` → fallback to first token of `user.user_metadata.full_name` → fallback `"Student"` / `"Élève"` (FR).

## Files touched
- **Edit**: `src/components/user/chat/WelcomeFox.tsx` — full rewrite of the SVG (standing fox in hoodie), replace the shared card with a speech bubble component, move the wave animation onto the raised paw, add motion lines + sparkle/star decor.

No changes to:
- `ChatInterface.tsx` (the `AnimatePresence` integration already works).
- Any other component, hook, route, translation file, DB, or edge function.
- No new dependency.

## Out of scope
- Adding the backpack as a separate animated layer (kept as a static strap detail to keep SVG light).
- Photorealistic/3D shading from the reference — we approximate with flat shapes + soft inner highlights (production-friendly inline SVG).

