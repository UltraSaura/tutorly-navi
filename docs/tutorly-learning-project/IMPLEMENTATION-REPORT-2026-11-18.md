# Guided exercise families and Brilliant preparation

Date: 18 November 2026. Branch: `feature/guided-practice-lessons`.

## Delivered activities

| Reusable type | Practice route | Reference recording | Tutorly interaction |
| --- | --- | --- | --- |
| Guided word problem | `/practice/guided/word-problems` | `Screen Recording 2026-11-10 at 23.39.25.mp4` | Read an original generated story, select addition/subtraction, manipulate objects, choose a result, retry while keeping correct work. “I'm not sure” opens method support. |
| Equal groups | `/practice/guided/equal-groups` | `Screen Recording 2026-11-11 at 00.01.04 (1).mov` | Add equal groups, connect repeated addition with multiplication, then select the total. |
| Colour grid | `/practice/guided/colour-grid` | `Screen Recording 2026-11-10 at 21.43.15.mov` | Count the requested colour in a configurable grid, optionally mark cells, and select the count. Letters provide an additional colour cue. |

The existing recording notes were the evidence source. This work did not conduct a new frame-by-frame video audit. The colour-grid prompt/marking/answer flow is an original conservative Tutorly design: the reference notes do not establish its full rules. No reference branding, code, illustrations, animation files or audio were copied.

All three are reusable question types, not hardcoded fixed-number lessons. The admin quiz-bank question editor configures quantities, operations, objects, groups, grid dimensions/colours, target colour and points. Prompts are regenerated from parameters so editing a number cannot leave a stale story. The same `QuestionCard` bridge renders the payload in quiz-bank practice and existing lesson surfaces that consume bank questions. This does not introduce a new LessonV2 block schema or an AI generation endpoint.

## Behaviour and persistence

- One question at a time, four deterministic distinct choices, an explicit check, explanatory incorrect feedback, retry, and clear completion.
- Hints explain methods and operation meaning without the numerical answer. These families deliberately use generated method hints rather than arbitrary authored hint text.
- Correct operation/model work is preserved after an incorrect final answer. Corrective feedback and hints mark the solve as supported.
- Standalone Practice uses the existing attempt-penalty function; wrong intermediate operation choices and wrong final answers count, construction clicks do not.
- Quiz integration includes internal wrong attempts in the existing penalty calculation. Zero-point authoring is preserved for prerequisite use.
- Guided quizzes do not show the existing score-derived mastery badge. No new mastery policy or database was added.
- Standalone sessions use versioned learner-scoped localStorage. Reload restores construction, answer, attempts and support state. Completion is accepted only with a recorded attempt and a deterministically valid answer/model. Malformed stored exercises reset safely.
- Existing quiz-bank persistence stores payloads in `quiz_bank_questions.payload`; no migration is required. Existing quiz attempt details retain the supported/attempt/model state through `finalAnswer`. No production learner test data or admin content was written.

## Validation

| Check | Result |
| --- | --- |
| Focused models, restored-state rendering, existing counting renderer and quiz grading | 43 tests passed before final import-hardening test was added. |
| Full repository `npm run test:ci` | 130 files / 1,204 tests passed after fixing five missing arithmetic-control translation keys in both languages. |
| Integrated learner browser journeys | Three families at 375 px and 1280 px: actual Practice entry, hints, wrong response, retry, keyboard/touch, reduced motion, correct completion, reload persistence, next exercise. Six journeys passed without page runtime errors or horizontal page overflow. |
| Admin browser checks | All three types: change configuration, save callback, reopen, preserve zero points, and render via real QuestionCard. Passed using an isolated harness; no live admin writes. |
| Quiz browser checks | Wrong then correct awards the existing 50% second-attempt score; hinted first-answer success can earn 100% Practice points without a mastery claim. Both passed with synthetic local data and recording disabled. |
| Final targeted regressions | 25 tests passed, including four new QuestionCard registration/import-validation checks added after the full-suite run. |
| Reproducible browser suite | `PW_CHROMIUM_EXECUTABLE=/usr/bin/chromium PW_PORT=4180 npx playwright test e2e/guided-families.pw.ts`: 6 passed (desktop/mobile), including fixture network/resource health checks. |
| `npm run lint:ci` | Passed: zero new or changed violations; 1,035 errors and 108 warnings remain in the explicit legacy baseline. |
| `npm run typecheck` | Passed. |
| `npm run build` | Passed; existing bundle-size and mixed static/dynamic import warnings remain. |

