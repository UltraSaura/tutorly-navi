

## Goal
Adopt the new uploaded designs:
1. `MainLayout` background → plain white (matches the fox video bg).
2. `WelcomeFox` → new layout (fox on top, speech bubble below with upward pointer).

…while preserving existing project integrations (bilingual FR/EN, profile-based name resolution, correct video filename, correct auth import).

## Changes

### 1. `src/components/layout/MainLayout.tsx`
Single class swap:
- `bg-gradient-to-b from-blue-50 to-white dark:from-gray-950 dark:to-gray-900`
  → `bg-white dark:bg-gray-950`

Everything else (header, grid overlay, mobile tabs) untouched.

### 2. `src/components/user/chat/WelcomeFox.tsx`
Replace with the uploaded layout, but adapted:

**Adopt from upload:**
- New structure: video on top, speech bubble below with upward-pointing triangle pointer.
- Bubble styling: `bg-white rounded-3xl border border-gray-100 shadow-[0_6px_32px_0_rgba(0,0,0,0.10)] px-10 py-6 w-72 sm:w-80`.
- Purple sparkle bars (top-right of bubble), yellow ⭐ (bottom-right), animated entrance.
- Video sizing: `w-full max-w-xs sm:max-w-sm object-contain` with `maxHeight: 45vh`.
- Outer flex container centering the whole composition.

**Keep from current (do NOT regress):**
- `import { useAuth } from "@/context/AuthContext"` (NOT `@/hooks/useAuth` — that path doesn't exist in this project).
- `useUserProfile` for first-name resolution (priority: profile.firstName → user_metadata.full_name → email prefix).
- `useLanguage` for bilingual greeting:
  - EN: "Hi" / "Submit your question for help!"
  - FR: "Salut" / "Soumets ta question pour obtenir de l'aide !"
- Video src: `/Baby_Fox.mp4` (the file that actually exists in `/public`). Do NOT change to `/fox-animation.mp4`.
- `WelcomeFoxProps { userName?: string | null }` and named + default exports (consumers may rely on them).
- `mix-blend-multiply` on the video so any residual white edge blends cleanly into the now-white page.

**Drop from current:**
- The overlapping speech bubble + curved SVG tail (replaced by below-video bubble + triangle pointer from upload).
- The card-level top-right ✦ sparkle (not present in new design).
- `pt-16 sm:pt-20` padding hacks.

## Files touched
- **Edit**: `src/components/layout/MainLayout.tsx` (1 className swap).
- **Replace**: `src/components/user/chat/WelcomeFox.tsx` (full rewrite using new layout + preserved integrations).

## Out of scope
- Renaming the video file or generating a new animation.
- Touching `ChatInterface.tsx` or any other consumer of `WelcomeFox`.
- Changing translations infrastructure.

