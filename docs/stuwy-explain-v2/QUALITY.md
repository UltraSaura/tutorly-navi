# Quality

## Quality gates

- Deterministic result must match the generated final step.
- Unsupported or malformed input must produce a visible error, not a fabricated answer.
- The complete operation remains visible while the current step changes.
- Reduced motion must disable auto-play transitions.
- Correctness and pedagogical review are recorded separately.

## Current findings

The repository already contains stepper, operation-posee verification and math-rendering tests. The V2 Lab will add focused tests around its orchestration and keep the existing suite as a regression gate.

The Lab now renders through `StructuredOperationGrid`, which maps every visible digit and annotation to an exponent-based column, marks decimal boundaries and keeps source/destination columns explicit for semantic events. Division frames retain quotient, dividend, intermediate products, subtraction rows, remainders and bring-down events. Reduced-motion classes are applied to the grid and controls.

Browser-level visual verification passed. The harness starts the Vite development server when needed, captures setup and intermediate states for seven reference operations at mobile and desktop sizes, and compares 58 reviewed PNG baselines by decoded pixels. Representative frames were visually reviewed for alignment, persistence and responsive layout. Regrouping now includes crossed-out and replacement annotation cells; grade-specific wording and temporal motion remain review items.
## Cycle 4 quality gate

The renderer now shows the arithmetic state transition itself: crossed-out source digits and replacement values for exchanges, including the `4 → 3`, `0 → 9`, and `3 → 13` chain in `403 − 178`. These cells retain explicit place-value exponents and have text labels for assistive technology. The benchmark contains 16 verified written-arithmetic cases and 14 explicit unsupported cases. See [`BENCHMARK_REPORT.md`](./BENCHMARK_REPORT.md).

The quality assessment is partial for pedagogical wording and temporal animation review. No Photomath comparison was performed because no genuine reference material was provided.
## Cycle 5 pedagogical gate

The benchmark is now auditable: every row carries an audit trail, and the two ambiguous prompts identified in review have complete French wording and rechecked expected results. Supported walkthroughs distinguish the mathematical operation, the French explanation, and the visual animation. Guided mode does not show the final answer or verification equality before the last frame.

Interaction coverage is implemented through native keyboard-focusable buttons, explicit control labels, a polite live explanation region, stable previous/next/replay behavior, and reduced-motion autoplay suppression. A manual screen-reader pass and teacher review remain required before claiming full pedagogical readiness.

## Teacher Engine gate

The Teacher Engine is deterministic and solver-dependent: it refuses an
unverified solution, selects assistance from mastery/attempt evidence, and
keeps the guided answer hidden until an independent success or the final step.
Seven focused tests cover assistance selection, regrouping prompts, repeated
failure remediation, guided transitions, review grounding, solver authority,
and TwoCards presentation preservation. The Teacher Lab is a development
simulation; it is not evidence of real learning improvement.

## Cycle T09 presentation gate

The student-facing V2 card now has one conventional operation, a single
active explanation, and direct digit annotations. It does not render the
internal labels `avant`, `après`, `unités avant`, `unités après`, or `résultat`
as a debugging table. The complete operation remains visible while the active
column changes. The live mobile review covered addition, subtraction with
borrowing (including zero crossing), multiplication, division, and decimal
alignment.

The acceptance evidence is 74 reviewed visual baselines plus mathematical
place-value tests. The visual result is ready for product-owner review, not
for production integration: division and multiplication still need a manual
teacher review for notation preferences, and screen-reader timing requires a
manual pass.
## T11 stall hotfix — latest update

Acceptance now requires wrong-answer → 10 → 15 → 7 → remaining columns → transfer, not merely feedback text or model tests. Original TwoCards and voice files remain unchanged. Screenshots and browser assertions cover the actual student panel. No production approval is implied.

Details: [T11_STALL_HOTFIX.md](./T11_STALL_HOTFIX.md).

T11.2 acceptance requires the visible sequence “why” → comparison →
understanding check → remediation. A classifier-only feedback string is not
considered sufficient.
