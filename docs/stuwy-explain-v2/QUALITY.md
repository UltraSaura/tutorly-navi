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

Browser-level visual verification remains open. The new harness captures setup and intermediate states for all six reference operations at mobile and desktop sizes and compares PNG baselines byte-for-byte, but captures were not run in this cycle because no local server was running.
