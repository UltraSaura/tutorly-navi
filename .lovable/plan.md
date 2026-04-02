

## Fix: Merge Conflict Markers in QuizManager.tsx

### Problem
`QuizManager.tsx` has unresolved Git merge conflict markers (`<<<<<<< HEAD`, `=======`, `>>>>>>> learning`) at lines 15-22 and 30-38. This breaks the SWC compiler and prevents the app from loading.

### Fix
Remove the conflict markers and keep the clean version (the `learning` branch side, which removes the unused `quizCurriculum` state and `filteredVideos` logic).

### Changes

**`src/components/admin/learning/QuizManager.tsx`** — Remove lines 15-22 and 30-38 (the conflict markers and the dead code from HEAD). The result:

```typescript
const QuizManager = () => {
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');
  const [selectedLanguageFilter, setSelectedLanguageFilter] = useState<string>('all');
  const { data: videos = [], isLoading: videosLoading, error: videosError } = useLearningVideos();
  // ... rest unchanged
```

Lines 30-38 similarly collapse to just the language filter logic (line 40+), removing the dead `filteredVideos` block that references undefined `availableTopics`.

One file, delete ~12 lines of conflict markers and dead code.

