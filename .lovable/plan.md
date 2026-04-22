

## Goal
Save the uploaded `Baby_Fox.mp4` video into the project's `public/` folder so it can be referenced as `/Baby_Fox.mp4` from anywhere in the app.

## Steps
1. **Copy** `user-uploads://Baby_Fox.mp4` → `public/Baby_Fox.mp4` using `code--copy`.

That's it — no code changes, no component edits, no dependencies. Once saved, the video will be accessible at the URL path `/Baby_Fox.mp4` (e.g. `<video src="/Baby_Fox.mp4" />`).

## Files touched
- **Add**: `public/Baby_Fox.mp4`

## Out of scope
- Wiring the video into any component (e.g. replacing the fox mascot with this video). Just say the word and we can swap the `<img src="/fox-mascot.png" />` in `WelcomeFox.tsx` for an autoplaying muted `<video>` in a follow-up.
- Renaming the file (kept as `Baby_Fox.mp4`; can rename to `baby-fox.mp4` if you prefer kebab-case).
- Compressing / transcoding the video.

