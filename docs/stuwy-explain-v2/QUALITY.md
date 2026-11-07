# Quality

## Quality gates

- Deterministic result must match the generated final step.
- Unsupported or malformed input must produce a visible error, not a fabricated answer.
- The complete operation remains visible while the current step changes.
- Reduced motion must disable auto-play transitions.
- Correctness and pedagogical review are recorded separately.

## Current findings

The repository already contains stepper, operation-posee verification and math-rendering tests. The V2 Lab will add focused tests around its orchestration and keep the existing suite as a regression gate.

The current Lab deliberately does not claim exact place-value alignment or full French written-division fidelity. Its `StepDisplay` path renders generic text rows; the richer `CompactMathStepper` path exists elsewhere in the application but is not yet integrated into this Lab.
