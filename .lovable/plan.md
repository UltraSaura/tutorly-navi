

## Plan: Wire Lazy Explanation Loading into AIResponse ExerciseCard

### Problem

The `ExerciseCard` inside `AIResponse.tsx` has a "Show explanation" button that opens a dialog, but it **never calls the AI** to fetch an explanation. It just displays whatever text is already in the assistant message content (e.g. `"CORRECT\n10/10"`). The `fetchExplanation` function in `useExercises.ts` exists and works, but is never connected to this component.

### Root Cause

There are two separate exercise rendering paths:
1. `Exercise.tsx` — has `onFetchExplanation` prop, supports lazy loading (but is NOT used for chat messages)
2. `ExerciseCard` in `AIResponse.tsx` — renders chat exercise cards, has the "Show explanation" button, but **never triggers `fetchExplanation`**

The `ExerciseCard` in `AIResponse.tsx` needs to be wired up to call the explanation service when the dialog opens.

### Changes

**File 1: `src/components/user/chat/AIResponse.tsx`**

1. Add `onFetchExplanation` prop to `ExerciseCardProps` and pass it through from the parent
2. Add local state: `explanationText`, `explanationLoading`
3. In the "Show explanation" `DialogTrigger` `onClick`, call `onFetchExplanation` which triggers `fetchExplanation` from `useExercises`
4. **Alternative (simpler)**: Call `fetchExplanationFromAI` directly inside the component when the dialog opens, since the ExerciseCard already has `question`, `answer`, and `isCorrect` available
5. Show loading spinner while fetching, then render the AI explanation text in the dialog
6. Apply to both the JSON-response path (line 319) and the fallback path (line 627)

The simplest approach: import `fetchExplanation` from `explanationService.ts` directly into the ExerciseCard, add local state for loading/content, and call it when the dialog opens. This avoids threading props through multiple layers.

**File 2: `src/components/user/chat/AIResponse.tsx`** (same file, ExerciseCard component)

Add to ExerciseCard:
```typescript
const [explanationText, setExplanationText] = useState<string | null>(null);
const [explanationLoading, setExplanationLoading] = useState(false);

const handleShowExplanation = async () => {
  if (explanationText) return; // already loaded
  setExplanationLoading(true);
  try {
    const text = await fetchExplanationFromService(
      `card-${question}`, question, answer, isCorrect,
      undefined, language, selectedModelId || 'gpt-5', 1
    );
    setExplanationText(text);
  } catch (e) {
    setExplanationText('Failed to load explanation.');
  } finally {
    setExplanationLoading(false);
  }
};
```

Replace the static explanation content in both Dialog bodies with:
- Loading spinner when `explanationLoading` is true
- `explanationText` when loaded
- Trigger `handleShowExplanation` on `DialogTrigger` click

### What stays the same
- `explanationService.ts` — already works, just needs to be called
- `useExercises.ts` — its `fetchExplanation` stays for the Exercise.tsx path
- Local grading logic — untouched
- Exercise.tsx component — untouched

