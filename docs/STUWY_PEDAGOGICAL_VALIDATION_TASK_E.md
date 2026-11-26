# STUWY Task E — Pedagogical Quality Validation

**Evaluation date:** 26 November 2026  
**Repository / code under review:** `UltraSaura/tutorly-navi`, `feature/explanation-v2-interactive-math`  
**Accepted runtime baseline:** `3fc22b11a3d595da53fe9b787daec475d3f233c4` (Task C technical acceptance)  
**Documentation starting point:** `72599d84a6c0ca0e185d79e27a55872249f8bbab`  
**PR #56:** remains open and draft.  
**Scope:** Pedagogical evaluation and documentation only. No runtime code changed, tests rerun, branches merged, Supabase changed, or production deployment performed.

## 1. Executive assessment

The nine V2 scenarios and complete five-step CM2 path were exercised in the live simulated math lab at [the feature preview](https://tutorly-navi-git-feature-explanation-v2-interactive-math-stuwy.vercel.app/demo.html). The preview explicitly uses simulated in-memory progress; it does not establish production persistence or a student’s long-term learning.

The equation demonstrations generally make the operation and result visible without opening “Pourquoi cette étape ?”. Strongest observed teaching sequences are the equation transformation and affine demonstration. Weakest evidence is independent transfer: several tasks reveal the target in the prompt, and the CM2 path declares “Tu sais…” after a single heavily scaffolded example. Some tasks can be completed by copying, repeated guessing or trial-and-error without explaining the mathematical relationship.

This is an internal expert-style review, **not teacher approval**. Task C’s hosted technical results are inherited evidence, not rerun: [180/180 standalone browser checks, 40/40 LessonV2Player checks, five viewport widths and CM2 smoke](https://github.com/UltraSaura/tutorly-navi/actions/runs/45887495298); [QA artifacts](https://github.com/UltraSaura/tutorly-navi/actions/runs/45887495298/artifacts/15149678492).

## 2. Evidence and scoring method

Evidence labels used below:

- **LIVE PREVIEW:** directly interacted with the simulated lab on 26 November 2026.
- **HOSTED CI (inherited):** Task C run #45887495298; proves the checks listed by its report, not conceptual learning.
- **SOURCE ONLY:** inspected component/catalog source but did not interact with that module.
- **NOT RUN / NOT VERIFIED:** evidence is insufficient for a score or claim.

The score vector is ordered **MA / EX / CU / VI / IN / RE / PR / IA / AC**:

- **MA** mathematical accuracy (20%).
- **EX** explanation clarity (15%).
- **CU** curriculum and age suitability (15%).
- **VI** pedagogical value of visuals (10%).
- **IN** meaningful interaction (10%).
- **RE** incorrect-answer remediation (10%).
- **PR** learning progression (10%).
- **IA** independent assessment (5%).
- **AC** accessibility and cognitive load (5%).

Each criterion is rated 0–5 only when directly evidenced. A number is an internal qualitative judgment, not an empirical learning outcome. “NR” means not run; “NV” means not verified. No total is calculated when any weighted criterion is NR/NV. When complete evidence later permits a total, calculate Σ(weight × score/5). Mathematical accuracy is a mandatory gate: a material mathematical error blocks acceptance regardless of total.

| Score | Anchor |
|---:|---|
| 0 | Incorrect, misleading, inaccessible, or blocks the stated objective. |
| 1 | Major weakness; only incidental support for the objective. |
| 2 | Partial support, but a learner can proceed with a consequential misconception or without needed scaffolding. |
| 3 | Adequate for the narrow task; important gaps remain. |
| 4 | Strong, accurate support with a limited improvement opportunity. |
| 5 | Clear, verified and robust support for the objective, including the relevant edge cases. |

| Criterion | 0–5 scoring anchor |
|---|---|
| MA | 0–1 contains material error; 2 incomplete/ambiguous rule; 3 correct for ordinary case; 4 correct across observed cases; 5 verified exactness and edge cases. |
| EX | 0 unintelligible; 1 action/result only; 2 partial reasoning; 3 concise and followable; 4 explains why the step works; 5 learner-facing reasoning supports prediction and self-explanation. |
| CU | 0 wrong level/notation; 1 large prerequisite mismatch; 2 significant load/language issue; 3 plausible but not teacher reviewed; 4 reviewed and suitable; 5 reviewed with differentiated support. |
| VI | 0 contradicts math; 1 decorative; 2 represents answer but not relation; 3 makes relation visible; 4 shows change/structure; 5 connects multiple representations and interpretation. |
| IN | 0 no learner action; 1 click/guess only; 2 action with constrained feedback; 3 action maps to concept; 4 meaningful prediction/manipulation; 5 requires explain/justify or transfer. |
| RE | 0 no response; 1 generic; 2 hint without diagnosis; 3 specific hint and retry; 4 misconception-targeted progressive support; 5 learner revises and explains, with support fading. |
| PR | 0 no sequence; 1 isolated task; 2 sequence without prerequisite/transfer check; 3 coherent demo→practice; 4 scaffolding fades; 5 checked transfer and adaptive next step. |
| IA | 0 no independent evidence; 1 target disclosed/answer copied; 2 independent response but easy to guess; 3 unassisted parallel check; 4 varied item and reasoning evidence; 5 transfer/delayed evidence. |
| AC | 0 blocks participation/high overload; 1 major barriers; 2 some alternatives/readability; 3 usable narrow task; 4 verified keyboard/touch/reduced-motion and manageable load; 5 verified inclusive alternatives and learner-appropriate adjustment. |

Proposed bands are applied only to a complete evidence-backed total: **85–100 ready for pedagogical review; 70–84 targeted improvement; below 70 substantial redesign**. “Ready for pedagogical review” is not approval. Current per-activity vectors contain unrun criteria and therefore do not receive totals or band labels.

## 3. V2 activity evaluations

Activity identifiers and source paths follow [the existing interactive intelligence catalog](TUTORLY_INTERACTIVE_INTELLIGENCE.md), principally the V2 activity table and Task D inventory. All entries below are **LIVE PREVIEW** unless explicitly marked otherwise. Accessibility details beyond visible controls are not inferred from the browser review.

| Scenario | MA / EX / CU / VI / IN / RE / PR / IA / AC | Observed strength and learning risk |
|---|---|---|
| IM-01 Fraction selection — `FractionSelectActivity.tsx` | 4 / 4 / 3 / 4 / 2 / 4 / 2 / 1 / NR | Equal quarters and numerator are labelled; wrong 2/4 response receives a targeted cue and progressive hints. Toggling cells allows brute-force selection; the learner is not asked why the numerator counts selected equal parts or to transfer to a new fraction. |
| IM-02 Fraction addition — `InteractiveActivityHost.tsx` (`FractionActivity`) | 5 / 4 / 3 / 4 / 3 / NR / 3 / 1 / NR | Optional four-step demo correctly explains unequal-sized parts, equivalence 1/2=2/4, adding parts and 5/4=1+1/4. One worked example and a numeric target do not establish transfer; incorrect response/hint sequence was not exercised in this review. |
| IM-03 Coordinate placement — `InteractiveActivityHost.tsx` (`CoordinateActivity`) | 5 / 3 / 3 / 4 / 3 / 3 / 2 / 1 / NR | The point model and axis controls are visible, and feedback/hints distinguish axes. The prompt already states “2 right, then 3 up” and gives A(2;3), so it tests execution more than coordinate interpretation. Drag and keyboard accessibility not retested here; inherited Task C covers its browser acceptance. |
| IM-04 Algebra tiles — `AlgebraTilesActivity.tsx` | 4 / 4 / 3 / 4 / 2 / 3 / 2 / 1 / NR | Long x-tile and unit-square mapping is concrete; wrong count identifies the coefficient. The target 2x+3 remains visible, and trial-and-error works without explaining “2 copies of x.” No concept demonstration or transfer item observed. |
| IM-05 Affine functions — `LinearFunctionActivity.tsx`, `LineGraph.tsx` | 5 / 4 / 3 / 5 / 3 / 3 / 3 / 1 / NR | Four stages correctly connect b to (0,b) and a to rise/run; visible French terms are consistent with 3e. The challenge discloses f(x)=2x+1, a=2, b=1 and construction order, so copying succeeds. A prediction/table/second-function transfer check is absent. Teacher review remains pending. |
| IM-06 Simple equation — `EquationDecompositionActivity.tsx` | 5 / 4 / 3 / 4 / 2 / NR / 4 / NR / NR | The demo shows subtracting 5 from both members, cancellation and division by 3; the “preserve equality” reason is visible without opening the optional panel. Conceptual balance is asserted more than elicited; live wrong-answer/hint and independent-mode learning quality were not re-exercised. Task C validates mode/evidence mechanics, not learning. |
| IM-07 Two-sided equation — `EquationDecompositionActivity.tsx` | 5 / 4 / 3 / 4 / 2 / NR / 3 / NR / NR | In the observed step, subtracting 2x from both members and canceling terms is accurate and visible. Review did not complete the full learner sequence; wrong-answer remediation, transfer and independent evidence remain unscored. |
| IM-08 Fractional solution — `EquationDecompositionActivity.tsx` | 5 / 4 / 3 / 4 / 2 / NR / 3 / NR / NR | Demonstration of −2x+3=8 correctly subtracts 3 then divides both sides by −2 to obtain −5/2. Learner-facing sign-rule reasoning and substitution as an independent check could be clearer. Full practice/hints were not re-exercised. |
| IM-09 Line fitting — `LineFitActivity.tsx` | NV / 3 / 2 / 3 / 2 / 2 / 2 / 1 / NR | Sliders and squared-error total make the optimization target visible; trial and error can minimize the displayed value. The activity does not explain residuals or why squaring errors is useful in the observed prompt. Mathematical computation/edge cases were not independently checked, so MA is NV. Grade 2nde is a sample label, not an approved mapping. |
| CM2 five-step path — `ExplanationV2MathLab` / existing fraction schema and host | 5 / 4 / 3 / 3 / 3 / NR / 3 / 1 / NR | Fraction identity and addition are accurate; progression gates operate. The equivalence interstitial is prose/equations rather than an enacted visual. The recap says “Tu sais additionner des quarts” after one scaffolded example, with no independent near-neighbor item; replace mastery wording with completion until transfer is demonstrated. |

**Completion-result clarity:** fraction selection reports success after selection and IM-03 distinguishes supported success in its message. Other exact completion labels and every mode’s feedback were not exhaustively recorded; no wider claim is made.

### Scenario-level teaching tests and transfer questions

| Scenario | Explain-why check needed before claiming understanding |
|---|---|
| IM-01 | “Pourquoi le 3 de 3/4 indique-t-il trois morceaux, et qu’est-ce qui rend ces morceaux des quarts ?” |
| IM-02 | Ask the learner to show that 1/2 and 2/4 name the same amount before adding. Follow with 1/4+1/2 without a visible worked answer. |
| IM-03 | Give a new point without directional words and ask the learner to state which coordinate controls each move. |
| IM-04 | Ask “Que représentent les deux tuiles x dans 2x ?” before hiding the target and presenting a new expression. |
| IM-05 | Ask the learner to predict f(0), then the next point after x increases by 1; use another a,b pair for transfer. |
| IM-06 | Ask what one residual means for one observation, then why signed errors could cancel and how squared errors change the comparison. |
| IM-07/08 | Ask the learner to predict a legal operation, state why it preserves equality, then substitute their solution into the original equation unaided. |
| CM2 | Use a structurally similar new sum after the model, with no answer revealed, before any “you know how” claim. |

## 4. Representative legacy and isolated modules

The following are **SOURCE ONLY** unless Task D catalog evidence explicitly identifies an integrated path. No live preview or test fixture was exercised for these modules in Task E; no scores are assigned. Paths and branch heads are traceable in [the catalog’s Task D branch inventory](TUTORLY_INTERACTIVE_INTELLIGENCE.md).

| Module family and source path | Source-based pedagogical observation | Limitation / next check |
|---|---|---|
| TwoCards — `src/components/TwoCards.tsx` (main `5b5ea1d`) | Lesson explanation is composed with stepper presentation and practice links; distinct from an activity’s own evidence. | Source only; inspect student comprehension and answer-reveal behavior in an authenticated Learn/Tutor flow. |
| CompactMathStepper — `src/components/CompactMathStepper.tsx` (main `5b5ea1d`) | Structured computation sequence can make intermediate transformations legible. | A correct step sequence does not itself establish why; inspect operation-specific text and whether the learner predicts/produces steps. Do not modify in this task. |
| Graduated number line — `src/components/practice/GraduatedNumberLineActivity.tsx` (main `5b5ea1d`) | Source includes pointer placement, enlarged targets, feedback, hints/retry, and non-drag support paths. | Source only; test actual keyboard/touch placement, fraction/decimal scales and whether feedback diagnoses a misconception. |
| PedagogicalVisual — `src/components/lessons/PedagogicalVisual.tsx` (main `5b5ea1d`) | A shared static renderer covers number lines, fraction models, coordinates, shapes, angles and symmetry with labels. | Static representation is not an interactive assessment. Verify each authored visual’s scale, alt text and fit to prompt. |
| Counting/place-value models — `CountableDotModel.tsx`, `CountableObjectModel.tsx` (guided-practice branch `a57846c`) | Separate dot/object forms can support one-to-one counting and grouping; object model source hides the total. | Source only and branch-isolated; check whether a caller inadvertently reveals total (dot model default) and whether ten grouping represents place value accurately. |
| Addition across ten — `AdditionAcrossTenModel.tsx` (guided-practice branch) | Tens-frame split can show completion of the next ten and remaining units. | Source only; verify students see conservation/partition and not just a count of displayed dots. |
| Subtraction with dots — `SubtractionWithDotsModel.tsx` (guided-practice branch) | Removed/remaining dot states can represent take-away. | Source only; inspect relation to difference/comparison and answer reveal controls in a real route. |
| Equal groups — `EqualGroupsTransfer.tsx` (guided-practice branch) | Source contains an “Essayer sans le modèle” transition and hints connecting groups to repeated addition—a useful transfer pattern. | Source only; verify independent item parameters and that assisted success is not credited as independent mastery. |
| Guided arithmetic families — `GuidedFamilyActivity.tsx` (guided-practice branch) | Operation→model→answer sequence and progressive hints are represented in source. | Source only; validate prerequisite fit and error-specificity in a rendered fixture. |
| Coordinates — `CoordinatePlaneActivity.tsx` (guided-practice branch) | Input/plot modes, retained axes and hints are described in catalog source; feedback may avoid revealing which axis is wrong immediately. | Isolated from main; compare with IM-03 only after both contracts are tested. |
| STUWY subtraction guide — `SubtractionVisualGuide.tsx` (explain-v2 branch `cec2b07`) | Session completion steps drive a visual subtraction guide. | Source only and branch-isolated; verify borrowing/place-value interpretation and route integration before reuse. |

Task D also lists other isolated lesson, practice and teacher components; this representative sample does not claim a second exhaustive branch audit.

## 5. Curriculum and French language review

### Affine function, sample 3e

The preview consistently uses **fonction affine**, **coefficient directeur (a)**, **ordonnée à l’origine (b)** and (f(x)=ax+b). Its demonstration correctly connects (f(0)=b) to the vertical-axis intercept and a unit increase in (x) to a vertical change of (a). In the observed challenge, however, the exact target and parameters are disclosed, so it is unsuitable as independent assessment.

Édubase fiche 22940 describes a differentiated affine-functions path designed for Troisième; it is an example resource, not a Stuwy curriculum approval ([Édubase 22940](https://edubase.eduscol.education.fr/fiche/22940)). As of 26 November 2026, the 2026 cycle 4 programme is phased in: 5e from 2026–27, 4e from 2027–28 and 3e from 2028–29 ([official arrêté](https://www.education.gouv.fr/bo/2026/Hebdo10/MENE2602912A); [Éduscol implementation note](https://eduscol.education.gouv.fr/5736/ressources-d-accompagnement-du-programme-de-mathematiques-au-cycle-4)). Thus this year's 3e learners remain under the prior applicable programme. The 2015 cycle 4 programme says function notions are stabilized in 3e and asks students to read/interpret graphically the coefficients of an affine function ([2015 programme, cycle 4](https://www.education.gouv.fr/bo/15/Special11/MENE1526483Aannexe3.htm)). This supports plausibility of the topic/level, not approval of exact scope, notation, example values or sequencing.

**Review status:** teacher review still required for grade-year applicability, prerequisites, wording, cognitive load and whether the progression from constant function to (b), then (a), is appropriate for the intended class.

### Cross-scenario language checks

- “Coefficient directeur” and “ordonnée à l’origine” are appropriate formal terms for the 3e sample, but a first encounter should pair each with a plain-language explanation.
- Keep coordinate vocabulary (“abscisse”, “ordonnée”) after a concrete horizontal/vertical explanation; do not place the answer’s movement directions in an assessment prompt.
- Prefer “morceaux de même taille” before “dénominateur commun”; avoid telling learners only to add numerators as a rule to memorize.
- The observed French prompts are concise and direct. This review did not conduct a full native-speaker proofread of every branch, screenreader announcement, or age-group readability study. Grammar findings beyond those visible in the preview remain unverified.
- “Tu sais…” should be reserved for independent evidence; lesson completion and exposure are not mastery.

## 6. Competitor research and transferable principles

The catalog/research files document a mixture of prior observations and public product descriptions. They do not support universal efficacy claims.

| Product | Evidence available | Transferable principle | Limits |
|---|---|---|---|
| Brilliant | Existing research catalog includes prior observation notes and public descriptions; its official teaching article describes concrete-to-symbolic exploration, interactive visualizations, immediate feedback and gradual scaffolding. | Let learners act on a representation before formalizing; give a specific next thought; fade support and check transfer. | The catalog marks some prior observations as reconstructed, not independently replayed. Official product copy is not independent learning-outcome evidence. No proprietary UI/content/code should be copied. |
| Synthesis Tutor | Two documented partial observations: number-line cards (100–110 range) with targeted endpoint feedback; multiplication dot blaster with grouping/counting, pattern recognition and reverse-factor transfer. | Use errors to direct attention to a relevant feature; move from concrete groups toward relationship/pattern; include a changed example. | These were bounded session notes, not a comprehensive product audit. Unknown: later retries, hints, accessibility, adaptive policy and full learning outcomes. |
| Photomath | Catalog describes a broad “worked-step” inspiration; current official product page says step-by-step explanations are intended to help users learn as they go ([Photomath](https://photomath.com/)). | Show a mathematically valid step sequence and invite the learner to perform/predict the next transformation before revealing it. | No independent Stuwy evaluation of Photomath's current UI or effectiveness was available. This report does not claim proprietary behavior beyond the cited public description. |

General recommendations (not competitor facts): one objective per interaction; visual change must correspond to a named mathematical relation; feedback should diagnose the learner’s move; use progressively less support; require an unassisted near-neighbor or transfer item before mastery attribution.

## 7. Stuwy pedagogical principles

Use the stages as an adaptable toolkit, not a mandatory seven-screen template.

| Stage | Purpose | Evidence boundary |
|---|---|---|
| Discover | Surface a pattern, prediction or question with a concrete example. | Exposure/initial hypothesis only. |
| Understand | Name the relation and explain why a transformation is valid. | A viewed explanation is not demonstrated mastery. |
| Manipulate | Let the learner change a representation and observe the mathematical consequence. | Successful manipulation can still be guessing. |
| Practise together | Prompt one step, give targeted feedback and fade hints. | Record as assisted if hints, worked steps or guided choices are used. |
| Practise independently | Ask an unscaffolded parallel problem with no answer in the prompt. | Only this mode can support independent assessment under current contracts. |
| Remediate | Address a diagnosed prerequisite/misconception with a simpler representation, then recheck. | Preserve the original error and distinguish supported recovery from independent evidence. |
| Transfer | Change values, representation or context while preserving the underlying concept. | Evidence is stronger when the learner explains or predicts, not only selects. |

Adaptation rules:

- **Younger learners:** concrete/visual first, shorter directions, one action at a time; introduce formal vocabulary after the referent is clear.
- **Older learners:** move more quickly to symbols/graphs but retain a concrete link when a misconception appears.
- **High mastery:** reduce hints and ask for prediction, justification or transfer; do not force a full demo.
- **Developing mastery:** model one example, then ask the learner to choose/complete the next step.
- **Prerequisite gap:** pause the current objective, teach/check the missing prerequisite, then resume with the original task.
- **Detected misconception:** use a module whose observed feedback maps to that misconception; one wrong answer alone is not enough to diagnose.
- **High conceptual complexity:** slow the representation change and name what stays invariant.
- **Help request:** offer a smallest-useful hint first; keep the learner’s work; reveal a full explanation only by request or after unsuccessful supported attempts.
- Keep exposure, assisted success and independent assessment as separate evidence fields. Never treat a watched demo, hint use, or guided success as independent mastery.

## 8. Before / after examples

These are proposed copy patterns, not live code changes.

| Topic | Current observed or typical wording | Proposed stronger explanation |
|---|---|---|
| Equivalent fractions | “On partage la moitié en deux quarts.” | “La moitié est toujours la même quantité. Si je partage chaque moitié en deux, j’obtiens deux quarts : (1/2=2/4). Qu’est-ce qui a changé : la quantité ou la taille des parts ?” |
| Equation balance | “On soustrait 5 aux deux membres pour conserver l’égalité.” | “Les deux membres ont la même valeur. Si j’enlève 5 de chaque côté, ils restent égaux; les (+5) et (-5) s’annulent à gauche. Que reste-t-il à droite ?” |
| Affine function | “(b) est l’ordonnée à l’origine; (a) est le coefficient directeur.” | “Quand (x=0), (ax=0), donc (f(0)=b) : la droite passe par ((0,b)). Si (x) augmente de 1, (f(x)) augmente de (a). Pour (a=2,b=1), on part de ((0,1)) et on arrive à ((1,3)).” |
| Line fit | “Réduis la somme des erreurs au carré.” | “Pour chaque point, compare la valeur observée à celle prévue par la droite : l’écart s’appelle un résidu. Les écarts positifs et négatifs peuvent s’annuler; les mettre au carré évite cette annulation. Essaie une droite, puis compare la somme.” |

## 9. Prioritized correction backlog

All items are recommendations; none were implemented in Task E.

| Priority / module | Observed behavior and why it falls short | Proposed behavior and student example | Dependencies | Acceptance criteria | Phase |
|---|---|---|---|---|---|
| P1 IM-05 `LinearFunctionActivity.tsx` | The independent challenge reveals (f(x)=2x+1), (a=2), (b=1); correct completion can be copied. | Keep the target in demo/guided mode; independent prompt asks “Construis une droite passant par (0,−1) et montant de 2 quand x augmente de 1” or asks for a new (a,b). | Validated prompt/schema and evidence modes. | Hide answer parameters in solo mode; verify new values; include one explain/predict transfer; assisted completion remains assisted. | Task E follow-up |
| P1 CM2 path / fraction schema | Path says “Tu sais additionner des quarts” after one supported example; false confidence risk. | Say “Étape terminée” and ask a new unscaffolded (1/4+1/2) item before a knowledge claim. | Existing fraction schema and completion wording. | No mastery wording from demo/guided example alone; gate transfer item and preserve exposure/assisted/independent evidence. | Task E follow-up |
| P1 IM-03 `InteractiveActivityHost.tsx` | Prompt gives coordinates and movement recipe, so answer is revealed. | Ask learner to plot a new ordered pair, then explain which coordinate controls horizontal movement. | Existing coordinate schema; ensure the question can vary. | Assessment prompt omits movement recipe; new point differs; feedback identifies axis without giving full answer; independent evidence only on unassisted response. | Task E follow-up |
| P1 IM-01 `FractionSelectActivity.tsx` | Toggle/count interaction permits brute-force; no explanation or new fraction transfer. | After selection ask why numerator 3 means three equal parts; retry with e.g. 2/5 without labels revealing count. | Existing fraction schema and exact grading. | One explain/predict check and an unassisted changed-value item; hints preserve work and never count as independent success. | Task E follow-up |
| P2 IM-04 `AlgebraTilesActivity.tsx` | Visible target and coefficient hint permit copying tile counts; no explicit meaning of repeated x. | Ask “Montre 2x comme deux groupes de x; combien de tuiles x ?” then remove target for a parallel expression. | Existing tile model; no new activity kind. | Learner links coefficient to number of x tiles; feedback corrects coefficient/unit confusion; one unassisted new target. | Task E follow-up |
| P2 IM-06–08 `EquationDecompositionActivity.tsx` | Operation and cancellation are clear, but “preserve equality” is asserted more than tested; fractional division sign rule is under-explained. | Ask learner to predict operation and state “same change on both sides”; verify solution in original equation, including (-5/2). | Existing three modes/evidence distinction; keep demonstrations correct. | Operation-before-result remains visible; guided explanation and solo item separate; incorrect operation gets targeted hint; substitution check is unassisted in assessment. | Task E follow-up |
| P2 IM-02 / CM2 equivalence step | The interstitial explains equivalence in text; visual transformation only appears in the optional/full demo. | Show the same amount subdivided into fourths and invite learner to count before adding. | Existing fraction bar renderer; no new activity type. | Visual preserves total length/area; learner identifies (1/2=2/4) before sum; feedback covers unequal denominators. | Task E follow-up |
| P2 IM-09 `LineFitActivity.tsx` | Squared-error score invites slider trial-and-error without teaching residuals or square rationale. | Name observed/predicted values and residual; show why opposite-signed errors can cancel before squared comparison. | Existing data and score; confirm math with a teacher; 2nde mapping. | Correct residual sign and squared values on examples; learner explains which line has lower sum; score math unit-tested; separate independent interpretation item. | Later capability-development |
| P2 GP counting/visual family (isolated) | Source-only dot model defaults to showing a total, which may reveal an answer if used as assessment. | Use hidden-total object model or set count display only after learner response. | Confirm actual callers and schema on integration branch. | Rendered fixture proves target is not revealed before response; accessible count representation and feedback tested. | Task F integration |
| P2 legacy stepper — `CompactMathStepper.tsx` | Source-only sequence may expose correct transformations without checking learner reasoning. | Reuse unchanged for explanation; later add a host prompt to predict/explain the next step without editing the component. | Call-site mapping and evidence contract. | Review representative task in Learn/Tutor; retain stepper output; independent evidence only from separate item. | Task F integration |

## 10. Human teacher review checklist

A qualified teacher should record reviewer, date, grade/year and decision for each activity.

- [ ] Confirm the exact applicable curriculum version and year of implementation.
- [ ] Verify mathematical correctness of prompts, expected answers, visual scales and edge cases.
- [ ] Confirm prerequisites and whether the concept belongs at the proposed grade.
- [ ] Check French terminology, notation, grammar, sentence length and cultural/contextual fit.
- [ ] Ask a learner to explain why each key action works, without opening an optional panel.
- [ ] Check that independent prompts do not reveal their answers or operation recipe.
- [ ] Review wrong answers against likely misconceptions; confirm hints preserve learner work and fade support.
- [ ] Confirm completion language distinguishes lesson completion, assisted success and independent mastery.
- [ ] Review mobile/keyboard/screen-reader and reduced-motion alternatives with actual learners.
- [ ] Observe a learner transfer the concept to a changed value/representation/context.
- [ ] Record unresolved concerns; do not convert internal scores into teacher approval.

## 11. Future lesson architecture recommendations

These are recommendations, not implementation.

1. Preserve the existing validated activity schema, host and LessonV2Player progression gates; do not invent a new component identifier or unsupported schema.
2. Represent evidence explicitly as exposure, assisted practice, independent assessment and transfer; keep attempts, hints, retries and mode in the event payload.
3. Do not infer mastery from completion callback alone. Require a configured independent item and, for higher claims, a transfer check.
4. Keep prompt, expected answer, misconception feedback and hint sequence attached to the same validated activity spec so teacher preview and runtime cannot drift.
5. Add teacher review metadata (reviewer, curriculum version, approval state, date) without treating a grade label as approval.
6. Ensure a generated lesson selects only allowlisted existing activities and valid schemas; if none fits, use a supported explanation/visual plus diagnostic prompt, or omit an interactive block and flag the authoring gap.
7. Keep Task F integration choices separate from Task E corrections; first address the P1 copying/overclaim issues in existing activities, then consider adapters for isolated modules.

## 12. Limits and evidence links

- This was qualitative review of the simulated preview, not a controlled student study, teacher observation, or production lesson test.
- Keyboard, touch, pointer drag, reduced-motion, exact viewport and screen-reader checks were **not rerun** in Task E. Use Task C hosted evidence for technical acceptance only.
- No Task E tests or builds were run. No screenshots were captured in this review.
- Legacy and feature-isolated components are **SOURCE ONLY**; Task D’s branch heads/source paths and status should be consulted before reuse.
- Competitor observations are bounded by the existing research notes and public descriptions, not a current comprehensive comparison.
- Teacher review remains pending for affine 3e curriculum fit and for all sample curriculum mappings.
- [Task C accepted hosted run](https://github.com/UltraSaura/tutorly-navi/actions/runs/45887495298) · [QA artifact](https://github.com/UltraSaura/tutorly-navi/actions/runs/45887495298/artifacts/15149678492) · [Task D catalog](TUTORLY_INTERACTIVE_INTELLIGENCE.md) · [2015 cycle 4 programme](https://www.education.gouv.fr/bo/15/Special11/MENE1526483Aannexe3.htm) · [2026 programme rollout](https://www.education.gouv.fr/bo/2026/Hebdo10/MENE2602912A) · [Édubase 22940](https://edubase.eduscol.education.fr/fiche/22940).

## 13. Result

**TASK E PARTIAL — PEDAGOGICAL VALIDATION GAPS REMAIN**

The report is complete as an evidence-labelled internal review. P1 answer disclosure/mastery claims, line-fit mathematical validation, human teacher review and untested accessibility/evidence behaviors remain open. No code changes were made.
