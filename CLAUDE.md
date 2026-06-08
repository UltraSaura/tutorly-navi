# Stuwy — Claude Code Project Context

This file is read automatically by Claude Code at the start of every session.
It contains everything needed to work on this project without any prior briefing.

---

## What is Stuwy?

Stuwy (repo: `tutorly-navi`, branch: `development`) is a French EdTech mobile app
targeting CM1-level students (~9-10 years old) in France. It covers all school subjects,
not just math. Key differentiators: rigorous French curriculum alignment, Brilliant.org-style
interactive lessons, 9 interactive question types, AI tutor ("Tuteur"), and a video learning
section. The app deploys to iOS/Android via Capacitor.

---

## Tech Stack

| Layer | Tool |
|---|---|
| Frontend | React + TypeScript + Vite |
| Mobile | Capacitor (iOS + Android) |
| Backend | Supabase (DB + Edge Functions + Auth + Storage) |
| Styling | Tailwind CSS + shadcn/ui |
| Animations | framer-motion (already installed) |
| State/Data | @tanstack/react-query |
| Routing | react-router-dom |
| i18n | i18next |
| Font | Poppins (imported in src/index.css) |

---

## Design System — never deviate from these

```
Primary teal:       #12C6A0
Primary dark:       #0F6E56  (hover/active states)
Teal light bg:      #F2FBF8  (teal-tinted backgrounds)
Teal border:        #9FE1CB  (teal card borders)
Navy foreground:    #0F172A  (headings, dark text)
Body text:          #374151
Muted text:         #667085
Disabled text:      #9CA3AF
Background:         #F3F6FA  (page background)
White card:         white + border 0.5px #EAECEF
Error red:          #A32D2D  (bg: #FCEBEB, border: #F7C1C1)
Success green:      #27500A  (bg: #EAF3DE, border: #9FE1CB)
Amber/warning:      #B45309  (bg: #FFF3DC, border: #FAC775)
Font:               Poppins, sans-serif (ALL components)
Border radius:      14px cards, 12px smaller cards, 999px pills
```

### Font sizes for student-facing UI (CM1 = 9-10 years old)
- Heading: 18-22px, fontWeight 800
- Body text: 15px, lineHeight 1.8 (NOT 13px — too small for kids)
- Small labels: 11-12px
- Badges/pills: 10px

---

## Supabase Project

- **Project ref:** `sibprjxhbxahouejygeu`
- **Branch:** development
- **Key tables:**
  - `subjects` — learning subjects (Mathématiques, etc.)
  - `learning_categories` — groups topics within a subject
  - `topics` — individual lesson topics, has `lesson_content JSONB`, `slug`, `curriculum_level_code`, `curriculum_country_code`, `curriculum_subject_id`
  - `videos` — YouTube/hosted videos linked to topics via `topic_id`
  - `quiz_banks` — quiz bank metadata (`id`, `title`, `shuffle`, etc.) — NO `questions` column
  - `quiz_bank_questions` — individual questions as rows (`bank_id`, `payload JSONB`, `position`) — **this is where questions live**
  - `quiz_bank_assignments` — links banks to topics (`topic_id`, `bank_id`, `trigger_video_id`, `trigger_after_n_videos`, `display_context`)
  - `prompt_templates` — all AI prompts stored here (`usage_type`, `is_active`, `priority`, `prompt_content`, `tags`)
  - `exercise_explanations_cache` — cached AI explanations (`exercise_hash`, `explanation_data JSONB`, `usage_count`)
  - `user_learning_progress` — tracks video completions per user

### Critical DB rules
- **`quiz_banks` has NO `questions` column.** Always query `quiz_bank_questions` table for questions: `.from('quiz_bank_questions').select('payload, position').eq('bank_id', bankId).order('position')`
- **`topics.lesson_content`** is JSONB with shape: `{ explanation: string, example: string, common_mistakes: string[], guided_practice: string[], exit_ticket: string[] }`
- **RLS is enabled.** Edge functions that query protected tables must use `SUPABASE_SERVICE_ROLE_KEY`, not the anon key.
- **`.in('column', [])` with empty arrays generates invalid SQL** — always guard with `if (ids.length > 0)` before calling `.in()`

---

## Key Hooks & Services

