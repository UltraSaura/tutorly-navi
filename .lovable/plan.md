

## Goal
Replace the contents of `src/components/user/chat/WelcomeFox.tsx` with the uploaded `WelcomeFox.tsx` design (3D-style fox in teal hoodie + backpack with waving paw, next to a white speech bubble greeting).

## Adaptations (required to keep the app working)

The uploaded file uses a **named export** with a `userName` prop (`export function WelcomeFox({ userName })`), but `ChatInterface.tsx` imports it as a **default export** with no props (`import WelcomeFox from './chat/WelcomeFox'`). To avoid touching `ChatInterface.tsx`, the new file will:

1. **Keep the uploaded SVG, layout, animations, and speech bubble exactly as provided** (fox, hoodie, backpack, waving paw, purple wave lines, sparkle, star, blink interval).
2. **Wrap with a `default export`** that internally resolves the user name via the existing hooks (`useUserProfile`, `useAuth`) — same fallback chain as today (`profile.firstName` → first token of `user_metadata.full_name` → email prefix → `Student` / `Élève`). Also keep the named export `WelcomeFox` for flexibility.
3. **Bilingual text** via `useLanguage()`:
   - EN: `Hi to` / `{firstName}` / `Submit your question for help!`
   - FR: `Salut` / `{firstName}` / `Soumets ta question pour obtenir de l'aide !`
4. **Theme tokens** for the outer card surface only where it would clash in dark mode: keep `bg-white` for the speech bubble (it's a designed white bubble), keep all illustration colors as-is. The outer wrapper card already uses `bg-white border-orange-100` from the design — left untouched to preserve the look.

## Files touched
- **Edit (full rewrite)**: `src/components/user/chat/WelcomeFox.tsx`

No changes to `ChatInterface.tsx`, no new dependencies, no DB / edge function / route changes. `framer-motion` already installed.

## Out of scope
- Changing the import in `ChatInterface.tsx` (kept as `default import`).
- Renaming the file or moving it to `src/components/tutor/` (the upload's header comment) — staying at the current path so no other imports break.

