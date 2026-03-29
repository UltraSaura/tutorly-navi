

## Auto-Play Video When User Clicks a Video Title

### Problem
After the previous fix to stop auto-play on page load, we set YouTube `autoplay: 0` and removed HTML5 `autoPlay`. Now videos don't play even when the user explicitly clicks a video title — they have to click the play button inside the player too.

### Fix
The video should auto-play **only when the user selects it** (clicks the title). Since `playingVideoId` only changes when the user clicks, we can safely auto-play whenever a new video is loaded.

### Changes

**`src/components/learning/VideoPlayerBox.tsx`**
- YouTube: change `autoplay` back to `1` in `playerVars` — this is fine because the player only mounts when the user clicks a title (since `playingVideoId` starts as `null`)
- HTML5 `<video>`: add back `autoPlay` attribute for the same reason

The key insight: the previous auto-play issue was caused by `CoursePlaylistPage` auto-selecting a video on load (which we already removed). The player itself should auto-play since it only appears after explicit user action.

