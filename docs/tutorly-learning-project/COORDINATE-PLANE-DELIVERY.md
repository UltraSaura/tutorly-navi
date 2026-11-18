# Coordinate plane v1 and curriculum-scoped authoring — 18 November 2026

Branch: `feature/guided-practice-lessons`. Starting commit `a213667d698a971012e000cb07d9d7bdd269270f`, fetched and verified before edits. The initial working tree was clean; work resumed without discarding the coordinate files created earlier in the task.

## Curriculum mapping and source

- **Country:** France (`fr`). **School level:** cinquième (`5eme`) only.
- **Category:** Maths → Espace et géométrie → Repérage dans le plan. Numeric ordered pairs are not an elementary A3 grid-cell activity.
- **Official reference:** [BO n°10, 5 March 2026, MENE2602912A](https://www.education.gouv.fr/bo/2026/Hebdo10/MENE2602912A), applicable in 5e from the 2026–27 school year. [Maths Cycle 4 annex](https://www.education.gouv.fr/sites/default/files/document/Annexe%202%20%E2%80%93%20Programme%20de%20math%C3%A9matiques%20pour%20le%20cycle%204-480716.pdf), Cinquième → Repérage sur une droite et dans le plan, explicitly includes reading coordinates and plotting a point in an orthogonal coordinate system.
- This first version uses integer coordinates at or above zero, with axis limits 1–8. This is a focused Tutorly introductory subset and a readability bound, not an official restriction of the full 5e objective. No automatic availability in primary school, 6e, higher years, or other countries is inferred.
- Learning-flow reference: the previously reviewed [Brilliant product-direction analysis](https://docs.google.com/document/d/1XCmQzet8PW1KkxUApTdAUxy19e_xPuZsaMwuLQ1LgJY/edit). There is no matching supplied Synthesis video for this new interactive tool. Original SVG, copy and interactions were written for Tutorly; no reference branding/assets/code were copied.

## Learner behavior

Practice → “Coordonnées dans le plan” offers reading a marked point or plotting a given pair. It shows one task and one graph, with an origin, numbered axes and x/y fields. Plotting supports tapping/clicking the grid; numeric fields and increment/decrement buttons provide keyboard/touch alternatives.

The agreed Tutorly policy applies: first unsuccessful submission gives neutral feedback, Retry preserves editable input, and the second unsuccessful submission offers opt-in guidance. Help is available from the start. Accepted guidance confirms correct axes from the frozen checked work and supplies a method without target values. Closing help or clearing work does not erase attempts/help use. Completion distinguishes supported from unaided success. After a supported solve, a separate fresh point changes both coordinates; the original result remains separate. Points use the existing retry-penalty helper. Opening or manipulating the graph is not completion or mastery.

The point label is placed below points at the top boundary to avoid colliding with the y-axis label. Read-mode accessible text does not disclose the coordinate pair; plot-mode gives the pair because it is the question.

## Availability and clean admin organization

`exerciseCurriculum.ts` is the central mapping for this new type. The learner gate reuses the current profile/level hooks and existing authorized admin-preview convention. Country is never inferred from interface language. Missing, conflicting or unsupported profile metadata fails closed. The same check protects the Practice card, direct `/practice/coordinates` URL and bank-question renderer; a direct URL does not bypass level restrictions. Changing learner/country/level resets the exercise component scope.

Admin → Learning Content → Quiz Banks uses existing topics, categories, bank assignments and JSON question payloads. The new type is “Coordonnées dans le plan · France · 5ème.” Creation requires every relevant bank topic to be French 5ème, with a Maths subject and geometry/space/repérage category. Mixed-level, missing, wrong-country and wrong-subject/category contexts are rejected. Explicit bank school levels must also agree. The question editor, bank save, assignment save and topic-generator save paths check the mapping. In unqualified contexts the new option is disabled. Attach the bank to a correctly mapped curriculum topic first; no separate catalogue or duplicate course hierarchy was added.

Authors configure read/plot mode, axis limits, target coordinates and existing question points, including zero-point prerequisite questions. The school level is fixed by this mapped type, not guessed from the chosen numbers. Prompts are regenerated from the final parameters so a changed target cannot leave stale instructions. Existing malformed imported geometry produces a configuration alert; manual reset is explicit.

This is the first registered type in this curriculum gate. Older exercise families have not been silently reclassified or hidden; each needs its own parameter/grade review before extending the same policy. AI generation itself is unchanged: coordinate questions can be manually configured in eligible existing editors, but no new provider-generation pipeline was invented.

## Data and progress boundaries

No migration, new table, RLS change, live account modification or production learner test data. The existing `quiz_bank_questions.payload` JSON holds the reusable type, country and allowed school levels. The existing quiz grading and attempt details receive x/y, attempts, supported and complete state; the new type is excluded from the score-derived mastery badge. Analytics allowlists were not expanded and no analytics writes were enabled. The standalone supplementary page is an in-memory scored session and starts over on reload; account-wide progress/evidence integration remains the planned separate phase.

The school-level rules here are application visibility/authoring rules, not a replacement for database authorization. Live database constraints, RLS and signed-in production records were not audited or modified.

## Principal changed files

- `src/features/practice/coordinatePlane.ts`, `.test.ts`: payload validation, per-axis evaluation, generation and fresh point.
- `src/features/practice/exerciseCurriculum.ts`, `.test.ts`: official mapping, profile eligibility and strict authoring contexts.
- `src/hooks/useCoordinateEligibility.ts`: current learner, curriculum and authorized preview integration.
- `src/components/practice/CoordinatePlaneActivity.tsx`, `CoordinateQuestion.tsx`: shared interactive tool and level-gated question renderer.
- `src/pages/practice/CoordinatePlanePage.tsx`, `PracticePage.tsx`, `src/App.tsx`: entry, protected route, scored session and fresh check.
- `src/components/admin/learning/CoordinatePlaneEditor.tsx`, `QuestionEditor.tsx`, `BankManager.tsx`, `TopicQuizGenerator.tsx`: existing authoring flow and level/topic guards.
- `src/types/quiz-bank.ts`, `src/utils/quizEvaluation.ts`, `src/components/learning/QuestionCard.tsx`, `QuizOverlay.tsx`: reusable quiz/lesson registration, grading and mastery-claim guard.
- `src/components/learning/QuestionCard.coordinates.test.tsx`: renderer eligibility and invalid-import coverage.
- `e2e/coordinate-fixture.ts`, `coordinate-plane.pw.ts`, `fixtures.ts`: synthetic authenticated profile/admin transport, access gates, real SVG touch/click, learner flow and captured admin save. Cancelled reads from the explicitly mocked videos table are treated like other expected superseded queries.

## Validation

- Full unit suite: **137 files, 1,256 tests passed** (`npm run test:ci`).
- Typecheck and production build passed. Build retains existing chunk-size and mixed static/dynamic import warnings.
- Repository lint baseline check passed with no new/changed violations; the recorded legacy baseline remains 1,035 errors and 108 warnings.
- Desktop/mobile browser run covering coordinates, guided families and number-line feedback: **17 passed, 1 failed**. The failure was the network fixture rejecting cancelled synthetic profile reads during navigation, after the application assertions succeeded. After correcting that known-read allowlist, the affected desktop and mobile tests both passed (**2 passed**). All 18 distinct scenarios were therefore verified across these runs; a clean single full rerun is not claimed.
- Desktop and narrow-mobile screenshots were inspected. Browser tests exercised grid click/touch, keyboard inputs, neutral retries, optional guidance, completion, fresh practice, admin save and country/level restrictions. All account and bank traffic used intercepted synthetic fixtures, with no production writes.

Early runs found test-fixture omissions (the signed-in catalogue reads videos), an incorrect button selector, and a locale import that broke two older SSR test collections. The fixture/selector were corrected; the question bridge now uses the existing translation hook without eagerly initializing the global language context. Earlier counting and guided-family collections pass in the full suite again. There were no learner-facing exceptions observed in the completed coordinate interactions.

## Follow-up

- Review this first 5e subset visually, then extend negative/decimal coordinates and other years only with explicit curriculum mapping.
- Apply the registry/authoring policy to older exercise types after reviewing their configurable number ranges; do not infer level solely from the renderer name.
- Existing Ubuntu/Playwright-158 screenshot refresh remains pending because its browser download was blocked in this environment in the earlier delivery. New coordinate checks use available Debian/Chromium-154 with screenshots and no new golden-baseline claim for Ubuntu.
- Broader persisted evidence/mastery, AI authoring and fully verified screen-reader speech remain separate work.
