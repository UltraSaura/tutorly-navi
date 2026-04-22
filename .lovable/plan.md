

## Goal
Replace `src/components/user/chat/WelcomeFox.tsx` with the uploaded `WelcomeFox-2.tsx` design (transparent fox PNG with float + sway, white speech bubble with sparkle/star), while keeping the app working.

## Adaptations (to keep things working)

The uploaded file is named-export only with a `userName` prop, English-only, and lives at a different path. `ChatInterface.tsx` does `import WelcomeFox from './chat/WelcomeFox'` (default import, no props). To avoid touching anything else:

1. **Keep both exports** — add `export default WelcomeFox` alongside the named export.
2. **Auto-resolve the name** when `userName` is not passed, using the existing fallback chain via `useUserProfile` + `useAuth`:
   `profile.firstName` → first token of `user_metadata.full_name` → email prefix → `Student` (EN) / `Élève` (FR).
3. **Bilingual text** via `useLanguage()`:
   - EN: `Hi` / `{firstName}` / `Submit your question for help!`
   - FR: `Salut` / `{firstName}` / `Soumets ta question pour obtenir de l'aide !`
4. **Image source** stays `/fox-mascot.png` (already in `public/`). Add `pointer-events-none select-none` to the `<img>` (uploaded version only has `draggable={false}`).
5. **File path** stays at `src/components/user/chat/WelcomeFox.tsx` (the uploaded header comment suggests `src/components/tutor/`, but we keep the existing path so no other imports break).

Everything else from the uploaded design is preserved verbatim:
- Outer card: `bg-white border-orange-100`, rounded-3xl, warm radial glow background.
- Float loop (`y: [0, -10, 0]`, 3.6s) wrapping a sway loop (`rotate: [0, 3, -2, 3, 0]`, 1.8s with 1.4s repeatDelay, origin center 80%).
- Purple `✦` sparkle near fox (top-right, opacity/scale/rotate pulse).
- Speech bubble: white, rounded-3xl, left-pointing tail (desktop only), purple sparkle bars top-right, yellow `⭐` bottom-right, staggered text entrance (0.45 / 0.62 / 0.80 delays).
- Responsive `flex-col sm:flex-row` layout.

## Files touched
- **Edit (full rewrite)**: `src/components/user/chat/WelcomeFox.tsx`

No changes to `ChatInterface.tsx`, `public/fox-mascot.png`, dependencies, routes, DB, or edge functions.

## Out of scope
- Moving the file to `src/components/tutor/`.
- Changing the import in `ChatInterface.tsx`.
- Re-exporting the PNG with transparency (assumed already transparent from the previous upload).

