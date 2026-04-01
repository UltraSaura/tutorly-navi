

## Pause Video When Quiz Opens

### Problem
When a quiz overlay is opened (via the "Test yourself" button), the video continues playing behind it.

### Solution
In `QuizOverlayController.tsx`, detect when a quiz is active and pause the YouTube player. Use the global `youtubePlayerRef` approach — since the YouTube player is accessed via the `YT.Player` API on a known DOM element, we can pause it from the controller.

### Implementation

| File | Change |
|------|--------|
| `src/components/learning/VideoPlayerBox.tsx` | Expose the YouTube player ref globally via a module-level variable (e.g., `window.__ytPlayer`) or a shared ref store, so other components can call `pauseVideo()` / `resumeVideo()` |
| `src/components/learning/QuizOverlayController.tsx` | When `quizBankId` is truthy (quiz is open), call `pauseVideo()`. When quiz closes, call `resumeVideo()` |

### Detail

**VideoPlayerBox.tsx** — export pause/resume functions:
```typescript
// Module-level store
export let activeYouTubePlayer: any = null;

// Inside the component, after player creation:
activeYouTubePlayer = player;

// On cleanup:
activeYouTubePlayer = null;
```

**QuizOverlayController.tsx** — pause on open:
```typescript
import { activeYouTubePlayer } from './VideoPlayerBox';

useEffect(() => {
  if (quizBankId && activeYouTubePlayer?.pauseVideo) {
    activeYouTubePlayer.pauseVideo();
  }
  return () => {
    if (activeYouTubePlayer?.playVideo) {
      activeYouTubePlayer.playVideo();
    }
  };
}, [quizBankId]);
```

This also handles non-YouTube `<video>` elements by adding a similar ref export for the native video element.

