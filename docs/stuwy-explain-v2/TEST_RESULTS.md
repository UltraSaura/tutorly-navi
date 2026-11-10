# Test Results

## T11.6A correction validation — 2026-11-09

Follow-up visual rule: compensation markers already consumed are crossed out
when the animation advances to the next column; the active column's markers
remain readable. Verified in the 375px and 447px TwoCards screenshots.

- Reproduced the existing TwoCards operation at 375px and 447px; captured 12
  screenshots and the speech-synthesis text for all six stages at each width.
- `python3 scripts/visual-regression/t116-twocards-audit.py`: **passed**, with no
  false equations at either viewport. It records `15 − 8 = 7`, `12 − 5 = 7`
  and `3 − 2 = 1` in the speech payload.
- Speech payload interception does not validate audible voice quality.
- Corrected screenshots are in `artifacts/stuwy-explain-v2/t116-audit/`.
- Focused Vitest: **19 passed** (compensation model, correction flow and
  interactive journey).
- Student-session browser journey: **passed** on desktop, 375px and 447px,
  including optional understanding support, direct method demonstration,
  bounded retry, fallback and transfer completion.
- Full Vitest: **passed**, 120 files and 1,166 tests.
- Visual regression: **passed**, 74 screenshots matched against reviewed
  baselines, including the corrected TwoCards evidence at 375px and 447px.
- Production build: **passed**. Existing font-resolution, chunk-size and
  import-order warnings remain.
- Focused lint for changed tutoring/model files: **passed**. Linting the full
  existing stepper also reports unrelated legacy errors in that file.
- TypeScript still reports pre-existing unrelated errors; see validation log
  below. Full build/lint results are reported separately after this cycle.
- [Detailed evidence and correction record](T116_METHOD_AUDIT.md).

## T11.7 pedagogical acceptance review — 2026-11-09

- POURQUOI: the reversed response is explicitly explained in French before the
  method demonstration; no negative-number claim is introduced.
- COMMENT: the existing TwoCards animation and speech reader now agree at every
  stage: `15 − 8 = 7`, `12 − 5 = 7`, `3 − 2 = 1`, then `177`.
- À TOI: the direct path returns to the student at `15 − 8`; the understanding
  check is optional support, not a compulsory gate.
- Language review: corrected `de unités` to `d’unités`; the 21 focused math and
  tutoring tests pass, and the full suite passes with 120 files / 1,168 tests.
- Representative subtraction coverage includes no regrouping, one regrouping,
  consecutive regrouping, zero digits and `403 − 178`; all equations are
  checked from the shared compensation model.
- Browser journey and screenshots pass on desktop, 375px and 447px. Original
  controls, narration integration, layout and navigation remain intact.
- TypeScript reports the same 10 pre-existing errors as the previous review;
  none reference the changed files. No production lesson or deployment was
  changed.

## Consolidated baseline

Run on 2026-11-07 after dependency installation:

- `npm test -- --run`: **passed**, 115 files and 1,127 tests.
- `npm run build`: **passed**. Existing warnings include unresolved SF Pro runtime font references, dynamic/static import chunking, and large chunks.
- `npm run lint`: **failed** on the existing repository baseline: 1,065 errors and 108 warnings.

No external AI calls or production database writes were made.

## V2 Lab slice

- `npm test -- --run src/features/explanations/stuwyExplainLab.test.ts`: **passed**, 4 tests.
- Focused ESLint on V2 Lab files and route: **passed**, 0 errors / 0 warnings.
- `npm run build` after Lab route addition: **passed**.

## Structured grid cycle 3/4

