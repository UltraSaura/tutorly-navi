

## Fix: Video Restarting from Beginning on Page Navigation

### Problem
Two issues cause the video to restart:

1. **Player destroyed/recreated on every navigation**: The `useEffect` in `VideoPlayerBox` destroys and recreates the YouTube player whenever the component remounts (page switches). The console logs confirm repeated "Cleanup: destroying player" → "Creating new YouTube player" cycles.

2. **Saved position never restored**: `useVideoPlayer` fetches `last_watched_position_seconds` from Supabase but never uses it to seek the YouTube player to the saved position on load.

### Fix

**File: `src/components/learning/VideoPlayerBox.tsx`**

1. In the `onReady` event handler of the YouTube player, seek to the saved position:
   - Pass `video.last_watched_position_seconds` to the player's `seekTo()` method when the player is ready
   - Only seek if the saved position is > 0

2. Reduce unnecessary re-renders by ensuring the effect only fires when `videoId` actually changes (not on every remount with the same video). Use a ref to track the last initialized video ID and skip re-initialization if it hasn't changed.

**File: `src/hooks/useVideoPlayer.ts`**

3. Debounce the `updateProgress` mutation to avoid excessive Supabase writes (currently fires every 5 seconds from the interval, but the mutation itself has no deduplication). Add a check: only call `mutate` if the percentage has changed by at least 5 points since the last update, to reduce re-renders and network calls.

### Changes Summary

| File | Change |
|------|--------|
| `src/components/learning/VideoPlayerBox.tsx` | Seek to `last_watched_position_seconds` on player ready; skip re-init if same videoId |
| `src/hooks/useVideoPlayer.ts` | Debounce progress updates (5% threshold) |

