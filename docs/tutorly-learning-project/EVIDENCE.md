# Evidence and verification log

Updated 2026-11-13. Evidence is labeled as source observation, supplied-recording notes, or local verification. The recordings supplied in this conversation were reviewed from sampled key frames and visible on-screen text; this was not a frame-by-frame review. The attachment files are available in the task workspace but are not checked into the repository.

## Repository and product observations

- `git fetch origin` showed `practice` at `cf8d3348072075d70abe9c4caa4ca36283ab6fc6`. The feature ref later advanced to `35ac0a1557b1bfde79819ef945f7d22b6b043b2e` with four documentation commits. Those commits were applied individually on the existing feature branch; no branch was created, and no rebase, merge, or reset was used.
- `src/App.tsx` nests `/practice` in `MainLayout`; existing focused activities include `/practice/number-line`.
- `src/pages/practice/PracticePage.tsx` is the Practice hub. Practice subject pages use active school-level and learning data. The new lesson and flashcard routes are added as Practice children.
- Learn is routed through `/learning` and topic/subject routes. `UnifiedDashboard` offers roadmap, grades, and skills tabs; roadmap uses `LearningRoadmap`.
- `useUserSchoolLevel` reads user/child grade and maps it to age/range. The standalone Add up to 100 activity has no level-specific variant; its copy explains tens through the dot model and does not require age-specific vocabulary.
- `user_learning_progress` was introduced in `supabase/migrations/20251030112101_068dfc6f-02be-4c57-9dae-598954a38f4a.sql` with RLS restricting reads/inserts/updates to `auth.uid() = user_id`; `progress_type` is constrained there to `video_started`, `video_completed`, `quiz_attempted`, and `quiz_passed`. Dashboard progress inspected in `UnifiedDashboard.tsx` derives topic completion from video-completed rows.
- Existing `useLessonResume` and `useLessonLevelProgress` use `learnerStorageKey` for local resume, and also write lesson-specific progress rows. Their topic-keyed server path is not a fit for a standalone lesson without a real topic identity. The source snapshot does not prove deployed database constraints are identical; no live schema was queried or changed.
- Repository search found no existing flashcard page/data component. Existing Practice does have one-item-at-a-time training sessions, but their schema and flow are not flashcards.
- `useUserSchoolLevel` exposes grade/age data. The new activities use simple concrete language and visible quantities; they currently do not branch copy or difficulty by a learner's grade. That limitation should be revisited before adding broader content.

## Supplied Synthesis recording notes

Source: `references/development-instructions.md`, the checked-in evidence log. The note package says the original recording media is not stored in the repo. These are transcribed observations from the project evidence package, not observations made by this implementation run.

**Observed for Add up to 100:** The recall/check first asks the learner to tap + three times to add three tens, then identify the amount; feedback confirms 30. It continues with 30 + 30 = 60, 60 + 7 = 67, the amount needed to add to 67 to reach 100 (33), and 45 + 7. The 45 + 7 prompt is still in the recall/check, before its reward/check card and the later guided path. The guided path asks if the learner is familiar; the selected No branch offers a start from the beginning, then shows two groups of ten and asks their value with answer choices and “I’m not sure.” The recording ends during this first guided prompt.

**Observed for flashcards:** One arithmetic question card at a time, with sampled addition/subtraction within ten and make-ten blanks. One recording shows a mic and “Tap the mic to speak”; another shows a selected answer beneath a prompt, but the exact answer-input method is not established. Timed assessment and race screens are visible; one run has ten progress indicators, and one Subtract to 10 run reports 9/10. These do not establish a general deck size, score threshold, win rule, timing policy, speech recognition behavior, or mastery criteria.

**Unknown:** Complete prompt sequences, answer branching, wrong-answer policy, timing, retry limits, scoring thresholds, mastery criteria, and cross-device persistence. No values are inferred from the unverified inspection report.

## Follow-up recording review and implementation (2026-11-13)

