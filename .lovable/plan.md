

## Plan: Optimize Browser Voice Selection for More Natural Speech

### Problem
The current `getVoice()` function in `useSpeechSynthesis.ts` picks the first voice matching the language prefix. This often returns a low-quality robotic voice, even when the browser has premium neural voices available.

### Fix

**1 file modified**: `src/hooks/useSpeechSynthesis.ts`

Update `getVoice()` to rank voices by quality using name-based heuristics:

1. **Priority 1**: Voices with "Natural", "Neural", "Premium", "Enhanced" in the name
2. **Priority 2**: Google voices (e.g. "Google UK English Female") — high quality on Chrome
3. **Priority 3**: Microsoft voices (e.g. "Microsoft Zira") — good quality on Edge/Windows
4. **Priority 4**: Apple voices (on Safari/macOS) — "Samantha", "Thomas" etc.
5. **Fallback**: First voice matching the language

Also add a `voiceschanged` event listener since `getVoices()` often returns an empty array on first call — voices load asynchronously. Store voices in state and re-select when they become available.

### Key code shape

```typescript
const rankVoice = (v: SpeechSynthesisVoice): number => {
  const name = v.name.toLowerCase();
  if (/natural|neural|premium|enhanced/.test(name)) return 4;
  if (/google/i.test(name)) return 3;
  if (/microsoft/i.test(name)) return 2;
  return 1;
};

const getVoice = () => {
  const voices = window.speechSynthesis.getVoices();
  const matching = voices.filter(v => v.lang.startsWith(langCode));
  matching.sort((a, b) => rankVoice(b) - rankVoice(a));
  return matching[0] || null;
};
```

### What stays the same
- All UI controls, MathExplanationReader, auto-read toggle
- Rate slider, pause/resume/stop behavior
- Language detection logic