| Hook/Service | File | Purpose |
|---|---|---|
| `useCoursePlaylist(topicSlug)` | `src/hooks/useCoursePlaylist.ts` | Fetches topic + filtered videos. Returns `{ data: { topic, videos }, isLoading }`. topic includes `lesson_content`. |
| `useAllBanks(topicId, playingVideoId, completedVideoIds, userId)` | `src/hooks/useQuizBank.ts` | Returns all quiz banks for a topic with unlock status. Each bank: `{ bankId, topicId, triggerVideoId, isUnlocked, displayContext }` |
| `useLearningSubjects()` | `src/hooks/useLearningSubjects.ts` | Returns subjects with `videos_ready` (counts both videos AND lesson content). Powers Leçons tab. |
| `useSubjectDashboard(subjectSlug)` | `src/hooks/useSubjectDashboard.ts` | Returns subject + topics list for SubjectDashboardPage |
| `useAuth()` | `src/context/AuthContext` | Returns `{ user }` |
| `useLanguage()` | `src/context/SimpleLanguageContext` | Returns `{ t, language }` |
| `generateSystemMessage(...)` | `supabase/functions/ai-chat/utils/systemPrompts.ts` | Loads prompt from `prompt_templates` table and substitutes `{{variables}}` |

---

## Key Components

| Component | File | Purpose |
|---|---|---|
| `VideoPlayerBox` | `src/components/learning/VideoPlayerBox.tsx` | Renders YouTube or hosted video. Props: `videoId: string \| null`, `onVideoEnd?: () => void`, `autoPlay?: boolean` |
| `QuestionCard` | `src/components/learning/QuestionCard.tsx` | Renders any question type. Props: `question: Question`, `onChange?: (v: any) => void`, `submittedAnswer?: any`, `isCorrect?: boolean` |
| `QuizOverlay` | `src/components/learning/QuizOverlay.tsx` | Full-screen quiz session (z-index 200). Takes a pre-assembled bank object with questions array. |
| `LessonStepper` | `src/components/learning/LessonStepper.tsx` | 5-step adaptive lesson (concept → quiz → example → mistakes → complete) |
| `LessonPage` | `src/pages/learning/LessonPage.tsx` | Adaptive lesson page — video section if videos exist, always shows LessonStepper |
| `PageMeta` | `src/components/seo/PageMeta.tsx` | SEO meta tags. Props: `title: string`, `description: string` |

---

## Routing

```
/                          → Home
/learning                  → LearningPage (Leçons tab — subject grid)
/learning/:subjectSlug     → SubjectDashboardPage (topic list)
/learning/:subjectSlug/:topicSlug → LessonPage (NEW — adaptive lesson)
/practice/:subjectSlug     → PracticeSubjectPage (S'exercer tab)
/tutor                     → Tuteur AI chat page
/account                   → Account/profile page
```

All routes use React `lazy()` imports in `src/App.tsx`.

---

## Question Types (9 total)

All defined in `src/types/quiz-bank.ts` as a union type `Question`:

```typescript
type Question = SingleQ | MultiQ | NumericQ | OrderingQ | VisualQ |
                OperationPoseeQ | SliderQuestion | MatchQuestion | FillExprQuestion
```

- `single` — one correct answer from 4 choices
- `multi` — multiple correct answers from 4 choices
- `numeric` — type a number (supports fractions)
- `ordering` — drag items into correct sequence
- `visual` — pie chart fraction interaction or angle measurement
- `operation-posee` — column arithmetic with manipulable digits
- `slider` — drag to a value on a range
- `match` — connect left column to right column pairs
- `fill-expr` — drag number chips into blank positions in a formula

**Correct answers are NEVER revealed on wrong submissions.** This is a confirmed product rule.

---

## AI Prompt System

All prompts are stored in the `prompt_templates` Supabase table.
Variable substitution uses `{{variable_name}}` syntax.
The `generateSystemMessage()` function in `supabase/functions/ai-chat/utils/systemPrompts.ts`
loads the active prompt by `usage_type` and substitutes variables.

### Key usage_types
- `chat` — Tuteur general chat (StudyWhiz persona)
- `explanation` — Two-card adaptive explanation (ADAPTIVE_TWOCARD_PROMPT in useTwoCardTeaching)
- `lesson_generation` — Batch lesson content generation (should be in prompt_templates, not hardcoded)

### Standard prompt variables
```
{{curriculum}}        — "Programme Éducation Nationale française — Cycle 3, CM1 (9-10 ans)"
{{grade_level}}       — "CM1"
{{age_group}}         — "9-10 ans"
{{word_budget}}       — "40-60" (words for explanation)
{{country}}           — "France"
{{response_language}} — "français" or "English"
{{learning_style}}    — "visual" | "auditory" | "kinesthetic" | "mixed"
{{subject}}           — "Mathématiques"
{{topic_name}}        — "Fractions"
{{topic_description}} — topic description text
{{learning_objectives}} — comma-separated objective texts
```

