# T11.6 — method audit: implementation blocked

Audited 2026-11-09, after fetching `origin/feature/stuwy-explain-v2`.
Local and remote both pointed to `d6c47854397d41d7ac2a86ba806d8fcfb733e1c4`;
the worktree was clean. No subsequent user changes were overwritten.

## Decision

T11.6 is **not implemented or complete**. Its explicit exception applies:
“Do not stop after the initial audit unless a fundamental mathematical
inconsistency makes the approved explanation impossible to implement safely.”

The existing renderer displays and narrates false equations. Connecting the
approved COMMENT script while leaving these visuals unchanged would violate
the requirement that narration match the animation. Correcting that shared
renderer would conflict with “Do not change the original animations” and
requires a narrow product-owner decision first.

This commit changes only the audit script, evidence and documentation. No
application code, animation, speech hook or production lesson is modified.

## Actual rendering and narration paths

- `src/features/explanations/ExplanationModal.tsx:138` mounts `TwoCards`.
- `src/features/explanations/TwoCards.tsx:441` and `:531` mount
  `CompactMathStepper` with `exampleExpression` for the existing interactive
  lesson/practice presentation.
- `src/pages/dev/TeacherLabPanel.tsx:132` mounts the same component, unwrapped,
  in the “A · TwoCards original” comparison used for this audit.
- `src/components/math/CompactMathStepper.tsx:313` computes subtraction data;
  `:1188` renders the written operation and annotations.
- The displayed explanation at `:1378` and `currentExplanationText` at `:987`
  read the same explanation array. `:2231` passes it to
  `src/components/math/MathExplanationReader.tsx`, which calls the existing
  `src/hooks/useSpeechSynthesis.ts`.

## Method: intended compensation, inconsistent implementation

The French preparation text explicitly describes adding ten in the active
column and adding one **below in the next column**. This is compensation,
preserving the difference by adding equal amounts to both operands.

However, the numerical routine subtracts an incoming carry from the upper
digit (`A[i] - borrowCarry`), while the French presentation tries to retain
original upper digits and adjust the lower row. The numerical answer 177 is
correct, but the conversions into French explanations and visual annotations
are not. The current output is therefore not a coherent implementation of
either compensation or borrowing.

| UI step (1-based) | Actual text sent to speech | Compensation should show |
| --- | --- | --- |
| 2/6, units | `6 − 9 = 7` | `15 − 8 = 7`, lower carry 1 in tens |
| 3/6, tens preparation | `2 − 4` | `2 − (4 + 1)`, then `12 − 5` |
| 4/6, tens result | `2 − 5 = 7` | `12 − 5 = 7`, lower carry 1 in hundreds |
| 5–6/6, hundreds | `2 − 1`, upper visible digit 3 | `3 − (1 + 1) = 1` |

Concrete defects:

1. `frenchTop = info.top - 10 + 1` and `frenchBottom = info.bottom + 1`
   at lines 386–388 produce false equations at borrowed columns.
2. `frenchBottomDigits` at line 1240 increments the lower digit in the borrowed
   column itself: the lower row becomes 149 after the units, then 159. It must
   preserve 148 and annotate +1 in the column to the left for compensation.
3. `showBottomPlus1` is calculated at lines 1204/1224 but never rendered.
4. The units result is revealed at step 1 (zero-based), but the carry visuals
   appear only at step 2: speech and annotations are out of phase.

The prior T11.2/T11.3 test totals and unchanged screenshot baselines do not
establish that these original intermediate equations are correct. This audit
supersedes any earlier claim of verified subtraction-method consistency.

## Authoritative references consulted

1. [Éducation nationale, BO no. 16, 17 April 2025, MENE2504620A](https://www.education.gouv.fr/bo/2025/Hebdo16/MENE2504620A),
   article 3: implementation dates for CM1/6e and CM2.
   [Official mathematics annex](https://www.education.gouv.fr/sites/default/files/programme-de-math-matiques-pour-le-cycle-3-439827.pdf),
   page 3: verbalisation and representation; page 7, CM1 “Les quatre
   opérations”: written addition/subtraction learning objectives. These frame
   curriculum expectations; they do not establish that this renderer is correct.
2. [Éduscol, October 2024, CM2 evaluation intervention sheet](https://eduscol.education.fr/document/61375/download),
   page 7, “Focus sur la soustraction”: distinguishes cassage from compensation
   and explains compensation through preservation of the difference. This is a
   pedagogical method reference, not a replacement for the 2025 curriculum.
3. [Éducation nationale, BO spécial no. 3, 26 April 2018, note 2018-051](https://www.education.gouv.fr/bo/18/Special3/MENE1809042N.htm),
   “Le calcul posé”: distinguishes material-based regrouping from compensation
   and gives a worked example using equal additions to both operands.

## Reproduction and evidence

Run `python3 scripts/visual-regression/t116-twocards-audit.py`.
It reuses the existing server lifecycle and opens the original TwoCards panel,
steps through all six phases, clicks its existing voice button and records the
utterance payload. Speech is intercepted in the test browser; actual audio
quality is not tested. No server data is written.

Artifacts: `artifacts/stuwy-explain-v2/t116-audit/`:

- 12 screenshots: six steps at 375px and 447px.
- `observations.json`: visible text and exact speech payload per step.
- Four false-equation assertions (units/tens at both widths); the audit exits
  nonzero intentionally when these real defects are present.

Directly reviewed: 375px steps 2/6 and 3/6, and 447px step 4/6. The screenshots
also retain the overlapping staging badge rather than hiding this UI problem.
No new baselines were accepted. Full suite, TypeScript, lint and build were
not rerun: there are no application changes and phase 1 is blocked. T11.6
journey acceptance is **not passed**.

## Concrete correction required before the approved dialogue

Keep TwoCards as the single animation and speech system, but repair its French
subtraction adapter to use one compensation record per column:

- `bottom = originalBottom + incomingCompensation`;
- `top = originalTop + (originalTop < bottom ? 10 : 0)`;
- `digit = top - bottom`;
- carry the outgoing 1 into the lower next column, without changing the
  original operand digits;
- derive the spoken equation and visible annotations from this same record
  and reveal them in the same phase.

For 325 − 148 this must yield 15 − 8 = 7, 12 − 5 = 7, 3 − 2 = 1.
After that repair, COMMENT can use the approved compensation script; the
Teacher Engine's existing upper-digit exchange questions must then be aligned
with compensation as part of T11.6. POURQUOI and À TOI are still pending.

Approval needed: allow a targeted correction to the shared TwoCards French
subtraction calculation-to-presentation mapping, preserving its design,
existing voice infrastructure, other operations and production lesson data.
No merge or deployment is proposed.
