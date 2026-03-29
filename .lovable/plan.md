

## Stop Videos from Auto-Playing on Page Load

### Problem
Two things cause videos to play automatically:
1. **`CoursePlaylistPage.tsx`** auto-selects the featured video on load (`useEffect` sets `playingVideoId`), which mounts the video player immediately
2. **`VideoPlayerBox.tsx`** has `autoplay: 1` for YouTube and `autoPlay` for HTML5 `<video>`, so any mounted player starts playing instantly

### Fix

**1. `src/pages/learning/CoursePlaylistPage.tsx`**
- Remove the `useEffect` that auto-selects `data.featuredVideo` — keep `playingVideoId` as `null` until the user clicks a video title

**2. `src/components/learning/VideoPlayerBox.tsx`**
- Change YouTube `playerVars.autoplay` from `1` to `0`
- Remove `autoPlay` attribute from the HTML5 `<video>` element

This way, the video list loads but nothing plays until the user explicitly clicks a video.

