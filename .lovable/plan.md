

## Goal
Replace the current SVG-based `WelcomeFox` with the simpler **div-based fox design** you provided — a round orange head with ears, face, eyes, nose, and a single waving paw — inside a clean white rounded card with the greeting text on the right.

## Changes

### File: `src/components/user/chat/WelcomeFox.tsx` (full rewrite)
Use your exact design, with these small productionizations:

1. **Keep dynamic name resolution** (don't hardcode `"Student"`):
   - Continue using `useUserProfile()` + `useAuth()` to resolve `firstName` (fallback chain unchanged: `profile.firstName` → first token of `user_metadata.full_name` → email prefix → `"Student"` / `"Élève"`).

2. **Keep bilingual support** via `useLanguage()`:
   - FR: `Salut {name}` + `Soumets ta question pour obtenir de l'aide`
   - EN: `Hi {name}` + `Submit your question for help`

3. **Use design tokens instead of raw Tailwind colors** (so it matches the app theme and dark mode):
   - `bg-white` → `bg-card`
   - `border` → `border-border`
   - `text-gray-900` → `text-foreground`
   - `text-gray-500` → `text-muted-foreground`
   - `bg-orange-400` and `bg-orange-100` kept as-is (illustration colors, intentional)
   - `text-primary` kept for the name highlight

4. **Responsive layout**:
   - Mobile (`<sm`): stack vertically (`flex-col`), fox centered on top, text centered below.
   - Desktop (`≥sm`): your original `flex items-center gap-8` row layout.

5. **Centering wrapper**: outer `motion.div` with `max-w-2xl mx-auto px-4 py-6` so the card sits nicely inside `ChatInterface`'s scroll area (matches current placement).

6. **Animations** — exactly as in your snippet:
   - Container fade + scale on mount
   - Head: gentle `y: [0, -4, 0]` breathing (3s loop)
   - Eyes: `scaleY` blink (4s loop)
   - Paw: `rotate: [0, 20, -10, 20, 0]` wave (1.2s loop) with `transformOrigin: "bottom left"`
   - Text: staggered fade-in (`delay: 0.4`, `0.8`)

### Files NOT touched
- `src/components/user/ChatInterface.tsx` — the `AnimatePresence` integration already works; the new component drops in transparently.
- No other files, no hooks, no DB, no edge function, no new dependency.

## Out of scope
- The teal-hoodie / speech-bubble design from the previous iteration is fully removed in favor of your simpler card layout.
- No backpack, no motion lines, no sparkle/star decorations — keeping it minimal as in your provided code.

