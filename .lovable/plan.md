

## Goal
Fit the entire welcome screen into the 390×726 viewport with **no scrolling**. The fox stays at its current size and position. The speech bubble must be fully visible (currently its top is clipped above the viewport).

## Root cause
- `WelcomeFox` wrapper has `mb-6` and the bubble has `mt-[57px]`, pushing total height past the viewport.
- `ChatInterface` scroll area uses `overflow-auto` even in the welcome state, so the overflow becomes a visible scrollbar instead of being constrained.
- `MainLayout` adds `py-6` + mobile `pb-20` on `/chat`, eating ~100px of vertical space.

The bubble isn't actually "too high" — the whole composition is too tall, so the page scrolls and the user sees the bubble clipped at the top of the scroll area. Fix the container, not the bubble offset.

## Changes

### 1. `src/components/layout/MainLayout.tsx` — reclaim vertical space on `/chat`
- Import `useLocation`.
- Detect `isChatRoute = location.pathname.startsWith('/chat')`.
- On `/chat` only: render `<main>` with `px-[5px]` (no `py-6`, no `pb-20`). All other routes unchanged.

### 2. `src/components/user/ChatInterface.tsx` — lock welcome state to viewport, no scroll
- Compute `showWelcomeState` (no user messages, not loading, not processing) — same condition already used to render `WelcomeFox`.
- When `showWelcomeState` is true:
  - Scroll container: `overflow-auto` → `overflow-hidden`
  - Add `flex flex-col items-center justify-start` so the fox sits naturally with the bubble above it
  - Drop the keyboard-aware `paddingBottom` (welcome state has no input focus)
- When chat has messages: keep existing scroll behavior untouched.

### 3. `src/components/user/chat/WelcomeFox.tsx` — tighten spacing, keep fox identical
- Remove the wrapper's `mb-6` (reclaims 24px).
- Reduce the bubble offset: `mt-[57px]` → `mt-2` so the bubble sits just above the fox's head and the whole composition fits the viewport.
- **Fox video unchanged**: same `max-w-xl sm:max-w-3xl`, same `maxHeight: "87vh"`, same `object-contain`, same `-mt-2`, same `mix-blend-multiply`. Size and position preserved exactly.

## Result
- Bubble fully visible above the fox's head (matches reference image).
- Fox renders at exactly the same size and position as today.
- Zero scrolling on the welcome screen.
- Fixed composer and bottom tabs unaffected.

## Files touched
- `src/components/layout/MainLayout.tsx`
- `src/components/user/ChatInterface.tsx`
- `src/components/user/chat/WelcomeFox.tsx`

