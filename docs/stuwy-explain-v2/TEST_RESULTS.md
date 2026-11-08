# Test Results

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