- The video notes in `references/development-instructions.md` were checked against all 11 supplied recordings using sampled key frames. Prompt wording was taken from readable screen text. Repeated or illegible frames were not used to infer missing rules.
- Tutorly's implementation is a reusable counting activity type, not an attempt to recreate the source lesson sequence. `CountingExercise` stores an object key, starting groups and ones, groups to add, and answer choices; its validator checks the generated/authored data before rendering. A shared model supports pencils, apples, books, and stars. Admins can author this as a quiz-bank question or choose it in the AI topic generator; generated totals are validated and choices are derived by Tutorly. Lesson prerequisite checks remain score-free, while Practice uses existing point and retry scoring.
- Current starter examples stay small to keep the task readable. One tap adds one group of ten, then four choices ask for the total. Prompt, visual model, answer labels, and feedback use the same exercise data. Hint, incorrect-answer feedback, retry, completion, and learner-scoped local resume are included; no mastery is awarded.
- The previous screen's long “4 bundles and 4 singles; tap +5 times” prompt was user feedback that the example felt confusing and too specific. It is replaced with a short starting count and group-add instruction. The exercise type can later be populated with other counts and objects without changing the renderer.
- The reference guided path's familiarity Yes/No branch was observed, but only the No outcome and first prompt are visible. Tutorly does not claim to reproduce the unseen Yes branch or later guided steps.
- The existing Tutorly flashcards remain an original, untimed one-card-at-a-time practice mode. The recordings do not establish enough about timer, answer capture, race progress, scoring, or mastery to add those behaviors without inventing rules.
- **Subtract Within 10 implementation:** the 21.07.52 recording shows the learner adding bubbles to reach 8, using the lightning control to remove 5, identifying `8 − 5`, and then solving it. Tutorly’s separate reusable subtraction type now scatters bubbles or other countable objects (pencils, apples, books, stars) across the model area. It is categorized as CP foundation / CE1 review, not as the larger-number written subtraction category. The source does not establish timer, scoring, mastery, or complete error behavior.
- The other recordings document Color Count, The Next 10, Add Across 10, word problems, an analog clock, and multiplication. Their sampled flows and open questions remain in the reference log; the Add Across 10 activity remains a separate content type.

## Addition across ten: CE1

