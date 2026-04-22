

## Goal
Replace the SVG-drawn fox in `WelcomeFox` with the uploaded **fox illustration** (the cartoon fox in teal hoodie with raised waving paw). The PNG lives in `public/`, is referenced as `/fox-mascot.png`, and is animated (waving + gentle bob) via `framer-motion`. The speech bubble greeting stays.

## Steps

1. **Add the image to `public/`**
   - Copy `user-uploads://ChatGPT_Image_Apr_22_2026_09_16_41_PM-2.png` → `public/fox-mascot.png`
   - Referenced in JSX as `<img src="/fox-mascot.png" />` (Vite serves `public/` at site root).

2. **Rewrite `src/components/user/chat/WelcomeFox.tsx`**
   - Remove the entire inline `FoxWithHoodie` SVG component and its blink `useState` / `useEffect` (no longer needed — the image already shows the waving paw and eyes).
   - Replace with a single `<motion.img src="/fox-mascot.png" alt="Friendly fox mascot waving" />`:
     - Sized `w-40 sm:w-48` (auto height, preserves aspect ratio).
     - Entrance: `initial={{ opacity: 0, scale: 0.9 }}` → `animate={{ opacity: 1, scale: 1 }}`, `duration: 0.6`.
     - Idle bob loop: `animate={{ y: [0, -8, 0] }}`, `transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}`.
     - Subtle wave tilt loop: `rotate: [0, -3, 0, 3, 0]`, `duration: 2.4`, `repeat: Infinity` (combined with the y bob in a single `animate` object so both loop together).
     - `select-none pointer-events-none draggable={false}` to prevent drag/select.
   - **Keep everything else exactly as-is**:
     - Outer wrapper card (`bg-white border-orange-100`, soft glow blob, rounded-3xl, shadow).
     - Speech bubble (white, tail pointing left, purple sparkle lines top-right, yellow star bottom-right with pulse animations).
     - Bilingual greeting via `useLanguage()` (`Hi to` / `Salut`, name in purple, `Submit your question for help!` / `Soumets ta question pour obtenir de l'aide !`).
     - Name resolution via `useUserProfile` + `useAuth` with the existing fallback chain.
     - Default export + named export both preserved.
     - Responsive `flex-col sm:flex-row` layout.

3. **Cleanup**
   - Drop unused imports (`useState`, `useEffect` if no longer referenced after removing the blink logic).
   - No changes to `ChatInterface.tsx`, no new dependencies, no DB / edge / route changes.

## Files touched
- **Add**: `public/fox-mascot.png` (copied from upload)
- **Edit (rewrite)**: `src/components/user/chat/WelcomeFox.tsx`

## Out of scope
- Putting the image in `src/assets/` (you explicitly asked for `public/`).
- Animating individual parts of the fox (paw separately, eyes blinking) — not possible with a flat PNG; we animate the whole image as a unit (bob + subtle tilt). If per-part animation is needed later, we'd need a transparent PNG of just the paw layered over a body PNG, or go back to SVG.
- Optimizing the PNG (compression / WebP conversion) — can be a follow-up if file size matters.

