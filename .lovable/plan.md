

## Fix: Video Reloads/Refreshes Periodically During Playback

### Root cause

Two issues combine to cause the video to stutter/reload:

1. **No `staleTime` on the video-player query** — `useVideoPlayer`'s `['video-player', videoId]` query has no `staleTime` (defaults to 0). On mobile, tapping the YouTube iframe can trigger window focus events, causing react-query to refetch. Each refetch creates a new `data` object reference, triggering re-renders.

2. **`setCurrentTime` causes re-renders every 5 seconds** — The progress interval fires every 5s, calling `updateProgress` which calls `setCurrentTime(time)`. This state update re-renders `VideoPlayerBox` and the entire hook. While the YouTube player guard prevents full re-initialization, frequent re-renders can destabilize the YouTube iframe DOM node that was injected outside React's control.

### Fix

| File | Change |
|------|--------|
| `src/hooks/useVideoPlayer.ts` | Add `staleTime: 5 * 60 * 1000` to the query. Replace `currentTime` state with a ref to eliminate re-renders from progress tracking. Only use state for `currentQuiz` when a quiz is actually detected near the current time. |
| `src/components/learning/VideoPlayerBox.tsx` | Read `currentTimeRef` instead of `currentTime` state (no functional change needed since it already uses `updateProgressRef`). |

### Detail

In `useVideoPlayer.ts`:
- Add `staleTime: 5 * 60 * 1000` to the query options
- Change `const [currentTime, setCurrentTime] = useState(0)` → `const currentTimeRef = useRef(0)`
- In `updateProgress`, use `currentTimeRef.current = time` instead of `setCurrentTime(time)` — no re-render
- For `currentQuiz` detection, keep a `[currentQuiz, setCurrentQuiz]` state but only update it when the quiz actually changes (compare by ID)

This eliminates all unnecessary re-renders during playback, keeping the YouTube iframe stable.

