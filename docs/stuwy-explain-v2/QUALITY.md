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
