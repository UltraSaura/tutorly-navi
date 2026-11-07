# Test Results

## Consolidated baseline

Run on 2026-11-07 after dependency installation:

- `npm test -- --run`: **passed**, 114 files and 1,120 tests.
- `npm run build`: **passed**. Existing warnings include unresolved SF Pro runtime font references, dynamic/static import chunking, and large chunks.
- `npm run lint`: **failed** on the existing repository baseline: 1,065 errors and 108 warnings.

No external AI calls or production database writes were made.

## V2 Lab slice

- `npm test -- --run src/features/explanations/stuwyExplainLab.test.ts`: **passed**, 3 tests.
- Focused ESLint on V2 Lab files and route: **passed**, 0 errors / 0 warnings.
- `npm run build` after Lab route addition: **passed**.

## Structured grid cycle 3

- `npm test -- --run src/utils/mathStepper/placeValueGrid.test.ts src/features/explanations/stuwyExplainLab.test.ts`: **passed**, 10 tests.
- `npx tsc --noEmit`: **passed**.
- Focused ESLint for grid, Lab and renderer files: **passed**, 0 errors / 0 warnings.
- `python3 scripts/visual-regression/stuwy-explain-v2.py --help`: **passed**.
- Full French/mobile screenshot regression: **not run**; the harness is prepared, but no local server was running and the app was not restarted. Baseline capture and visual review remain required.
- Synchronization: local merge `d9998353` preserves feature parent `1b9f15c9` and adds merged development `a8708d54`.
