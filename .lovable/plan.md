

## Plan: Add Read Aloud Feature to Math Explanation Animations

### What it does
A "Read Aloud" button appears below each math explanation text. Tapping it reads the current step's explanation using browser text-to-speech. Controls appear for pause/resume/stop. An optional auto-read toggle reads each new step automatically.

### Architecture

**New hook**: `src/hooks/useSpeechSynthesis.ts`
- Wraps the Web Speech API (`window.speechSynthesis`)
- Exposes: `speak(text, lang)`, `pause()`, `resume()`, `stop()`, `isSpeaking`, `isPaused`, `isSupported`
- Accepts `rate` (default 0.85 for kids), `lang` ('en'/'fr')
- Handles edge cases: cancels on unmount, stops when text changes mid-speech, checks voice availability
- Selects appropriate voice based on language (French voice for FR, English for EN)

**New component**: `src/components/math/MathExplanationReader.tsx`
- Props: `text` (current explanation string), `language` ('en'|'fr'), `autoRead`, `onAutoReadChange`
- Shows a prominent "Read Aloud" / "Ecouter" button with Volume2 icon
- When speaking: shows Pause, Stop buttons; when paused: Resume, Stop
- "Read Again" / "Réécouter" button after speech ends
- Auto-read toggle with label "Auto-read next step" / "Lecture auto"
- Speech rate slider (0.5x to 1.5x, default 0.85)
- Highlights text while reading (wraps text in a pulsing style during speech)
- ARIA live region announces status changes
- All buttons have visible text labels + icons (not icon-only)
- Kid-friendly colors: blue/purple primary buttons, rounded corners, large tap targets (min 44px)

**Modified file**: `src/components/math/CompactMathStepper.tsx`
- Import `MathExplanationReader`
- Add state: `autoRead` (boolean, default false)
- Extract current explanation text into a variable (already available per operation as `explanations[currentStep]`)
- Render `<MathExplanationReader>` below each operation's explanation `<motion.div>`
- Pass `text={currentExplanationText}`, `language={language}`, `autoRead`, `onAutoReadChange`

### How explanation text flows

Each operation already has a computed `explanations` array:
- **Addition**: `additionData.explanations[currentStep]`
- **Subtraction**: `subtractionData.explanations[currentStep]`
- **Multiplication**: `multiplicationData.multiplicationSteps[currentStep].explanation`
- **Division**: `divisionData.phases[currentStep].explanationTeacher`

The reader component receives the resolved string and doesn't need to know about operation type.

### UI layout (within CompactMathStepper)

```text
┌─────────────────────────────┐
│  [Animation visual grid]     │
│                              │
│  "Look at the ones column…"  │  ← existing explanation text
│                              │
│  🔊 Read Aloud    ⚙ 0.85x   │  ← new reader bar
│  □ Auto-read next step       │
└─────────────────────────────┘
```

### Accessibility
- All buttons: `aria-label` + visible text
- `aria-live="polite"` region for status announcements
- Keyboard accessible (standard button focus)
- No auto-play unless user explicitly enables auto-read toggle
- `role="status"` on the speaking indicator

### Files

| File | Change |
|------|--------|
| `src/hooks/useSpeechSynthesis.ts` | New custom hook wrapping Web Speech API |
| `src/components/math/MathExplanationReader.tsx` | New reusable read-aloud component |
| `src/components/math/CompactMathStepper.tsx` | Integrate reader below explanation text for all 4 operations |