- `npm test -- --run src/utils/mathStepper/placeValueGrid.test.ts src/features/explanations/stuwyExplainLab.test.ts`: **passed**, 10 tests.
- `npx tsc --noEmit`: **passed**.
- Focused ESLint for grid, Lab and renderer files: **passed**, 0 errors / 0 warnings.
- `python3 scripts/visual-regression/stuwy-explain-v2.py --help`: **passed**.
- `npm run test:visual:stuwy -- --update`: **passed**, reviewed baseline set contains 58 screenshots (the original 48 names remain present).
- `npm run test:visual:stuwy`: **passed**, 58 screenshots matched after decoded-pixel comparison (only one-level antialiasing noise is tolerated).
- Visual review: **passed** for representative desktop/mobile frames; no incorrect final arithmetic or column placement found. The new subtraction frames visibly show regrouping and the remainder case visibly shows quotient 226, remainder 3.
- Decimal input fix: French comma decimals are now normalized before the Lab validation parser evaluates them.
- Synchronization: local merge `d9998353` preserves feature parent `1b9f15c9` and adds merged development `a8708d54`.
## Cycle 4 additions

- Place-value tests now verify direct carry annotations, `52 − 27` exchange values, and the `403 − 178` zero-crossing chain.
- Benchmark test verifies exactly 30 exercises, all four grades, all five requested domains, generated results for supported cases, and explicit unsupported status for non-rendered types.
- Visual coverage adds `907 ÷ 4` with remainder and preserves the original 48 screenshot names; the reviewed baseline count is 58.
## Cycle 5 additions

- Benchmark audit test verifies the corrected `CE2-G01` and `CM2-W01` wording and correction trail.
- Lab now presents French pedagogical notes separating operation, explanation and animation; guided mode withholds the answer until the final frame.
- Demo presets are documented in `DEMO.md`; visual baselines are preserved and the existing 58-image regression suite remains the review target.

## Teacher Engine V1

- `npm test -- --run src/features/explanations/teacherEngine.test.ts src/features/explanations/stuwyExplainLab.test.ts src/features/explanations/explanationMode.test.ts`: **passed**, 19 tests.
- `npx tsc --noEmit`: **passed** after Teacher Lab addition.
- Focused ESLint for Teacher Engine and Teacher Lab files: **passed**, 0 errors / 0 warnings.
- Production routing: **unchanged**; no Tutor, Learn, or Practice integration performed.
- Visual baselines: **not regenerated**; existing V2 visual harness remains unchanged.

## Cycle T09 validation

- `npm test -- --run`: **passed**, 118 files / 1,146 tests.
- `npx tsc --noEmit`: **passed**.
- Focused ESLint for the clean renderer, V2 page, Teacher Lab, and place-value
  solver: **passed**, 0 errors.
- `npm run build`: **passed**. Existing Browserslist, unresolved font, chunk
  size, and dynamic-import warnings remain unrelated build warnings.
- `npm run test:visual:stuwy -- --update`: **passed**, 74 reviewed baselines
  generated.
- `npm run test:visual:stuwy`: **passed**, 74 screenshots matched.
- Mobile visual review: **passed** for the clean card and absence of the old
  technical rows; mathematical notation remains subject to product-owner
  review for division/multiplication styling.
- Original TwoCards: **unchanged**; no production Tutor, Learn, or Practice
  routing was modified.

## Architectural correction validation

- TwoCards inventory: **verified** in the architecture decision record.
- Voice path: **verified** through `MathExplanationReader` →
  `useSpeechSynthesis`; no duplicate speech implementation added.
- Side-by-side development comparison: **implemented** for `325 - 148` using
  the original `CompactMathStepper` in columns A/B and `CleanWrittenOperation`
  in column C.
- V2 intermediate zeroes: **fixed and unit-tested**; padded `007`-style
  intermediate results are no longer exposed.
- Mobile navigation: **fixed and visually rechecked** with stable two-column
  controls.

## T10 validation

- Interactive tutor controller: **passed**, 4 focused tests covering diagnosis,
  hint escalation, retry, demonstration, and transfer completion.
