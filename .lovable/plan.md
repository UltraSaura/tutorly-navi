

## Plan: Rename 4 tables + update all code references

Going with **Option B** as recommended:
- `learning_subjects` → `subjects`
- `learning_topics` → `topics`
- `learning_videos` → `videos`
- `topic_objectives` → `topic_objective_links`

(`objectives` stays as-is — master curriculum objectives table.)

### Step 1 — DB migration

Single migration:
```sql
ALTER TABLE public.learning_subjects RENAME TO subjects;
ALTER TABLE public.learning_topics   RENAME TO topics;
ALTER TABLE public.learning_videos   RENAME TO videos;
ALTER TABLE public.topic_objectives  RENAME TO topic_objective_links;
```

Then recreate the two trigger functions so their internal SQL references the new table names:
- `update_topic_video_count()` — replace `learning_topics`/`learning_videos` with `topics`/`videos`
- `update_topic_quiz_count()` — same

Triggers themselves auto-follow the renamed tables. RLS policies, indexes, FKs auto-follow. Generated `src/integrations/supabase/types.ts` regenerates automatically.

### Step 2 — Update code references

Replace `.from('learning_subjects')` → `.from('subjects')`, `.from('learning_topics')` → `.from('topics')`, `.from('learning_videos')` → `.from('videos')`, `.from('topic_objectives')` → `.from('topic_objective_links')` across:

**Hooks (~11):** `useLearningSubjects`, `useManageLearningContent`, `useProgramTopicsForAdmin`, `useStudentCurriculum`, `useSubjectDashboard`, `useSuggestedVideos`, `useVideoPlayer`, `useCoursePlaylist`, `useObjectiveMastery`, `useTopicObjectives`, `useUserSchoolLevel` (if applicable)

**Components/pages (~10):** `TopicQuizGenerator`, `TranscriptQuizGenerator`, `LessonContentStudent`, `TopicTranscriptTab`, `UnifiedDashboard`, `AIResponse`, `TwoCards`, `MyProgramPage`, `TeacherTopicDetail`, `progressService`, `domain/curriculum.ts`

**Edge functions (6):** `class-students`, `generate-lesson-content`, `generate-quiz-from-topics`, `generate-quiz-from-transcripts`, `recommendations`, `student-progress`

Also rewrite embedded relation strings in nested selects:
- `learning_categories!inner(...learning_topics!inner(...))` → `learning_categories!inner(...topics!inner(...))`
- Any join paths that traverse the renamed tables

Total: ~99 references across ~21 source files + 6 edge functions.

### Step 3 — Verify after applying

Smoke-test: student dashboard, subject playlist, video player, quiz generators (topic + transcript), recommendations, teacher topic detail, admin learning content management.

### Notes

- Old migration files keep their original SQL (historical record).
- Memory file references to old names remain as docs — no functional impact.
- Single migration + regenerated types means a brief moment where TS types and code are out of sync; all code edits ship in the same change.

