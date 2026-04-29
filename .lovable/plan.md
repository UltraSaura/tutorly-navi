

## Goal
The speech bubble isn't rendering because `TutorWelcomeBubble.tsx` was never created and `WelcomeFox.tsx` still just `void`s `_firstName` with no bubble overlay. Create the bubble component and wire it in.

## Changes

### 1. Create `src/components/user/chat/TutorWelcomeBubble.tsx` (new)
Self-contained component, props `{ firstName: string; greeting: string; helper: string }`.
- White rounded rectangle: `bg-white rounded-2xl border border-slate-200 shadow-[0_8px_24px_rgba(15,23,42,0.08)] px-4 py-3 max-w-[200px]`.
- Three text lines:
  - Greeting — `text-sm text-slate-500`
  - First name — `text-2xl font-bold text-slate-900 leading-tight`
  - Helper — `text-xs text-slate-500 mt-1`
- Tail: rotated 10×10 white square (`bg-white border-l border-b border-slate-200`) absolutely positioned `bottom-[-5px] left-6 rotate-45` so only the outer down-left edges show — points toward the fox.
- Framer Motion: container fades + scales in (0.35s). Children stagger via `variants` with `staggerChildren: 0.18, delayChildren: 0.2` (greeting → name → helper, each fade + 6px rise).

### 2. Update `src/components/user/chat/WelcomeFox.tsx`
- Import `TutorWelcomeBubble`.
- Build localized strings inline:
  - `en`: `{ hi: "Hi", helper: "Submit your question for help" }`
  - `fr`: `{ hi: "Salut", helper: "Soumets ta question pour obtenir de l'aide !" }`
- Remove `void _firstName` and rename to `firstName`.
- Restructure render: outer wrapper stays `flex items-center justify-center h-full px-4`. Wrap the `<video>` in a `relative inline-block` container. Add `<TutorWelcomeBubble />` as an absolutely-positioned sibling inside that container at `top-2 right-2 sm:top-4 sm:right-6 z-10` so it sits above-right of the fox.
- Fox video classes, size, `object-contain`, `mix-blend-multiply`, `maxHeight: "100%"` — all preserved exactly.

### 3. Visibility lifecycle
No new state. `WelcomeFox` is already conditionally rendered by `ChatInterface`'s `showWelcomeState` guard, so the bubble auto-hides when the user sends their first question.

## Files touched
- `src/components/user/chat/TutorWelcomeBubble.tsx` (new)
- `src/components/user/chat/WelcomeFox.tsx` (modify)