- Student flow: **implemented** at `data-testid="interactive-student-session"`.
- Under-11 demonstration: **reuses** `CompactMathStepper`, with existing
  `MathExplanationReader` and speech controls.
- Developer scenario tools: **separated** in a collapsible section.
- Full suite after T10 changes: **passed**, 119 files / 1,151 tests.
- Visual suite after exposing the student session: **passed**, 74/74 reviewed
  screenshots matched.
- Production build after T10 changes: **passed** with the repository's existing
  font, Browserslist, dynamic-import, and chunk-size warnings.
- Full product-owner approval: **pending**; this remains development-only.

## T11 validation

- Natural-language and diagnosis controller tests: **passed**.
- Assistance ladder: **passed** for independent, two-hint, repeated-error,
  and demonstration paths.
- Transfer evidence: **passed** for correct/incorrect attempts and completion
  summary data.
- Full suite: **passed**, 119 files / 1,153 tests.
- TypeScript and focused lint: **passed**.
- Mobile visual regression: **passed**, 74/74 screenshots matched after the
  student experience refinement.
- Production build: **passed** with existing repository warnings.
- Voice/accessibility: existing TwoCards controls remain reused and exposed;
  manual screen-reader and speech-timing review remains open.
## T11 stall hotfix — latest update

Validation: 119 test files / 1,158 tests passed; TypeScript, focused lint and build passed. All 74 full-page visual comparisons pass after intentional panel refresh. Eight requested browser journeys pass at mobile and desktop sizes; 20 new screenshots captured. See the report for reviewed images and manual-review limits.

Details: [T11_STALL_HOTFIX.md](./T11_STALL_HOTFIX.md).

T11.2 focused tests: 14 controller/model tests passed; mobile and desktop
browser journeys passed with correction explanation and understanding-check
screenshots reviewed. TypeScript, focused lint and production build passed.

## T11.8 TwoCards embedding review — 2026-11-09

- `src/features/explanations/TwoCards.tsx` remains untouched.
- The student session now mounts the existing `TwoCards` public component with
  its `TeachingSections` API. No duplicate playback or speech controls were
  added.
- The teacher sentence appears above the embedded component and `À moi de
  répondre` appears directly after it.
- Browser journey passed on desktop, 375px and 447px. Captures show the real
  TwoCards `Exercice`, `Concept`, `Méthode`, `Piège` and `Auto-vérification`
  surface.

## T11.12 — Original animation and independent application

- Supersedes the T11.8 card-mode embedding and the T11.10 duplicate grid. The student view mounts the exact `CompactMathStepper` through its existing public props.
- Full suite: 120 files / 1164 tests passed. Focused controller tests: 11 passed, including bounded fallback and prerequisite restoration. Focused lint and production build passed.
- Browser journeys passed at 1280, 375 and 447px: misconception explanation, unchanged demonstration, distinct application (326 − 157), wrong answer, retry, hint, revisiting the original example and correct completion (169).
- Six settled steps per viewport matched the original component's pixels (existing one-channel antialiasing tolerance) and speech payloads: 18 comparisons. Parent width and subpixel origin are equalized in the test only. No stepper styles or logic are overridden. Side-by-side mobile states were inspected visually.
- 72 evidence images in `artifacts/stuwy-explain-v2/t1112/`. The original is left and the integration right in comparison images.
- Full-page baselines refreshed for the intentional removal of the independent student grid and the new surrounding interaction. Original animation comparison evidence is separate.
- TypeScript still reports 11 diagnostics in unrelated admin/guardian/practice/service/benchmark files; none in the changed files. Build warnings concern existing fonts, bundle size and mixed imports.
- Actual device audio and product-owner pedagogical acceptance remain manual. The tests check narrated text, not voice quality; settled-state screenshots do not assert every transitional frame. TwoCards, CompactMathStepper and the shared mathematical engine are untouched.

See `T1112_ACCEPTANCE.md` for the walkthrough and limitations.
