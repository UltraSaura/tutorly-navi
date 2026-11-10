# T11.12 — Original demonstration, independent application

The development student session uses POURQUOI → COMMENT → À TOI. The independent digit grid has been removed. COMMENT mounts the existing `CompactMathStepper` with `expression="325 - 148"` and `className="text-sm"`, exactly as the original comparison surface does. No step control, CSS overrides, duplicated narration or mathematical renderer is introduced.

The component owns its navigation and narration. The parent’s “À moi d’essayer un autre calcul” action ends the demonstration phase; it does not infer that the child watched all steps. The application is `326 − 157`, expected result `169`. The demonstrated answer `177` is rejected. No question is displayed during the demonstration.

Answers use `submitTutorResponse`, hints use `requestTutorHint`, and leaving the demonstration uses `continueAfterDemonstration`. Attempts survive retries, hints and revisiting the demonstration. Repeated difficulty leads to a prerequisite and then adult support instead of an endless retry loop. There is no compulsory understanding quiz.

Teacher language uses compensation: add 10 units above and 1 ten below, preserving the difference. For the application the column calculations are 16 − 7, 12 − 6, and 3 − 2. The upper tens/hundreds are not decremented as in borrowing. Initial strategy recognition is deliberately constrained to the offered compensation response; unrestricted language understanding is not claimed.

## Review

Open `http://127.0.0.1:4173/dev/stuwy-explain-v2#student-session`. Select “Je calcule 8 moins 5”, validate, read POURQUOI, then select “Voir la méthode sur l’opération”. Use the original animation controls, then “À moi d’essayer un autre calcul”. Try 177 (incorrect), retry, request a hint, and enter 169.

The browser test captures POURQUOI, COMMENT, À TOI, incorrect feedback, a hint and completion at 1280, 375 and 447 pixels. It compares six settled animation states and speech payloads with the existing “TwoCards original” reference. Reference parent width is matched to the integration width for this comparison; no internal component styles are changed. The environment badge is hidden only in captures. Side-by-side images place the original on the left and the integration on the right.

The original animation retains its height. The application is a subsequent phase with a single answer field. Narration text can be checked automatically with a speech-synthesis stub; actual device voice, sound quality and human pedagogical acceptance still require manual review. Pixel comparisons verify settled states, not every intermediate animation frame.

## Validation

- Full Vitest suite: 120 files, 1164 tests passed.
- Focused ESLint: passed.
- Production build: passed (existing asset/chunk warnings).
- TypeScript: 11 existing diagnostics outside changed files; no changed file is reported.
- Browser and visual regression results are recorded in TEST_RESULTS.md after completion.

Locked files: `TwoCards.tsx`, `CompactMathStepper.tsx`, and the mathematical engine remain unchanged. Changes are confined to the development view, tutoring session/correction model, tests, and documentation/artifacts. No merge or deployment.
