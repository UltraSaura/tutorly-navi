# Quality

## Quality gates

- Deterministic result must match the generated final step.
- Unsupported or malformed input must produce a visible error, not a fabricated answer.
- The complete operation remains visible while the current step changes.
- Reduced motion must disable auto-play transitions.
- Correctness and pedagogical review are recorded separately.

## Current findings

The repository already contains stepper, operation-posee verification and math-rendering tests. The V2 Lab will add focused tests around its orchestration and keep the existing suite as a regression gate.

The Lab now renders through `StructuredOperationGrid`, which maps every visible digit and annotation to an exponent-based column and marks decimal boundaries. The deterministic contract covers the six reference operations. Full French long-division potence fidelity and screenshot baselines remain open until browser-level visual verification is available.