The first full-suite run found a translation-coverage failure in the earlier local arithmetic controls. The translations were added and the full suite rerun successfully. Temporary browser harness provider/selector setup failures were corrected before reporting the passing integrated runs.

CI lint preserves the repository's explicit legacy baseline; passing CI lint does not mean the full legacy lint debt is gone. Build warnings concerning large chunks and static/dynamic Supabase imports remain. Browser checks use synthetic/guest data: signed-in learner switching, deployed backend triggers/RLS, screen-reader speech output and live curriculum mastery were not validated.

## Brilliant evaluation

Read the user's Google Doc, tab `t.0`, titled “Brilliant to Tutorly — Product Direction and Module Plan.” Its observations cover selected Variables/Coordinates paths, not a complete Brilliant audit.

The detailed evaluation and phased preparation are in [BRILLIANT-IMPLEMENTATION-PLAN.md](BRILLIANT-IMPLEMENTATION-PLAN.md). Reuse Tutorly's lesson players, QuestionCard, deterministic validators, number line, quiz banks and progress services. Prioritize a thin feedback/evidence adapter, correct-substep preservation and independent transfer checks; avoid a replacement course system or another mastery database.

Recommended sequence: equal-groups feedback pilot → existing number line → positive-quadrant coordinate plane → shared evidence/mastery policy → independent transfer/review → Tutor handoff. CoordinatePlane, a recommendation algorithm, and the wider Brilliant runtime are prepared as a plan, not claimed as implemented here.

## Remaining assumptions and follow-up

- Current visual-authoring bounds are 0–100 starting objects with positive change and a nonnegative result up to 100; equal groups 1–10 by 1–10; colour grids up to 8×8. These are readability limits for this implementation, not reference-product rules or separate school-level exercise types.
- Initial placement recommendation: counting/colour grids in early numeracy, addition/subtraction word problems in CP–CE1, equal-group multiplication from CE1. These recommendations need formal curriculum-objective mapping and teacher review before publication as graded curriculum content.
- Global admin/bank school-level assignments remain the existing configuration. Standalone activities are supplementary practice; they do not invent a topic/objective ID or certify mastery.
- Live schema constraints and backend triggers were not audited. Any future supported/independent mastery persistence change requires a concrete schema and RLS proposal first.
- AI may later generate these validated payloads, but no new AI authoring pipeline was added.
- User visual review is still required. Delivery is on the feature branch; it is not automatically included in `main`, `development`, or `practice`.

## Principal source files

- `src/features/practice/guidedFamilies.ts` and tests: content contract, validation, original prompt templates, choices and deterministic correctness.
- `src/components/practice/GuidedFamilyActivity.tsx` and tests: shared learner renderer and resume validation.
- `src/pages/practice/GuidedFamiliesPracticePage.tsx`, `PracticePage.tsx`, `App.tsx`: entry points, local persistence and scored completion.
- `src/components/admin/learning/GuidedFamilyEditor.tsx`, `QuestionEditor.tsx`: authoring and final-payload validation.
- `src/types/quiz-bank.ts`, `QuestionCard.tsx`, `QuizOverlay.tsx`, `src/utils/quizEvaluation.ts`: existing quiz/lesson registration, grading and mastery-claim guard.
- `e2e/guided-families.pw.ts`: reproducible synthetic learner journeys for desktop and mobile.

Earlier uncommitted arithmetic-display, clock, and source-link documentation work in the same feature checkout was preserved. Its presence here does not imply those changes have been merged into the other branches.

## Vercel direct-link correction

A live request after delivery found the preview root returning 200 while `/practice` returned Vercel `404 NOT_FOUND`. The Vite preview server used by local browser tests already supplied a history fallback, so those tests did not establish hosted deep-link support. Added `vercel.json` with filesystem-first routing and an SPA entry-page fallback. Real files retain priority; app URLs are interpreted by React Router after loading `index.html`. The correction is verified against the hosted page and nested activity URLs, not inferred from local preview behavior.
