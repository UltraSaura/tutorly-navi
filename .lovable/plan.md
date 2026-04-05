

## Plan: Remove Short Mode, Keep Only Teacher Explanation

### What changes

**1 file modified**: `src/components/math/CompactMathStepper.tsx`

1. **Remove** the `divExplanationMode` state (line 40)
2. **Remove** the toggle button group (lines ~1083-1110) — the "Cours" / "Enseignant" pill buttons
3. **Always show** `phase.explanationTeacher` in the explanation text (line 1120), removing the conditional
4. Update the `motion.div` key to remove the mode reference (line 1114)

No other files affected. The step generation logic stays the same — both `explanationShort` and `explanationTeacher` strings are still generated but only `explanationTeacher` is rendered.

