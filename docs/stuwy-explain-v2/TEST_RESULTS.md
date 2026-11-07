# Test Results

## Consolidated baseline

Run on 2026-11-07 after dependency installation:

- `npm test -- --run`: **passed**, 112 files and 1,107 tests.
- `npm run build`: **passed**. Existing warnings include unresolved SF Pro runtime font references, dynamic/static import chunking, and large chunks.
- `npm run lint`: **failed** on the existing repository baseline: 1,065 errors and 108 warnings.

No external AI calls or production database writes were made.

## V2 Lab slice

- `npm test -- --run src/features/explanations/stuwyExplainLab.test.ts`: **passed**, 3 tests.
- Focused ESLint on V2 Lab files and route: **passed**, 0 errors / 0 warnings.
- `npm run build` after Lab route addition: **passed**.
