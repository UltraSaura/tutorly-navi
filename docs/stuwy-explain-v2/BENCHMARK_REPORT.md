# Stuwy Explanation Lab — 30-exercise benchmark

Updated 2026-11-07. The reproducible source of truth is [`stuwyExplainBenchmark.ts`](../../src/features/explanations/stuwyExplainBenchmark.ts), executed by `stuwyExplainBenchmark.test.ts`. Every row records the original problem, grade, objective, expected result and method, generated-step policy, mathematical verification, pedagogical clarity, visual alignment, support status, and limitations.

No Photomath reference material was supplied, so no Photomath comparison is claimed. Supported rows are evaluated against the deterministic renderer and the benchmark test; pedagogical clarity remains a human-review item where noted.

## Summary

| Status | Count | Meaning |
|---|---:|---|
| Fully supported | 16 | Written arithmetic generated and result verified. |
| Partially supported | 0 | No benchmark case is silently promoted to partial support. |
| Unsupported | 14 | Fractions, geometry, word-problem modeling, or unsupported decimal operations are explicitly not generated. |

## Results

| ID | Grade | Domain | Problem | Expected result | Status |
|---|---|---|---|---|---|
| CE2-A01 | CE2 | arithmetic | 58 + 67 | 125 | full |
| CE2-A02 | CE2 | arithmetic | 72 − 38 | 34 | full |
| CE2-A03 | CE2 | arithmetic | 6 × 7 | 42 | full |
| CE2-A04 | CE2 | arithmetic | 84 ÷ 4 | 21 | full |
| CE2-G01 | CE2 | geometry | rectangle 6×4 | 20 cm | unsupported |
| CE2-W01 | CE2 | word problem | 12 + 7 billes | 19 billes | unsupported |
| CE2-F01 | CE2 | fractions | moitié | 1/2 | unsupported |
| CE2-D01 | CE2 | decimals | compare 2,5 / 2,05 | 2,5 > 2,05 | unsupported |
| CM1-A01 | CM1 | arithmetic | 403 − 178 | 225 | full |
| CM1-A02 | CM1 | arithmetic | 247 × 36 | 8892 | full |
| CM1-A03 | CM1 | arithmetic | 907 ÷ 4 | 226 reste 3 | full |
| CM1-D01 | CM1 | decimals | 125,6 + 8,75 | 134,35 | full |
| CM1-F01 | CM1 | fractions | 3/8 + 2/8 | 5/8 | unsupported |
| CM1-G01 | CM1 | geometry | carré côté 7 | 49 cm² | unsupported |
| CM1-W01 | CM1 | word problem | 3×24 − 15 crayons | 57 | unsupported |
| CM1-A04 | CM1 | arithmetic | 304 − 108 | 196 | full |
| CM2-F01 | CM2 | fractions | 3/4 + 1/8 | 7/8 | unsupported |
| CM2-A01 | CM2 | arithmetic | 1005 ÷ 5 | 201 | full |
| CM2-D01 | CM2 | decimals | 12,5 − 3,75 | 8,75 | full |
| CM2-A02 | CM2 | arithmetic | 42 × 18 | 756 | full |
| CM2-G01 | CM2 | geometry | triangle base 8, hauteur 5 | 20 cm² | unsupported |
| CM2-W01 | CM2 | word problem | 4 cahiers à 12 €, puis 7 | 21 € | unsupported |
| CM2-A03 | CM2 | arithmetic | 999 + 1 | 1000 | full |
| 6E-A01 | 6e | arithmetic | 864 ÷ 8 | 108 | full |
| 6E-A02 | 6e | arithmetic | 1204 − 689 | 515 | full |
| 6E-F01 | 6e | fractions | compare 5/6 / 7/9 | 5/6 > 7/9 | unsupported |
| 6E-G01 | 6e | geometry | angles sur une droite | 115° | unsupported |
| 6E-W01 | 6e | word problem | 3/5 de 40 élèves | 24 | unsupported |
| 6E-D01 | 6e | decimals | 7,5 ÷ 0,5 | 15 | unsupported |
| 6E-A03 | 6e | arithmetic | 75 ÷ 6 | 12 reste 3 | full |

## Quality gate

- Mathematical correctness: PASS for all 16 supported rows; the test compares the generated result (or quotient/remainder string) with the expected result.
- Curriculum appropriateness: PARTIAL. Grade/objective metadata is recorded, but classroom review is still required for phrasing and pacing.
- Intermediate completeness: PASS for the supported written-operation model; regrouping, carries, partial products, quotient digits and bring-down events are represented.
- Age clarity: PARTIAL pending teacher review; annotations are explicit but the renderer does not yet adapt wording by grade.
- Visual accuracy: PASS for the tested place-value assignments; new baselines cover regrouping and a remainder case.
- Semantic animation: PARTIAL. Events have source/destination columns and reduced-motion behavior, but the current visual harness captures deterministic states rather than temporal motion trajectories.
- Accessibility: PASS for reduced-motion capture, semantic labels, and text alternatives for annotations; a manual screen-reader pass remains advisable.
- Guides understanding: PARTIAL. The operation remains visible and changed values are shown, but fractions, geometry and word-problem reasoning are not implemented.

Product-owner readiness: suitable for evaluation of supported written arithmetic, not a complete general-purpose math tutor. No production integration or deployment was performed.
