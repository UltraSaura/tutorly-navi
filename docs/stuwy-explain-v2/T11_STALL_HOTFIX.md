# T11 student-session stall hotfix

## Reproduction and root cause

Reproduced in the actual development Lab at 390 × 844 before editing.
Submitting `8 - 5` left the initial question, original choices and four actions
visible. Submission was not technically disabled: the controller still evaluated
the initial approach. The feedback asked a new question, but no state expected
the answer 10. The initial three-question path also skipped tens and hundreds.
Hints changed the transfer state's identity, so transfer answers could be
evaluated as answers to an earlier arithmetic step. Numeric substring matching
could accept incorrect numbers containing the expected digits.

Evidence: `artifacts/stuwy-explain-v2/hotfix-before.png`.

## Corrected transitions

`interactiveTutorSession.ts` now separates the question index from presentation
state (answer, feedback, hint, demonstration). Attempts record both question
index and prerequisite context. Numeric answers are matched exactly (optional
unit suffix), not by substring. Free-text approach recognition is deliberately
conservative; an unrecognized explanation leads to a prerequisite, not a
confident claim about the student's misconception.

| Question | Expected response | Next question |
| --- | --- | --- |
| Initial approach | Exchange one ten for ten units | Units after exchange |
| Incorrect initial approach | Any incorrect/unclear response | Value of one ten |
| Value of one ten | 10 | Units after exchange |
| Units after exchange | 15 | 15 − 8 |
| 15 − 8 | 7 | Tens remaining after exchange |
| Tens remaining | 1 | Exchange a hundred: 1 + 10 tens |
| Regrouped tens | 11 | 11 − 4 |
| 11 − 4 | 7 | Remaining hundreds: 2 − 1 |
| 2 − 1 | 1 | Read the assembled result |
| Assembled result | 177 | Transfer: 326 − 157 |
| Transfer | 169 | Completion without a mastery claim |

Hints progress from concept to specific procedure to the existing TwoCards
demonstration. Two incorrect numeric attempts also offer that demonstration.
Returning restores the same question. A further failed attempt offers 5 + 5;
success returns to the saved question. Persistent difficulty exits automatic
retry to an explicit accompaniment state. The student can resume that same
question with an adult; no restart or developer controls are required.

## Visible experience

`src/pages/dev/InteractiveStudentSession.tsx` is extracted from TeacherLabPanel.
There is one active question. Initial choices are removed after transition;
later answers use numeric input. Retry appears only after a wrong attempt.
The question is announced, the input regains focus on transitions, and Enter
submits. A compact static calculation preserves place values, crossed-out
digits and confirmed answers, without prematurely filling result digits.
The return button sits above the reused TwoCards demonstration and stays sticky.

The existing TwoCards component and its speech reader/hooks are unchanged.
No production lesson or route is altered. The smaller demonstrations reuse
existing TwoCards at every grade in this fixed development scenario; this is
not a change to production age routing or to the separate V2 preview.

## Reproduce the product-owner journey

Open `http://127.0.0.1:4173/dev/stuwy-explain-v2#student-session` with the existing
development server running. In “À toi de jouer”, open “Choisir une réponse”,
select “Je calcule 8 moins 5” and validate. Answer
`10 → 15 → 7 → 1 → 11 → 7 → 1 → 177 → 169`.
To test fallback, answer 2 twice to the ten-unit question, return from TwoCards,
then answer 2 again. The simpler prerequisite appears. Two more wrong answers
offer accompaniment, preserving the original calculation.

## Validation and artifacts

- `npm test -- --run`: 119 files, 1,158 tests passed.
- `npx tsc --noEmit`: passed.
- Focused ESLint: controller, tests, TeacherLabPanel and extracted component passed.
- Production build: passed; existing large-chunk warning remains.
- `npm run test:e2e:student-session`: eight requested journeys checked at desktop
  1280 × 900 and mobile 390 × 844, including keyboard submission, no section
  overflow, obsolete choices removed, transfer after hints/retry, bounded fallback.
- 48 student-session journey screenshots in `artifacts/stuwy-explain-v2/hotfix/`,
  including 36 latest captures at desktop, 375px and 447px, plus the before image.
- Existing 74 full-page baselines intentionally refreshed because they include
  the changed student-session panel. No original arithmetic cases removed.
- All 74 refreshed baselines matched on a second run. Direct review caught
  sticky answer controls overlapping the field in full-page captures; those
  controls now remain in normal document flow, with an added overlap assertion.

Screenshots reviewed directly: mobile remediation (10, 15, 15 − 8), units answer,
assembled result, transfer and French TwoCards fallback; desktop remediation.
The initial operation stays 325 − 148; annotation stages preserve
300 + 10 + 15 = 325 and 200 + 110 + 15 = 325. Result digits are revealed only
after the corresponding response. Transfer starts with blank result cells.

## Limits / approval

This is a deterministic scenario for 325 − 148 and transfer 326 − 157, not a
general natural-language tutor. The generic 5 + 5 prerequisite can be too basic
for later-column difficulties and should be refined after teacher review.
The unchanged TwoCards card is tall on mobile; the return button is above it,
but its own narration/navigation may require scrolling. Actual audio output,
screen-reader experience and mobile software keyboard need manual device review.
Reduced-motion browser journeys run successfully; no claim is made that this
hotfix audits every animation inside unchanged TwoCards.
Product-owner pedagogical approval is still required. No merge or deployment.

## T11.2 — explain why

The prior hotfix classified `8 − 5` correctly but immediately opened the
ten-unit remediation. T11.2 adds the reusable
`PedagogicalCorrection` contract in
`src/features/explanations/pedagogicalCorrection.ts`. It records the observed
response, misconception hypothesis, principle, explanation, concrete example,
understanding check and next action. The controller now exposes
`correction-explanation` and `correction-check` states before step 10.

For the reversed-subtraction case, the student sees the actual proposed
`8 − 5` through the existing TwoCards stepper, alongside an explicit `5 − 8`
comparison. The text says that 5 − 8 is not completed in whole-number units in
this column; it does not claim negative numbers are impossible. The student
must identify that the two starting situations differ. A wrong check receives
a shorter explanation about the starting number and can be checked again.

The same typed contract has a generic path for skipped-units and other
misconception categories, so this is not a text-only special case. The original
TwoCards stepper, navigation and narration files remain unchanged.

## T11.3 — compact visual remediation

The correction no longer embeds `CompactMathStepper` for the comparison itself.
`CompactConceptIllustration` uses small object groups: eight with five removed
leaves three, while five cannot supply eight. Its speech controls reuse the
existing `MathExplanationReader` and speech hook. The full TwoCards stepper is
still used for the original `325 − 148` demonstration for under-11 grades;
older-grade demonstrations continue to use the concise contextual expression.
The comparison card is tested at 375px and 447px and avoids the misleading
instruction to write 3 into the original operation.
