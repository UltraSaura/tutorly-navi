# Evidence and verification log

Updated 2026-11-11. Evidence is labeled as source observation, supplied-recording notes, or local verification. The original recordings are not in the Cloud workspace; no claim is made that they were watched here.

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

**Observed for Add up to 100:** Countable dots grouped by ten; a control to add tens and single units; identify three groups of ten; 30 + 30 = 60; 60 + 7 = 67; 67 + 33 = 100; a later 45 + 7 prompt; a recall/check phase followed by a guided path that asks whether the student is familiar and offers to start from the beginning.

**Observed for flashcards:** One arithmetic question card at a time, with sampled addition/subtraction within ten and make-ten blanks; one recording shows numeric selection and another a spoken-answer affordance. A timed assessment, race presentation, and 9/10 result are also noted, but exact timer, timeout/error behavior, score criteria, race mechanics, and mastery rules are explicitly unknown. The written note describes ten progress indicators in one run; it does not establish a general deck size.

**Unknown:** Complete prompt sequences, answer branching, wrong-answer policy, timing, retry limits, scoring thresholds, mastery criteria, and cross-device persistence. No values are inferred from the unverified inspection report.

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
