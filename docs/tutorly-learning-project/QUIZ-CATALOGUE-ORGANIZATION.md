# Quiz types, curriculum levels and Practice — 19 November 2026

This correction supersedes the standalone activity links in earlier delivery reports. Branch: `feature/guided-practice-lessons`; starting commit `83996596898aa0510fe7a711c5aafb10a6d53eea`, clean working tree. No other branch, merge or production release is part of this work.

## Product flow

Students use **Practice → Subject → Topic → assigned quiz**. There are no promotional cards for exercise formats on the Practice landing page. Former demo routes redirect to the subject list; opening them no longer generates sample problems.

A topic is visible only when it has an active Practice/both assignment to a real bank containing saved, eligible question payloads. An empty bank, lesson-only assignment, missing learner country/level, incompatible bank level or incompatible exercise prevents that bank from appearing. Legacy banks without explicit school-level metadata inherit the level of an exactly matched curriculum topic. A direct `?quiz=` link checks the same catalogue before starting; it cannot expose an unassigned bank or wrong-level type. These are application curriculum rules, not new database authorization policies.

## Authoring

Use **Admin → Learning Content → Quiz Banks**. Create/select a bank, associate it with the correct curriculum topic, add questions using the allowed exercise types, then activate the appropriate topic assignment for Practice. Topic-based quiz editors use the same rules. Existing manually authored and generated question formats remain supported.

The exercise type defines the interaction; the saved parameters define the question. Race/flashcard drafts can be materialized by an explicit admin action and reviewed before saving. Learner renderers read saved operands, choices, diagrams and targets; they do not generate demo exercises. Provider-based AI generation was not expanded to invent new formats. No sample questions were inserted into a live bank.

School-level policy is centralized in `src/features/practice/exerciseCurriculum.ts` and checked when selecting/saving types, assigning banks, building the student catalogue and opening a quiz. New questions record the topic country/levels inside the existing JSON payload. No table, migration or backend schema was added.

## Current French catalogue bands

| Reusable type | Enabled levels | Scope |
| --- | --- | --- |
| Colour counting (`colour-grid`) | CP only | Explicit user requirement. The colour-counting option in object subtraction is also CP only. |
| Guided one-step word problem | CP, CE1 | Add/subtract quantities within 100. |
| Count objects in tens and ones | CP, CE1 | Existing visual model and bounded authored quantities. |
| Subtract with objects | CP, CE1 | Build, remove, recognize the operation, answer. |
| Bridge the next ten | CP, CE1, CE2 | CP total at most 100; later bands at most 1,000. |
| Equal groups | CE1, CE2 | Introductory groups of objects, not a general multiplication renderer. |
| Analogue clock | CE1, CE2 | Authored whole-hour reading / one hour later. |
| Graduated number line | CM1, CM2, 6ème | Authored single read/place task using the existing number-line engine. |
| Coordinate plane | 5ème | Existing introductory nonnegative integer-coordinate subset. |
| Calculation race / number flashcards | All currently supported school levels, CP–Terminale | Authored operations, digit limits and cards; elapsed stopwatch, choices, no invented timeout. |

Except the explicit CP colour rule and the previously documented coordinate mapping, these are conservative Tutorly catalogue bands for the implemented variants, not claims that the reference recordings establish French grade thresholds or that every higher-level use of a broad mathematical concept is excluded. Teacher/curriculum review is needed before widening a variant. Negative coordinates, finer clock minutes and multi-item number-line quizzes are not included in this pilot.

Race/flashcard authoring limits: CP uses addition/subtraction with nonnegative results within 100 (maximum two-digit operands); CE1 permits up to three digits for addition/subtraction and multiplication facts up to 10 × 10; CE2 uses up to three digits and four operations with exact whole-number division; CM1–CM2 up to four digits; collège/lycée up to seven. Negative subtraction results start with the 5ème band. These are configurable product bounds requiring teacher review, not official curriculum assertions. The current app catalogue has no post-school level code; this change does not invent one.

The existing quiz point system grades the new wrappers. Race/flashcard points use the fraction of authored cards answered correctly, recomputed from raw responses. An entire deck counts as one quiz attempt, avoiding a second penalty for its wrong cards. Completion is distinct from mastery; the new types do not receive the score-derived mastery badge. Existing quiz attempt persistence remains in use. No production learner test data was written.

## Validation and changed areas

- `npm run test:ci`: **143 files / 1,293 tests passed**. Focused changed-area tests passed **25/25** after the latest scoring fix.
- `npm run typecheck`: passed (app, Node/tooling and browser-test TypeScript projects).
- `npm run lint:ci`: passed with **zero new or changed violations**. Existing baselined debt remains: 1,033 errors and 105 warnings across the repository; this is not a claim that raw `npm run lint` is clean.
- `npm run build`: passed. Existing large-chunk / mixed static-dynamic import warnings remain.
- Desktop and 390px mobile: the catalogue suite passed **30/30** on the current feature flows. After the final partial-score feedback adjustment, its focused desktop/mobile regression passed **2/2**, including saving a 1/2 race as score 0.5/1 with the wrong card preserved. Tests use Debian Chromium 154, synthetic profiles and intercepted bank requests; no live learner/account writes. Desktop/mobile landing and topic layouts were inspected; official Ubuntu browser golden-baseline refresh remains a separate environment limitation.

Early checks exposed introduced integration failures (JSON typing, a missing translation and eager language initialization in older SSR tests); these were fixed. Browser checks also caught the new wrappers defaulting to French controls in an English interface; the bridge now passes the interface language and dedicated regression tests pass. Initial browser runs additionally required corrections to synthetic HEAD progress reads and expected prompts/early-hint behavior. Those fixture failures are not described as pre-existing app failures.

Areas changed: Practice routing/landing/topic pages; shared bank catalogue; curriculum policy; admin editors and save/assignment guards; quiz type union, renderers, raw-response grading and scoring; reused number-line state callbacks; synthetic browser fixtures and regression tests; README links.

Earlier implementation mistakes being corrected: hard-coded student activity cards; unscoped colour counting; standalone-only race/flashcard/clock/number-line modules; subject-wide bank shortcuts without topic publication checks. No production records were silently reclassified or deleted; incompatible legacy assignments are hidden until corrected through admin.