---

## Explanation Caching

`useTwoCardTeaching` hook (`src/features/explanations/useTwoCardTeaching.ts`):
1. Builds a cache hash from: `exercise + language + grade_level + learning_style + version`
2. Checks `exercise_explanations_cache` table BEFORE calling AI
3. On cache miss: calls AI → saves to cache → returns result
4. On cache hit: returns immediately from DB (no AI call)

Cache table: `exercise_explanations_cache` with columns:
`exercise_hash (unique), exercise_content, explanation_data JSONB, usage_count, subject_id`

---

## Lesson Generation Edge Function

File: `supabase/functions/generate-lesson-content/index.ts`

- Uses `SUPABASE_SERVICE_ROLE_KEY` for DB queries (RLS bypass)
- Fetches topic with `curriculum_level_code` and `curriculum_country_code`
- Maps level codes to age groups and word budgets
- Prompt should be loaded from `prompt_templates` table (usage_type: `lesson_generation`)
- Calls `ai-chat` edge function for content generation
- Saves result to `topics.lesson_content`

---

## Architecture Decisions (confirmed, do not reverse)

1. **Leçons tab is lesson-first, video-optional.** Topics without videos still show a full lesson. Videos are enrichment, not a prerequisite.
2. **3-tab layout (CoursePlaylistPage) is deprecated.** `LessonPage` replaces it at the `:subjectSlug/:topicSlug` route.
3. **Correct answers are never revealed on wrong submissions** in any quiz context.
4. **All prompts belong in `prompt_templates` table**, not hardcoded in edge functions.
5. **Quiz questions are in `quiz_bank_questions` table** (not `quiz_banks`). Always use `.from('quiz_bank_questions').select('payload, position').eq('bank_id', id).order('position')` to fetch them.
6. **`useLearningSubjects` uses `curriculum_subject_id`** (UUID match) to find topics, not the `!inner` join chain on `learning_categories`. This is intentional — the join chain is unreliable.
7. **`.in('col', [])` with empty arrays generates invalid SQL** — always guard.

---

## Current State (what's built and working)

### ✅ Working
- Quiz system: `QuizOverlay` + `QuestionCard` with all 9 question types
- S'exercer / Practice flow
- Tuteur AI chat with StudyWhiz prompt
- Explanation caching (useTwoCardTeaching reads from DB before calling AI)
- Lesson generation edge function (fixed RLS, fixed FK joins, age-appropriate prompt)
- Lesson generation prompt loaded from `prompt_templates` table (curriculum-aware, age-adaptive)
- Leçons tab showing subjects with lesson content (useLearningSubjects fixed)
- LessonPage + LessonStepper (adaptive, video-optional, 5-step)
- Lesson completion tracking (`user_learning_progress`, XP toast, deduplication)
- SubjectDashboardPage redesigned with lesson availability + completion state
- LearningPage subject cards show lesson progress
- Historique page shows lesson completions
- Account tab shows real XP stats + level
- BulkLessonGenerator admin component

### 🔲 Pending / Next
- Generate lesson content for all CM1 topics (admin task, use BulkLessonGenerator)
- Video production (content task, not code)
- Student onboarding flow (set level + learning style on first login)

---

## Common Patterns

### Fetch topic by slug
```typescript
const { data: topic } = await supabase
  .from('topics')
  .select('id, name, slug, description, lesson_content, curriculum_level_code, curriculum_country_code')
  .eq('slug', topicSlug)
  .single();
```

### Fetch questions from a quiz bank
```typescript
const { data: rows } = await supabase
  .from('quiz_bank_questions')
  .select('payload, position')
  .eq('bank_id', bankId)
  .order('position');
const questions = (rows ?? []).map(r => r.payload as unknown as Question);
```

### Fetch quiz bank assignment for a topic (no video trigger)
```typescript
const { data: assignments } = await supabase
  .from('quiz_bank_assignments')
  .select('bank_id')
  .eq('topic_id', topicId)
  .is('trigger_video_id', null)
  .limit(1);
```

### Navigate to a topic lesson
```typescript
navigate(`/learning/${subjectSlug}/${topic.slug}`);
```

### Navigate to S'exercer with a specific quiz bank
```typescript
navigate(`/practice/${subjectSlug}?quiz=${bankId}`);
```

---

## Edge Function Deployment

```bash
npx supabase functions deploy <function-name> --project-ref sibprjxhbxahouejygeu
```

Functions: `ai-chat`, `generate-lesson-content`, `generate-quiz-from-topics`
