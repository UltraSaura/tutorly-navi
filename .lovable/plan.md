

## Goal
Make the fox video the centerpiece of the welcome card — large, static (no bobbing/swaying), filling the chat window — with the greeting message styled as a true cartoon **speech bubble emerging from the fox's mouth**, rather than a separate panel sitting next to him.

## Visual target (from your screenshot)
```text
┌──────────────────────────────────────────┐
│                                       ✦  │
│                                          │
│         ┌────────────────────┐           │
│         │                    │           │
│         │   [BIG FOX VIDEO]  │           │  ← video fills card width,
│         │   (static frame,   │           │     no float / no sway
│         │    just plays)     │           │
│         │                    │           │
│         └────────────────────┘           │
│                                          │
│            ╭──────────────╮              │
│            │   Salut      │ ⭐           │  ← bubble UNDER the fox,
│            │  harouna     │              │     tail pointing UP toward
│            │ Soumets ta…  │              │     the fox's mouth
│            ╰────△─────────╯              │
└──────────────────────────────────────────┘
```

## Changes — `src/components/user/chat/WelcomeFox.tsx` (single file rewrite)

### 1. Layout: switch from side-by-side to vertical stack
- Replace the current `flex-col sm:flex-row … gap-12` row with a **vertical column** at all breakpoints: `flex flex-col items-center gap-0`.
- Outer card keeps the white bg, rounded-3xl, orange-tinted shadow, warm radial glow.
- Card padding tightened on top/bottom so the fox can dominate: `px-4 pt-6 pb-8 sm:px-8`.

### 2. Fox video: big, static, fills the chat window
- Remove the **outer float** (`y: [0, -10, 0]`) and **inner sway** (`rotate: [0, 3, …]`) `motion.div` wrappers entirely. The video will not bob or rotate — only the in-video animation plays.
- Keep the entrance fade/scale on the parent card; remove per-element looping motion on the fox.
- Resize the video to fill the available card width:
  - `w-full max-w-[420px] h-auto mx-auto`
  - Drop the fixed `w-40 sm:w-52` cap.
  - Keep `drop-shadow-xl pointer-events-none select-none` and all `<video>` attributes (`autoPlay loop muted playsInline preload="auto"`).
- Keep the purple `✦` sparkle, but reposition it to the **top-right corner of the card** (not stuck to the fox), e.g. `absolute top-4 right-5`.

### 3. Speech bubble: emerges from the fox's mouth
- Move the bubble **below** the video (vertical stack), centered: `mt-[-12px]` to slightly overlap the video bottom, giving a "rising from below the chin" feel that matches your screenshot.
- Bubble styling stays: white, `rounded-3xl`, soft shadow, gray-100 border, centered text, sparkle bars, ⭐ star, staggered entrance for `Salut` / `{firstName}` / subtitle.
- **Replace the side pointer** (currently a left-pointing triangle on desktop only) with an **upward-pointing tail** centered on the bubble's top edge, aimed at the fox's mouth area:
  ```text
       △        ← tail (CSS triangle), centered, pointing up
  ╭─────────╮
  │  bubble │
  ╰─────────╯
  ```
  Implementation: a `::before`-style absolutely-positioned div with:
  ```
  borderLeft: 14px solid transparent
  borderRight: 14px solid transparent
  borderBottom: 18px solid white
  top: -16px; left: 50%; transform: translateX(-50%)
  ```
  Plus a matching slightly larger gray triangle 1px behind it for the border line, OR use a `drop-shadow` filter on the wrapper to keep things simple (matches the existing technique for the old left-pointer).
- Show the tail at **all breakpoints** (remove the `hidden sm:block` restriction) — your screenshot shows it on mobile.
- Bubble width: `min-w-[240px] max-w-[320px]` so the layout reads well on the 390px-wide mobile viewport you're currently in.

### 4. Keep untouched
- All name-resolution logic (`useUserProfile` → `useAuth` → email fallback, `Élève`/`Student` defaults).
- Bilingual greeting/subtitle via `useLanguage()`.
- Sparkle bars (top-right of bubble) and ⭐ star (bottom-right) — both keep their pulse animations since they're decorative bubble accents, not the fox.
- Default + named exports (`ChatInterface.tsx` keeps working with no edit).
- File path `src/components/user/chat/WelcomeFox.tsx`.

### 5. Files touched
- **Edit**: `src/components/user/chat/WelcomeFox.tsx` (one file, ~40 lines changed inside the existing structure).

No changes to `ChatInterface.tsx`, `public/Baby_Fox.mp4`, dependencies, routes, or the DB.

## Out of scope
- Removing the card border/shadow entirely to make the video bleed edge-to-edge of the chat scroll area (current scope keeps the white rounded card; can do a borderless variant in a follow-up).
- Replacing the in-video animation (still the same `Baby_Fox.mp4` looping silently).
- Animating the bubble tail itself (e.g. a "pop" appearance synced to a fox blink) — easy follow-up.
- Reduced-motion handling for the video.

