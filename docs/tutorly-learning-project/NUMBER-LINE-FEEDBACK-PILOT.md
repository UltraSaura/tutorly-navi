# Number-line feedback pilot — 18 November 2026

The immediate correct-part locking described below is superseded by the approved [independent retry and optional guidance policy](NUMBER-LINE-RETRY-POLICY.md). This report records the earlier pilot.

Branch: `feature/guided-practice-lessons`. Clean starting commit `ca43cf00f88a8299c772d291827b3262d0a01fb1`, verified against the fetched feature branch before editing. No other worktree was changed.

## Source and category

This improves Tutorly's existing graduated-number-line Practice tool as the second feedback pilot proposed in `BRILLIANT-IMPLEMENTATION-PLAN.md`. It is not a reconstruction of a supplied Synthesis video. The saved video evidence mentions an auxiliary 1–12 number line with the analog clock recording `23.55.48`; that does not establish the rules of these fraction/decimal exercises. No matching standalone number-line recording was identified or newly watched. The Brilliant document is product direction, not a recording of this tool.

Category: Maths → Nombres et calcul → Repérage sur une droite graduée. Current examples place ordinary/improper fractions, read point values, and order mixed fraction/decimal values. A specific French school year is not established by the recordings or repository notes; formal curriculum/teacher mapping remains required before assigning grade-specific content.

## Changes

- Keep and visibly confirm correct placements/answers after checking. Retry preserves all work, including the ordering exercise that previously reshuffled labels. Accepted parts are disabled while the student corrects the others.
- Show a check mark only after correct validation, not just because a label was placed.
- Add optional French/English method hints explaining equal intervals, known labels, fractional parts and numeric ordering, without target answers or target tick destinations.
- Remove hidden answer leaks from reading-point accessible labels and incorrect-answer details. Reading details identify A/B, not the correct fraction.
- Share pure item evaluation across the component. Blank input no longer means zero; missing/tied/invalid relative-order placements cannot pass. Equivalent numeric forms remain accepted, including equivalent values in relative-order tasks. Default snapped tolerance cannot accept a neighboring tick on a dense scale; explicit authored tolerance is retained.
- Give ordering the same select-then-tap and native-select alternatives as placement, alongside existing drag controls. Show a clear final completion and restart after the existing four activities.

## Scope and limits

The existing result contract and Practice/lesson adapter are reused. No database schema, backend writes, mastery rule, timer, point-scoring policy or new admin exercise type was added. This existing number-line tool does not award points or persist a session across page reloads; this pilot does not change that behavior. It records per-item correctness and attempts through its existing callback. It does not claim an independent transfer assessment. The standalone route is `/practice/number-line`; formal lesson/admin authoring and curriculum mapping remain follow-up work.

## Files

- `src/features/practice/numberLine/numberLineFeedback.ts` and `.test.ts`: deterministic evaluation and method hints.
- `src/features/practice/numberLine/numberLineUtils.ts` and `.test.ts`: blank input regression.
- `src/features/practice/numberLine/GraduatedNumberLineActivity.tsx`: retained correct work, hints, answer-leak fixes and accessible ordering controls.
- `src/pages/practice/GraduatedNumberLinePage.tsx`: final completion/restart.
- `src/locales/en/interface.json`, `src/locales/fr/interface.json`: completion copy.
- `e2e/number-line-feedback.pw.ts`: full four-activity journey and partial corrections on desktop/mobile.
- Four `e2e/visual-baselines/debian13-chromium154/{desktop,mobile}/practice*.png` images: reviewed Practice appearance.
- `e2e/journeys.pw.ts`: adjust the existing journey to the corrected pre-validation label naming.

## Validation

Initial focused baseline: six existing number-line utility tests passed. Known repository-wide lint debt remains explicitly baselined (1,035 errors, 108 warnings); this is not a clean full-lint claim.

- `npm run test:ci`: **133 files, 1,231 tests passed**.
- Focused number-line and translation coverage: **22 tests passed**.
- `npm run typecheck`: passed.
- `npm run lint:ci`: passed with zero new/changed violations; existing full-lint baseline remains 1,035 errors and 108 warnings. The first lint attempt overlapped Vite's temporary configuration-file cleanup and failed with ENOENT; running it after the build passed.
- `npm run build`: passed, retaining existing chunk-size and mixed-import warnings.
- New browser journey: **2 passed**, desktop and mobile, all four activities, method hint, retained correct work, wrong-answer retry, read-point labels/details, equivalent answers, keyboard/touch and final restart.
- Existing Practice functional/visual journeys: **4 passed** after updating the changed Debian/Chromium-154 screenshots and rerunning without snapshot updates. Test selectors now distinguish the value bank from already-placed labels. Desktop/mobile screenshots were visually reviewed. The initial journey rerun exposed the old ambiguous selector after the corrected checkmark behavior; the selector was fixed and all four passed.
- Browser tests use synthetic external fixtures, block unexpected external requests, and never write production learner data. Reduced motion was enabled. Reload persistence, a live signed-in learner and screen-reader speech were not exercised.

### Remaining CI visual baseline blocker

The pinned Playwright Chromium-158 installer failed with HTTP 403 “Domain forbidden” for the official download, and its official Google mirror was also blocked. Therefore the Ubuntu/Playwright-158 visual baseline was **not** executed or refreshed here. The intentional hint/control/checkmark changes require reviewing and updating the four Practice screenshots for that renderer on a supported runner before merging. The available Debian/Chromium-154 baselines were updated, reviewed and passed. These renderer-specific baseline differences must not be presented as a full Ubuntu CI pass.

Read-only code review found no blocker. Follow-ups are the Ubuntu visual refresh, formal curriculum mapping, and a separate decision about integrating this existing unscored, nonpersistent utility with quiz-bank scoring/progress; this pilot does not invent that integration.
