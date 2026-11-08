# Teacher Engine V1

Status: implemented as a development-only deterministic decision layer  
Scope: subtraction with regrouping first; no production routing

## Reuse matrix

| Capability | Existing implementation | Teacher Engine use | Status |
|---|---|---|---|
| Child progressive explanations | `TwoCards`, `ExplanationRenderer`, `KidExplanationFlow`, `CompactMathStepper` | Preserved as the under-11/default legacy presentation | Existing / protected |
| Verified arithmetic | `parseExpression`, `generateSteps`, `buildPlaceValueSolution` | Supplies `VerifiedTeacherSolution`; engine never recomputes correctness | Existing / reused |
| Explanation generation/cache | `useTwoCardTeaching`, `quickExplanation` | Remains the existing TwoCards service; no duplicate AI path | Existing / unchanged |
| Mastery evidence | `src/lib/mastery.ts`, `src/types/mastery.ts`, progress services | Normalized into deterministic `MasteryEvidence` input | Partial integration |
| Attempt history | `gradedWorkHistory`, `exercise_attempts`, quiz attempts | Normalized into `TeacherAttempt[]` input | Partial integration |
| Curriculum/objectives | lesson V2 contracts, grade mappings, benchmark metadata | Objective and grade are explicit decision inputs | Existing / reused |
| Prerequisite/remediation | lesson prerequisite and misconception contracts | Recommends concrete remediation; does not mutate lesson data | Partial integration |
| Hints/retry | `RuntimeMiniPracticeInline`, quiz hints, TwoCards retry | Teacher transitions model hint, retry, alternate explanation | Partial integration |
| Explain V2 visuals | `StructuredOperationGrid`, `stuwyExplainLab` | Selected for V2 demonstration only | Existing / reused |
| Teacher decision model | — | `teacherEngine.ts` | New / implemented |
| Teacher Lab | Explanation Lab only | `TeacherLabPanel.tsx` simulates six required cases | New / development-only |

## Contract and transition model

Inputs are `problem`, grade, curriculum objective, mastery evidence, previous
attempts, presentation preference, tutoring mode, and a solver-produced
`VerifiedTeacherSolution`.

Outputs are the objective, selected assistance level, strategy, French student
question/explanation, visual demonstration, expected response, progressive
hints, misconception indicators, remediation recommendation, and progression
criteria. Guided mode keeps the verified answer hidden until the learner makes
an independent correct attempt or reaches the final explanation step.

The engine has three modes:

- Guided: ask, wait, then strengthen hints.
- Teaching: explain one idea, then check understanding.
- Review: comment only on submitted work; hypotheses are marked as indicators,
  not facts.

Assistance is selected from evidence, not age alone:

- Concrete: repeated errors, repeated misconception, or mastery below 0.4.
- Standard: ordinary developing mastery.
- Concise: strong mastery with no recent errors.

The first supported pedagogical strategy is French subtraction regrouping. The
engine distinguishes the mathematical operation, the student-facing
explanation, and the visual grid demonstration. It does not silently interpret
fractions as division.

## Teacher Lab demonstration

Run the existing development server and open:

`http://127.0.0.1:4173/dev/stuwy-explain-v2`

The Teacher Lab is below the existing Explanation Lab. Use `52 - 27`, `325 -
148`, or `403 - 178`, choose a grade/mastery/mode, then select one of the six
scenarios. Compare the “Décision du professeur” panel with the separate
“Message à l’élève” panel. The “Tentative correcte”, “Donner un indice”, and
“Réinitialiser” controls demonstrate deterministic transitions.

This is a reviewer simulation, not evidence of real learning improvement.

## Limitations

- Mastery and attempts are supplied as explicit lab inputs; no production
  caller consumes the engine yet.
- The first strategy is subtraction regrouping. Other operations need their own
  pedagogical strategies and tests.
- Review mode receives a structured attempt summary; it does not infer unseen
  student work.
- Teacher and screen-reader review of French phrasing remains required.
