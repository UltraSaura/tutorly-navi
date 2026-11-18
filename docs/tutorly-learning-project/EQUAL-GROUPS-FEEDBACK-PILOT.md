# Equal-groups feedback and fresh Practice check — 18 November 2026

Branch: `feature/guided-practice-lessons`. Clean starting commit: `55730d517e777550f8a1ee5307bb9583565c4fc3`, confirmed against origin before edits.

This is the first small pilot from the Brilliant implementation plan, not another reference-video module. It extends Practice → Groupes égaux. The source is the linked Brilliant product-direction analysis in `BRILLIANT-IMPLEMENTATION-PLAN.md`; original equal-groups video notes refer to `00.01.04 (1).mov`. Category remains Maths → Nombres et calcul → Multiplication. No new curriculum-level claim is made.

## Behavior

- Four answer choices now include common interpretations: group count, objects in one group, addition of the two labels, and the total. Duplicate choices are removed and bounded alternatives fill the remaining places.
- Wrong answers receive cautious, deterministic method feedback. Ambiguous responses receive general coaching. Correct built groups remain in place; feedback and hints do not print the total.
- After completion, the learner may choose “Essayer sans le modèle.” This gives a new word question with different factors and a different product, without pictures or a displayed solved equation.
- The original result and score remain visible and unchanged. The fresh attempt has its own score using the existing retry penalty. Help remains available; help or corrective feedback labels the result supported. Only first-attempt success without help is described as independent success on this example.
- Fresh-attempt state is saved locally under the existing learner scope plus a versioned transfer suffix and exercise-content fingerprint. Reload resumes; another original exercise starts a new session. Storage failure does not prevent use.

## Scope and limits

No database schema, production learner data, mastery threshold, AI generation, timer, or lesson bank format is changed. This pilot's extra fresh check appears on the standalone equal-groups Practice page; quiz-bank equal-groups questions gain the better choices and feedback, but do not acquire an extra scored question. Group size is provided by the exercise, not chosen by the learner: feedback does not claim to measure a group-size construction error. Independent success on one example is not mastery. Broader lesson/evidence integration and formal curriculum mapping remain follow-up work.

## Changed files

- `src/features/practice/equalGroupsFeedback.ts` and `.test.ts`: feedback and distinct fresh-example generation.
- `src/features/practice/guidedFamilies.ts`: meaningful equal-groups answer choices.
- `src/components/practice/GuidedFamilyActivity.tsx`: preserve model and use targeted feedback.
- `src/components/practice/EqualGroupsTransfer.tsx`: separate optional fresh check and local resume.
- `src/pages/practice/GuidedFamiliesPracticePage.tsx`: completion integration.
- `e2e/equal-groups-transfer.pw.ts`: independent/supported flow, retained score, reload, retry, keyboard/touch and next session.

Validation results are recorded below once checks finish. Existing lint debt and build chunk warnings are tracked by the repository's previous implementation report; this change must pass `lint:ci` without increasing that baseline.

## Validation

- `npm run test:ci`: **132 files, 1,216 tests passed**. An additional answer-choice boundary test was then added; the final focused feedback suite passed **9 tests**.
- `npm run typecheck`: passed; final browser-test TypeScript check also passed.
- `npm run lint:ci`: passed with **zero new/changed violations**. Existing baseline remains 1,035 errors and 108 warnings; the full legacy lint is not clean.
- `npm run build`: passed (existing large-chunk and mixed static/dynamic import warnings).
- Browser: **10 tests passed**, desktop 1280×900 and mobile 390×844, reduced motion. Includes all three existing guided family flows and independent/supported fresh checks, meaningful incorrect choices, preserved groups and original score, retry, help, reload, keyboard/touch and reset. Synthetic external network fixtures prevent production writes. Desktop/mobile screenshots were visually inspected.
- The first browser run exposed an ambiguous test selector matching nested status regions; the selector was corrected. An overlapping rerun also conflicted with Playwright's shared artifact directory; the final run was sequential and passed all 10 cases. No unresolved application regression was found.
- Read-only pedagogical and final code reviews found no blocker. Follow-up: the deterministic transfer policy wraps an authored factor of ten to one and may lower difficulty; generated Practice examples use factors two through five, so the ordinary pilot avoids this boundary. Transfer difficulty policy should be authored before broader lesson integration. Signed-in live progress, screen-reader speech and production data were not exercised.
