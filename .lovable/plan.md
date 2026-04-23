

## Goal
Add a polished animated speech bubble above and slightly to the right of the existing fox on the Tutor page. Bubble shows localized "Hi" → user's first name → helper text in a staged reveal. Remains visible until the user submits their first question (handled automatically by the existing welcome-state guard).

## Reference matching
- White rounded rectangle, soft border + subtle shadow.
- Tail on the **lower-left** of the bubble pointing down toward the fox's head/waving paw.
- Bubble sits **above and to the right** of the fox, anchored to the same container.

## Changes

### 1. `src/components/user/chat/WelcomeFox.tsx` — add bubble overlay

**Container restructure** (fox size unchanged):
- Wrap the existing `<video>` in a `relative` parent that sizes to the video (`inline-block`, fox keeps `max-w-xl sm:max-w-3xl`, `maxHeight: 100%`, `object-contain`).
- Add `<TutorWelcomeBubble firstName={...} />` as an `absolute` sibling positioned `top-0 right-[-8px] sm:right-[-24px]` and translated up so it sits above the fox's head, slightly offset right (matches reference).
- Outer wrapper stays `flex items-center justify-center h-full` — fox stays exactly where it is now.

**Reuse existing name resolution**: The `_firstName` already computed via `resolveFirstName(profile, user, email, fallback)` becomes the bubble's name. Replace the `void _firstName` line with passing it to the bubble.

**Localization**: Read `language` from `useLanguage()` (already imported). Map:
- `en` → `{ hi: "Hi", helper: "Submit your question for help" }`
- `fr` → `{ hi: "Salut", helper: "Soumets ta question pour obtenir de l'aide !" }`
- fallback → English.

### 2. New component: `src/components/user/chat/TutorWelcomeBubble.tsx`

Self-contained, props: `{ firstName: string; greeting: string; helper: string }`.

**Structure**:
```text
┌────────────────────────────┐
│  Hi                        │  ← small muted (text-sm text-slate-500)
│  Alex                      │  ← large bold (text-2xl font-bold text-slate-900)
│  Submit your question…     │  ← helper (text-xs text-slate-500)
│ ◣                          │  ← tail bottom-left
└────────────────────────────┘
```

**Styling**:
- `bg-white rounded-2xl border border-slate-200 shadow-[0_8px_24px_rgba(15,23,42,0.08)] px-4 py-3 min-w-[180px] max-w-[220px]`.
- Tail: a rotated white square (`w-4 h-4 bg-white border-l border-b border-slate-200`) absolutely positioned at `bottom-[-6px] left-5`, rotated 45°, with `border-r-0 border-t-0` so only the outer edges show — produces a clean integrated tail pointing down-left toward the fox.
- Responsive: bubble shrinks `max-w-[160px]` on small screens via `sm:` variants; never overflows because parent is the fox box, not the page.

**Animation (Framer Motion)**:
- Bubble container: `initial={{ opacity: 0, y: 8, scale: 0.96 }}` → `animate={{ opacity: 1, y: 0, scale: 1 }}` with `duration: 0.35, ease: [0.22, 1, 0.36, 1]`.
- Staggered children inside via `variants` + `staggerChildren: 0.18, delayChildren: 0.25`:
  1. "Hi" line — fade+rise.
  2. Name — fade+rise (slight scale-in for emphasis).
  3. Helper — fade+rise.
- After full reveal, bubble stays mounted (no exit timeout) — visibility is controlled exclusively by parent unmount.

### 3. Visibility lifecycle
No new state needed. `WelcomeFox` (and therefore the bubble) is already rendered inside `ChatInterface`'s `<AnimatePresence>` only when `showWelcomeState` is true (no user messages, not loading, not processing). Submitting the first question flips that to false and the bubble fades out via the existing exit animation. This satisfies "stay visible until first question" with zero extra logic.

### 4. Files NOT touched
- `ChatInterface.tsx` — already conditions WelcomeFox on welcome state.
- `MainLayout.tsx` — chat route layout already correct.
- Fox `<video>` size, classes, `object-contain`, `mix-blend-multiply` — all preserved.

## Localization keys (inline map, no JSON edits required)
Bubble component holds a small `MESSAGES` const keyed by `'en' | 'fr'`. If `language` is anything else, falls back to `en`. This avoids touching `src/locales/*` and matches existing inline-string patterns elsewhere in this component.

## Result
- Fox unchanged in size, position, and crop.
- White rounded bubble appears above-right of fox with a tail pointing toward the fox's head.
- Lines reveal in sequence (Hi → Name → Helper) within ~0.9s total.
- Bubble persists until the user sends their first message, then exits with the existing welcome-state fade.
- Fully responsive at 390px and up; bubble is anchored to the fox container, not the page.

## Files touched
- `src/components/user/chat/WelcomeFox.tsx` (modify: add bubble overlay, pass firstName + localized strings)
- `src/components/user/chat/TutorWelcomeBubble.tsx` (new)

