

## Unified Plan: Extend Transcript Generator + Add Topic-Based Generation

### Phase 1 — Extend transcript generator with visual question support

**1. `src/components/admin/learning/TranscriptQuizGenerator.tsx`** (edit)
- Add `visual_pie` and `visual_angle` to `QUESTION_TYPES` array (labeled "Visual (Pie)" and "Visual (Angle)")
- Add a "Mix" toggle that disables individual type checkboxes and sends `questionTypes: ['mix']`
- Default selected types updated to include visual options

**2. `src/hooks/useGenerateQuizFromTranscripts.ts`** (edit)
- Widen `questionTypes` to accept `'single' | 'multi' | 'numeric' | 'ordering' | 'visual_pie' | 'visual_angle' | 'mix'`

**3. `supabase/functions/generate-quiz-from-transcripts/index.ts`** (edit)
- Add `visual_pie` and `visual_angle` prompt schemas with exact JSON structure for pie segments and angle degrees
- Add `mix` mode: AI chooses best type per question
- Add post-parse validation: only keep valid kinds, visual subtypes restricted to `pie`/`angle`, ensure IDs exist, strip malformed questions, error if 0 remain

### Phase 2 — Topic-based generation

**4. `supabase/functions/generate-quiz-from-topics/index.ts`** (create)
- Accepts `topicIds[]`, `questionCount`, `questionTypes[]`, `difficulty`
- Fetches topic names, descriptions, keywords, curriculum info, and linked objectives from DB
- Same AI prompt structure, visual schemas, and validation as transcript function
- Returns `{ questions, topicNames }`

**5. `src/hooks/useGenerateQuizFromTopics.ts`** (create)
- Mutation hook calling the new edge function

**6. `src/components/admin/learning/TopicQuizGenerator.tsx`** (create)
- Step 1: Select subject → filter topics → multi-select topics
- Step 2: Settings (same question type checkboxes + Mix + difficulty + count)
- Steps 3-5: Reuse identical generating/review/preview/save flow pattern from TranscriptQuizGenerator
- Save with `source_type: 'topic_generated'`

**7. `src/components/admin/learning/BankManager.tsx`** (edit)
- Add "Generate from Topics" button alongside existing "Generate from Transcripts"
- Import and render `TopicQuizGenerator`

**8. `src/types/quiz-bank.ts`** (edit)
- Add `'topic_generated'` to `QuizBankSourceType`

### Technical details

- Visual pie schema: segments with `id`, `value`, `colored`; variants array with `correct` flag
- Visual angle schema: `aDeg`, `bDeg`, `targetDeg`, `toleranceDeg`
- Validation rules: single = exactly 1 correct out of 4; multi = 2-3 correct out of 4; all questions need `id` + `prompt`
- Uses existing `LOVABLE_API_KEY` and Lovable AI Gateway (`google/gemini-2.5-flash`)
- No new DB tables needed — reuses `quiz_banks`, `quiz_bank_questions`

