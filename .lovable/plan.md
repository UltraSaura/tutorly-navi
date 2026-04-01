

## Fix: Video Keeps Restarting During Playback

### Root causes identified

**1. Runtime crash: "Rendered more hooks than during the previous render"**
This error crashes the component tree, forcing React to unmount and remount everything — including the YouTube iframe. The crash-remount cycle is the primary cause of the video restarting.

**2. Query invalidation cascades**
When `updateProgressMutation` succeeds, it invalidates `['course-playlist']` and `['completed-videos']`. Both are consumed by `CoursePlaylistPage`, which re-renders `TopicLearnTab` → `VideoPlayerBox`. Even though the YouTube init guard (`lastInitVideoIdRef`) prevents re-initialization on re-render, the DOM div hosting the YouTube player can be destroyed and recreated by React reconciliation.

**3. Missing `refetchOnWindowFocus: false` on parent queries**
`useCoursePlaylist` doesn't set `refetchOnWindowFocus: false`. On mobile, interacting with the YouTube iframe can trigger window focus events → refetch → parent re-render.

### Fix (3 files)

| File | Change |
|------|--------|
| `src/components/learning/VideoPlayerBox.tsx` | Wrap with `React.memo`; extract YouTube container div into a `useMemo` keyed only on `videoId` so React never recreates the DOM node during re-renders |
| `src/hooks/useVideoPlayer.ts` | Remove `['course-playlist']` from `onSuccess` invalidation (already using `setQueryData` for video-player); stabilize `submitQuizAnswer` callback to use a ref (eliminates the "more hooks" risk from changing deps) |
| `src/hooks/useCoursePlaylist.ts` | Add `refetchOnWindowFocus: false` to prevent focus-triggered refetches during playback |

### Technical detail

**VideoPlayerBox — memoize the player container:**
```tsx
export const VideoPlayerBox = React.memo(({ videoId, onVideoEnd }) => {
  // ... existing hooks ...
  
  // Stable YouTube container that React won't recreate
  const youtubeContainer = useMemo(() => (
    videoId ? <div id={`youtube-player-${videoId}`} className="absolute top-0 left-0 w-full h-full" /> : null
  ), [videoId]);
  
  // In render:
  {isYouTube ? youtubeContainer : <video ... />}
});
```

**useVideoPlayer — stabilize submitQuizAnswer:**
```typescript
const submitQuizRef = useRef(submitQuizMutation.mutateAsync);
useEffect(() => { submitQuizRef.current = submitQuizMutation.mutateAsync; });

const submitQuizAnswer = useCallback((quizId: string, answerIndex: number) => {
  return submitQuizRef.current({ quizId, answerIndex });
}, []);
```

**useCoursePlaylist — prevent focus refetches:**
```typescript
staleTime: 5 * 60 * 1000,
refetchOnWindowFocus: false,
```

### Expected result
- YouTube iframe is never destroyed/recreated during playback
- Parent re-renders don't propagate to the video player
- No focus-triggered refetches interrupt playback
- Video plays continuously without interruption

