

## Remove "Points clés" Section from Video/Learning Pages

### Change
Remove the `KeyPointsSummary` component rendering from both pages where it appears:

1. **`src/components/learning/TopicLearnTab.tsx`** — Remove the `{lessonContent && ...KeyPointsSummary...}` block (lines ~86-90) and the import
2. **`src/pages/learning/VideoPlayerPage.tsx`** — This page also imports and could render lesson content; verify and remove if present

Single-component removal, no logic changes needed.