- **Video:** `Screen Recording 2026-11-10 at 23.37.03-compressed.mp4` (1:56). The evidence notes in `references/development-instructions.md` describe square tiles built from unit cells, a visible challenge based on `4 + 7`, and answer choices. The recording does not establish the full exercise sequence or error/scoring rules.
- **Official curriculum evidence:** [Cycle 2 programme, Bulletin officiel n° 41 (31 October 2024)](https://www.education.gouv.fr/sites/default/files/document/Bulletin%20officiel%20n%C2%B0%2041%20du%2031%20octobre%202024-404808.pdf). The CP section explicitly teaches reaching a ten (example `47 + 8` via `+3` then `+5`); CE1 reuses and automates such CP procedures and extends mental calculation to numbers/results through 1000. This supports a CE1 review/fluency category, not a claim that the strategy is first introduced in CE1.
- **Classification:** CE1 → Maths → Nombres et calcul → calcul mental → franchir la dizaine. Tutorly can retain “addition en ligne” as an additional product category, but it is not the official programme heading. It is separate from column addition and from counting grouped objects.
- **Implemented:** a distinct `addition-across-ten` quiz-bank kind and a Practice activity. Students move individual counters into a ten-frame, then choose the total. The activity creates varied numbers rather than replaying the source video’s prompts. Existing quiz-bank JSON payload supports the kind without a schema change. Local progress is learner-scoped; the Practice points follow existing retry scoring, with no timer or mastery award.
- **Deployment boundary:** admin question authoring is in the frontend change. The AI topic generator’s validator/instructions are updated in the Edge Function source; that function was not deployed.
- **Verification:** `npm run test:ci` passed all 121 files / 1,144 tests; `npm run typecheck`, `npm run build`, and the two-viewport browser journey passed. The browser run used desktop 1280×900 and mobile 390×844, enabled reduced motion, checked the first action is visible above the mobile bottom navigation without scrolling, and exercised hint, keyboard/touch input, incorrect feedback, retry scoring, completion, and learner-scoped resume after reload. No learner/backend data was written.
- **Lint:** focused ESLint passed for the new model, exercise contract/tests, Practice page, and E2E files. Focused lint across all modified legacy files reports existing `no-explicit-any` violations in the broader quiz/admin/evaluation/Edge Function files; the repository already has substantial recorded lint debt. The changed files also pass with those existing `no-explicit-any` diagnostics and the existing React hook dependency lint rule disabled. No new lint errors were introduced in the new standalone files.
- **Build warnings:** existing mixed static/dynamic Supabase import and oversized chunk warnings remain. The updated AI topic generator is source-only and was not deployed.

## Subtraction within ten with scattered objects

- **Source video:** `Screen Recording 2026-11-10 at 21.07.52-compressed.mp4` (2:38). It demonstrates reaching 8 dots with +, removing 5 with the lightning control, choosing the matching equation, and answering the subtraction. It does not establish the full lesson sequence or scoring rules.
- **Classification:** CP foundation → mental subtraction within ten, used as CE1 review/fluency. This concrete counter activity is not the same category as written/line subtraction with larger numbers.
- **Implemented:** a dedicated scattered-object model and Practice route. The + button adds one object per tap. Only after reaching the requested count does a minus button appear; it removes one object per tap. The objects vary between exercises and include bubbles, pencils, apples, books, and stars. Students then identify the subtraction and choose the result. Admins can select the object in the quiz-bank editor and preview; AI generator source supports the optional object field. Existing bubble-only data remains valid, with no schema change. Learner progress resumes locally; no mastery is awarded.
- **Unknown:** complete source sequence, later difference representation, error handling, score/timer behavior, and mastery remain unknown. The values, points and two answer stages are Tutorly choices.
- **Verification:** `npm run test:ci` passed (123 files / 1,156 tests); `npm run typecheck`, `npm run build`, focused ESLint on the new lesson files, `git diff --check`, and the desktop/mobile subtraction browser journey passed. Full `npm run lint` reports 1,040 errors and 108 warnings both on this work and on a clean worktree at the starting commit (`f2680d8b`), so those findings predate this correction. No production learner data was used.

### Current verification

- Focused subtraction contract, scattered model, quiz-bank renderer, and evaluator tests: passed, 4 files / 30 tests.
- `npm run typecheck`: passed. `npm run build`: passed with existing mixed Supabase import and chunk-size warnings.
- Focused ESLint on new practice code and browser journey: passed. Full `npm run lint`: 1,040 errors / 108 warnings, identical to a clean worktree at the starting commit.
- `npm run test:ci`: passed, 123 files / 1,156 tests. The desktop and mobile subtraction browser journey also passed with reduced motion enabled; touch, keyboard, object changes, hints, incorrect answers, retries, completion, and saved progress were exercised.
- Correct subtraction answers now reuse Tutorly Practice’s rising green “Good job” feedback, both after choosing the matching equation and after choosing the final answer. A brief confetti burst appears on final completion when motion is allowed; it is omitted for reduced-motion users. Focused subtraction browser checks passed in desktop and mobile modes.
- Countable objects now have varied, stable colors. Admins can optionally enable “Ask how many objects of one color remain” on a subtraction quiz-bank question; the stored JSON question property controls the learner prompt, preview, choices, and score. This uses the existing quiz-bank payload and requires no database migration. Focused color rendering, learner rendering, and scoring tests pass.
- Color-counting follow-up verification: `npm run test:ci` passed all 123 files / 1,160 tests; `npm run typecheck` and `npm run build` passed; focused ESLint passed on the added code and on changed legacy files with their pre-existing `no-explicit-any` lint rule suppressed. `git diff --check` passed. Build output retains the repository’s existing Supabase import and large chunk warnings.
- Learner answer reveal fix: the live subtraction model no longer prints the remaining total or color subtotal before a correct response; screen readers receive individually labeled objects to count instead. Desktop and mobile Playwright journeys confirmed the prompt does not disclose the answer before selection, then confirmed the correct answer completion path still works.
- Subtraction hints now identify “taking away” as subtraction and cue the learner to look for a minus sign, then count the objects still showing. Color-count quiz hints additionally direct students to count only the named color. Hints omit the exercise quantities and answer; the desktop/mobile Playwright check asserts this wording.
- Removed learner-facing object totals, taken-away counts, and the repeated added/taken-away tally before response selection. Students can still see and count every object and cross; admins retain the answer details in quiz preview. Desktop/mobile Playwright checks confirm the object marks remain and the numeric labels stay hidden through the answer steps.
- `npm run typecheck`: passed. Focused ESLint on changed source and journey files passed; `git diff --check`: passed.
- Chromium journey passed at desktop 1280×900 and mobile 390×844. It exercised the reusable count model, hint, keyboard activation, saved progress after reload, touch taps on mobile, answer choices, incorrect feedback, retry, completion, and starting another variable-object exercise. Mobile had no horizontal overflow or bottom-navigation overlap. Reduced-motion preference was enabled. No backend or production learner data was used.
- Visual review screenshots are local artifacts under `/tmp/counting-exercise-desktop.png` and `/tmp/counting-exercise-mobile.png`.

## Local verification

Baseline before feature implementation (on the clean `cf8d334` checkout):

- `npm test -- --run`: passed, 112 files / 1,107 tests.
- `npm run build`: passed; existing unresolved `/fonts/SF-Pro-Display-*.woff2`, stale Browserslist data, mixed Supabase import, and chunk-size warnings were printed.
- `npm run lint`: failed on repository-wide existing violations (1,065 errors / 108 warnings at that run, including numerous `no-explicit-any`, regex escaping, and `prefer-const` errors).
- `npx tsc --noEmit -p tsconfig.app.json`: failed in existing unrelated admin, guardian, lesson-theme, and test files; see task run output. The package has no `typecheck` script.

After the first lesson slice (before recall path and flashcards were added):

- Focused ESLint on then-changed source files passed.
- Full suite passed, 113 files / 1,109 tests.
- Build passed with the same class of warnings.
- TypeScript check reported the same set of pre-existing unrelated errors and none in the then-new lesson files.
- Chromium showed `/practice/add-up-to-100` at 1280×900 and 390×844. In the lesson route, the initial prompt, wrong-answer feedback, retry, keyboard Enter, touch tap, local checkpoint reload, full five-step guided completion, and restored completion passed in an ephemeral browser context with no learner/backend writes. `prefers-reduced-motion: reduce` was enabled; this lesson uses no animation.
- The first `/practice` probe looked blocked because it checked before the application's five-second auth restore timeout had elapsed. A later browser run waited for auth restoration to fall back to signed-out mode, then entered both lessons through their real `/practice` cards. The Cloud proxy logged `ERR_TUNNEL_CONNECTION_FAILED` for remote Supabase/auth resources; no learner session was available. The journey was verified in the public signed-out app using an ephemeral browser context and guest local storage, not a curriculum-level signed-in student fixture.

Final UI verification after the recall path, flashcards, second lesson, scroll reset, and shared dot-model work:

- Actual Practice entry -> Add up to 100: recall path, hint, wrong-answer retry, recall finish, guided start from beginning, save at step 2, return to Practice, resume saved model at 60, complete remaining steps, and restore completion after reload. Keyboard and touch were exercised with reduced motion enabled. No browser runtime errors.
- Actual Practice entry -> Number flashcards: blank input error, wrong answer and targeted retry, Enter-key submit, one card at a time, resume on card 2 after reload, all ten cards, and restored completion. No timer or score is displayed. No browser runtime errors.
- Actual Practice entry -> Numbers after ten: shared ten-and-ones dot model, one/ two/ five individual-dot construction, feedback, next step, and completion. No browser runtime errors.
- Desktop 1280×900 and mobile 390×844 were inspected. No horizontal overflow. Both new activity routes scroll to top when entered from a lower Practice card. Reduced motion was enabled; there are no decorative/state animations.
- Final screenshots were captured outside the repository: `/tmp/add100-mobile-settled.png`, `/tmp/flashcards-mobile-final.png`, `/tmp/numbers-after-ten-mobile.png`. These are local review artifacts, not committed deliverables.

No signed-in student fixture or live backend persistence was tested. All progress checks used learner-scoped guest localStorage in disposable browser contexts; no production learner test data was written.

## Final verification (2026-11-11)

- `npm test -- --run`: passed, 116 test files / 1,114 tests.
- Focused practice suite (`addUpTo100`, `flashcardPractice`, `numbersAfterTen`, `CountableDotModel`): passed, 4 files / 7 tests.
- Targeted ESLint on all changed application and test files: passed.
- `npm run build`: passed. Existing warnings include unresolved font asset references, Browserslist data age, mixed Supabase imports, and large chunks.
- `npm run lint`: failed with 1,065 errors and 108 warnings across the repository. The clean-branch baseline had the same repository-wide lint debt; targeted ESLint for this feature passed.
- `npx tsc --noEmit -p tsconfig.app.json`: failed on the same unrelated baseline diagnostics in BulkLessonGenerator, generationErrorMapping, EditChildDialog, lessonThemes tests, GuardianChildren, LessonThemePage, lessonVersionWorkflow tests, and stagingHealthcheck tests. No diagnostics pointed to the new lesson/flashcard files in the captured output.
- `git diff --check`: passed before final docs edits; rerun before commit.
- Browser: Chromium guest-context journeys through the real Practice cards passed for the guided lesson, number flashcards, and Numbers after ten. Desktop 1280×900 and mobile 390×844 were reviewed; keyboard, touch, hint, invalid/wrong input, retries, completion, local resume/reload, and reduced-motion preference were exercised. No horizontal overflow or page runtime errors were reported. The environment had no signed-in learner session because remote auth calls failed through the Cloud proxy; these runs used disposable local guest state only.
- Visual review captures are local `/tmp` artifacts: `add100-mobile-settled.png`, `flashcards-mobile-final.png`, and `numbers-after-ten-mobile.png`.
