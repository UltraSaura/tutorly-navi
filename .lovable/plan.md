

## Fix: Video Still Reloads at ~21 Seconds

### Root cause

The `updateProgress` callback depends on `updateProgressMutation` (line 165). `useMutation` returns a **new object on every state change** (idle → loading → success). When the first progress save fires at ~5% (~20s), the mutation state changes 2-3 times, each time:

1. `updateProgressMutation` gets a new reference
2. `updateProgress` is recreated (new useCallback)
3. The `useEffect` updating `updateProgressRef` runs
4. `VideoPlayerBox` re-renders

While the guard (`lastInitVideoIdRef`) prevents full re-init, the rapid re-renders during mutation state transitions can destabilize the YouTube iframe. Additionally, `updateProgress` depends on `data?.video.progress_percentage` and `data?.quizzes` — if the query data object changes for any reason, `updateProgress` is recreated again.

### Fix

Stabilize `updateProgress` by using refs for all its dependencies, eliminating re-renders from mutation state changes entirely.

| File | Change |
|------|--------|
| `src/hooks/useVideoPlayer.ts` | Store mutation function and data deps in refs; remove them from `updateProgress` deps; add `refetchOnWindowFocus: false` to query |

### Detail

1. **Add refs for mutation and data dependencies**:
```typescript
const mutateRef = useRef(updateProgressMutation.mutate);
const dataRef = useRef(data);
// Keep refs current
useEffect(() => { mutateRef.current = updateProgressMutation.mutate; });
useEffect(() => { dataRef.current = data; });
```

2. **Make `updateProgress` dependency-free**:
```typescript
const updateProgress = useCallback((time: number, duration: number) => {
  currentTimeRef.current = time;
  const percentage = Math.round((time / duration) * 100);
  
  const quizzes = dataRef.current?.quizzes;
  const matchedQuiz = quizzes?.find(q => Math.abs(q.timestamp_seconds - time) < 2) || null;
  setCurrentQuiz(prev => prev?.id === matchedQuiz?.id ? prev : matchedQuiz);
  
  const savedProgress = dataRef.current?.video.progress_percentage || 0;
  if (percentage >= 90) {
    if (lastSavedPercentageRef.current < 90) {
      lastSavedPercentageRef.current = 100;
      mutateRef.current({ progressPercentage: 100, progressType: 'video_completed' });
    }
  } else if (percentage > savedProgress && percentage - lastSavedPercentageRef.current >= 5) {
    lastSavedPercentageRef.current = percentage;
    mutateRef.current({ progressPercentage: percentage, progressType: 'video_started' });
  }
}, []); // No dependencies — all accessed via refs
```

3. **Add `refetchOnWindowFocus: false`** to the query to prevent mobile focus-triggered refetches:
```typescript
staleTime: 5 * 60 * 1000,
refetchOnWindowFocus: false,
```

4. **Use `queryClient.setQueryData` instead of invalidation** in `onSuccess` for `video_completed`:
```typescript
onSuccess: (result) => {
  if (result?.progressType === 'video_completed') {
    // Update cache in-place instead of refetching
    queryClient.setQueryData(['video-player', videoId], (old: any) =>
      old ? { ...old, video: { ...old.video, progress_percentage: 100 } } : old
    );
    // Only invalidate non-video queries
    queryClient.invalidateQueries({ queryKey: ['course-playlist'] });
    queryClient.invalidateQueries({ queryKey: ['subject-dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['completed-videos'] });
    queryClient.invalidateQueries({ queryKey: ['quiz-banks-all'] });
  }
},
```

### Expected result
- `updateProgress` is created once and never recreated
- Mutation state changes cause zero re-renders in VideoPlayerBox
- Video plays continuously without interruption

