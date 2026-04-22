

## Goal
Replace the **blank Tutor page** (`/chat`, rendered by `ChatInterface`) with a friendly animated welcome (fox mascot + "Hi {name}, submit your question for help"). The welcome appears when there are no exercises yet, and smoothly fades out the moment the first exercise is submitted — the grading result that replaces it slides in naturally.

Note: your prompt mentioned "StudentDashboard", but the actual page that's blank on first load is the **Tutor** (`/chat` → `ChatInterface.tsx`). The dashboard already has plenty of content. I'll wire the welcome into the Tutor where the empty state actually lives. (If you also want it on the dashboard, say the word and I'll add it there too.)

## What gets built

### 1. New component `src/components/user/chat/WelcomeFox.tsx`
- Pure inline-SVG fox mascot (orange `#F97316` body, cream `#FFF7ED` belly/face accents, dark eyes). Non-human, friendly, modern. No external image, no GIF, no emoji.
- Built with `framer-motion` (already in `package.json`, no install needed):
  - **Container**: `fade in + scale 0.95 → 1` on mount.
  - **Fox body**: gentle infinite `y: [0, -6, 0]` breathing loop (~3s).
  - **Eyes**: `scaleY` blink loop every ~4s.
  - **One paw**: rotates `[0, 18°, -8°, 0]` on a ~2s repeating "wave".
  - **Sparkle**: a single small star next to the fox, slow `scale + opacity` pulse (subtle, not childish).
- **Text block** (right side on desktop, below on mobile):
  - Line 1 (large, bold): `Hi {firstName} 👋`
  - Line 2 (muted, smaller): `Submit your question for help` (i18n: `t('chat.welcome.subtitle')` with English/French fallback inline so no translation file change is strictly required).
  - Both lines fade/slide-in **after** the fox using `motion` `delay` values (0.3s, 0.5s).
- **Card**: `rounded-3xl`, white bg, `border border-border`, `shadow-sm`, generous padding (`p-8 md:p-12`), max width `max-w-3xl`, centered.
- **Layout**: `flex flex-col md:flex-row items-center gap-8` — fox left / text right on ≥md, stacked on mobile.
- **Name resolution**: uses existing `useUserProfile()` hook → `profile.firstName`. Fallbacks: if `firstName` empty but a full name exists in `user.user_metadata.full_name`, take the first whitespace-separated token. Otherwise `"Student"`.
- **Exit animation**: wrapped by parent's `AnimatePresence` so it fades + scales out cleanly when removed.

### 2. Integrate into `src/components/user/ChatInterface.tsx`
- Import `WelcomeFox` and `AnimatePresence` from `framer-motion`.
- Compute `const showWelcome = filteredMessages.length === 0 && !isLoading && !calculationState.isProcessing;` — same emptiness check `AIResponse` already uses (which returns `null` in that case), so we're filling a real gap, not stacking on top of content.
- In the scrollable content area (just before `<AIResponse … />`), render:
  ```tsx
  <AnimatePresence mode="wait">
    {showWelcome && (
      <motion.div key="welcome" exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.25 } }}>
        <WelcomeFox />
      </motion.div>
    )}
  </AnimatePresence>
  ```
- The instant the user sends a message, `filteredMessages.length` becomes ≥1 → `showWelcome` flips to `false` → `AnimatePresence` fades the welcome out → `AIResponse` renders the exercise/grading card in its place. Net effect: blank page becomes welcome → welcome smoothly disappears → grading result appears.

### Behavior summary
| State | What's shown |
|---|---|
| Just landed on `/chat`, no messages | **WelcomeFox** (animated fox + greeting) |
| User typing / submitting | WelcomeFox stays, input fixed at bottom (unchanged) |
| First message sent → AI processing | WelcomeFox fades out (0.25s); `CalculationStatus` + skeleton appear |
| Grading result returned | Exercise card from `AIResponse` is visible; WelcomeFox stays hidden |
| User clicks "Clear All" → messages cleared | WelcomeFox fades back in |

## Design tokens used
- White card `bg-card`, `border-border`, `shadow-sm`, `rounded-3xl`
- Fox orange `#F97316` (matches existing `game.streak` token aesthetic), cream accents `#FFF7ED`, dark eyes `#1E293B` (matches `neutral.text`)
- All Tailwind classes; no new CSS file

## Files touched
- **New**: `src/components/user/chat/WelcomeFox.tsx`
- **Edit**: `src/components/user/ChatInterface.tsx` — import + `AnimatePresence` block above `<AIResponse …>`

No DB changes, no edge function, no new dependency (framer-motion 12.5 already installed), no changes to grading/chat logic, no changes to `AIResponse`.

## Out of scope
- Moving the welcome onto `StudentDashboard` (its hero card / overall progress card already fills that role).
- New i18n keys file edits — strings are inlined with a small `language === 'fr' ? … : …` so the welcome ships in both languages without touching translation files. Easy to migrate to `t()` keys later.

