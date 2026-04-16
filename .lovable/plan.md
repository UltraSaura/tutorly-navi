

## Fix: "Save Quiz Bank" fails with duplicate key error

### Root cause
Console shows: `duplicate key value violates unique constraint "quiz_bank_questions_pkey"`.

The AI generator returns questions with simple IDs like `q1`, `q2`, `q3`... Both `TopicQuizGenerator` and `TranscriptQuizGenerator` insert these IDs directly as the row primary key in `quiz_bank_questions`. Any previously saved bank already used `q1`/`q2`/etc., so the insert collides.

### Fix
At save time, rewrite each question's `id` to a unique value before inserting. Use the same ID for both the row PK and the payload's `id` so they stay in sync.

**File 1: `src/components/admin/learning/TopicQuizGenerator.tsx`** (lines 207–213)

Replace:
```ts
const questionsToInsert = generatedQuestions.map((q, index) => ({
  id: q.id,
  bank_id: bankId,
  payload: q,
  position: index,
}));
```
With:
```ts
const questionsToInsert = generatedQuestions.map((q, index) => {
  const uniqueId = `q-${bankId}-${index}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id: uniqueId,
    bank_id: bankId,
    payload: { ...q, id: uniqueId },
    position: index,
  };
});
```

**File 2: `src/components/admin/learning/TranscriptQuizGenerator.tsx`** (lines 227–232)

Apply the exact same change (same bug, same fix).

### Why this works
- `bankId` is unique per save (timestamp), so `q-${bankId}-${index}-${random}` is guaranteed unique.
- Payload `id` is rewritten too, so any answer/grading logic keyed by `question.id` continues to match.
- No schema changes, no edge function changes.

