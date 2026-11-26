# Tutorly / Stuwy — Interactive Learning Intelligence
> **Living knowledge base for humans, Codex, Claude, and other coding agents.**
>
> **Status snapshot:** 2026-11-25 · **Repository:** `UltraSaura/tutorly-navi` · **Working branch:** `feature/explanation-v2-interactive-math` · **Draft PR:** [#56](https://github.com/UltraSaura/tutorly-navi/pull/56)
>
> **Scope:** The seven newly implemented Explanation V2 interactive math activity kinds and their supporting modules, including IM-D01 and IM-D02. This is **not** a claim to inventory every pre-existing animation across Tutorly. Extend this catalogue as modules are audited or created.
>
> **Safety:** This is a preview-only branch; do not merge, deploy to production, change Supabase data, or modify Universal Tutor, TwoCards or CompactMathStepper without explicit approval.

## 1. Where to see the activities

**Current branch preview:** [Interactive Math Lab](https://stuwy-git-feature-explanation-v2-interactive-math-stuwy.vercel.app/demo.html)

- Click **CM2 · Sélectionner 3/4** for the selectable fraction strip.
- Click **CM2 · Additionner** for guided fraction addition.
- Click **4e · Coordonnées** to move a point on a grid.
- Click **5e · Tuiles** to construct an algebraic expression.
- Click **4e · Fonctions** to change slope and intercept.
- Click **5e · Équations (simple)** to animate 3x + 5 = 20.
- Click **4e · Équations (deux côtés)** to solve 5x − 4 = 2x + 8.
- Click **3e · Équations (fraction)** to solve −2x + 3 = 8 exactly.
- Click **2nde · Ajustement** to fit a line to observations.
- Click **Parcours complet CM2 · 5 étapes** to see a simulated lesson sequence with progression gates.

The URL is a **Vercel preview** and may require Vercel authentication/share access; it is not the production app. Preview hostname is not a permanent release URL. The lab is standalone (`demo.html`), uses simulated in-memory progress, and does **not** save student data. In local development, run `npm ci && npm run dev` and visit `http://localhost:8080/dev/explanation-v2-math` (confirm the Vite port).

## New teaching module — guided math demonstrations (IM-D01)

**Status:** Implemented in the feature branch; latest full IM-D02 regression CI PASS on 2026-11-25 ([run #45714358708](https://github.com/UltraSaura/tutorly-navi/actions/runs/45714358708)). **This is a reusable teaching component, not a seventh graded activity kind.**

- **Where:** `src/features/explanation-v2/MathDemonstration.tsx` (generic step player, formula text, visual state, previous/next/replay, practice handoff); `src/features/explanation-v2/LinearFunctionActivity.tsx` (script generator and three learning modes); `src/features/explanation-v2/LineGraph.tsx` (animated rise/run visual guides); `src/features/explanation-v2/InteractiveActivityHost.tsx` (optional fraction demo).
- **Purpose:** Give an understandable, original **step-by-step visual mathematical explanation**, with the learner controlling the pace. Inspired by the broad pedagogy of worked solutions (e.g. Photomath), **without copying proprietary content, UI, animation assets or code**.
- **Function graphs:** **Comprendre** (four-stage demonstration: horizontal line → y-intercept → slope → recap) → **Explorer** (free manipulation without scoring) → **M’entraîner** (independent interactive challenge). The function activity starts in **Comprendre**; students who already know the concept may skip to the challenge.
- **Fraction addition:** **Voir la démonstration pas à pas** optionally shows four derived steps: identify fractions → rewrite in equal-sized parts → add colored parts → interpret the result. Returning to the exercise does not change attempts, hints, selected answer or completion.
- **Visual animations:** Graph transitions and dashed rise/run guides, stepwise fraction-bar transformations. Navigation is manually paced; no autoplay, sound, narration, or video yet. Respect reduced-motion settings.
- **Lesson:** YES, displayed as part of the `linear-function` and `fraction-bar` V2.0 activity UI; no change to lesson block sequence schema.
- **Practice:** CANDIDATE, not integrated.
- **Homework explanation:** CANDIDATE, not integrated with Universal Tutor.
- **Teacher/Admin:** CANDIDATE, no editor or generator mapping yet.
- **Demo:** YES in the two existing activity tabs once a preview deployment includes the changes.
- **QA:** `MathDemonstration.test.ts`, `qa/explanation-v2-browser.mjs` on three viewports; latest results must be verified after CI completes.
- **Limitations:** This is not a general computer-algebra system or an automatic solution generator; demonstration scripts currently cover **affine functions and the restricted fraction addition case only**. They derive mathematical quantities from validated structured specs, not arbitrary user-entered equations. No learning outcome or mastery score is recorded by viewing a demonstration.

**Agent rule:** New demonstration scripts must use validated mathematical data, explicitly show each transformation, include grade-appropriate explanations and a clear handoff to unassisted work. Add a script registry and approval checks before automatic lesson generation. Never count a demonstration view as a solved question.

## New teaching module — animated mathematical decomposition (IM-D02)

**Status:** Implemented and validated on the feature branch; **GitHub CI PASS** ([run #45714358708](https://github.com/UltraSaura/tutorly-navi/actions/runs/45714358708)), with a READY Vercel preview at the same source commit. **IM-07** is the associated seventh validated activity kind (`equation-decomposition`).

- **Goal:** Original Photomath-style mathematical decomposition with explicit, validated steps and age-appropriate French reasoning, followed by learner participation. No competitor artwork, code, or proprietary animation is used.
- **Mathematics:** `equationSolver.ts` supports bounded integer-coefficient equations **ax + b = dx + c** with a unique rational solution, including negative coefficients, variables on both sides, and fractions as answers. It normalizes fractions exactly and checks every integer-coefficient transformation for algebraic equivalence. Verification substitutes the rational answer in both original members without rounding.
- **Animation (IM-D02.1):** `EquationDecompositionActivity.tsx` + `equationTermVisual.ts` + `equationAnimations.css` show the original left/right members, the same operation on both, **individually highlighted and animated cancellation pairs**, the remaining terms that must combine, then the transformed equation. A negative coefficient is explicitly canceled by dividing both members by that coefficient; exact substitution is shown separately. CSS motion is disabled for `prefers-reduced-motion: reduce`. This is **not** yet full spatial token morphing with measured start/end positions, drag-to-cancel, or arbitrary-expression algebra.
- **Modes:** **Comprendre** (manual operation → result → explanation, previous/replay); **Résoudre ensemble** (choose the valid next operation, targeted feedback); **M’entraîner seul** (strict integer/fraction input, sign-error feedback, three hints). Viewing a worked step or using guidance marks the activity as assisted; independent success requires a first-attempt solo answer without help.
- **Curriculum:** Samples at 5e, 4e, 3e are illustrative and **not teacher-approved curriculum mappings**. Content intended for students around age 11+; no automatic age assignment.
- **Lesson V2.0:** **YES**, through the existing validated `interactive_activity` block and host; no published lessons updated.
- **Practice:** **CANDIDATE**, no session adapter.
- **Homework explanation:** **CANDIDATE**, no Universal Tutor integration.
- **Teacher/Admin:** **CANDIDATE**, no picker or approval workflow.
- **Standalone demo:** **YES in source** (three equation tabs); deployed URL may lag or require authentication.
- **Tests:** `equationSolver.test.ts` exercises thousands of bounded cases, exact rational arithmetic, negative and both-sided equations; `equationTermVisual.test.ts` checks inverse-term pairs and exact substitutions across a bounded grid; browser QA now asserts individual canceled terms, grouping, fractional substitution and reduced-motion behavior at 375/447/1280px. **IM-D02.1 PASS:** 90 isolated browser checks at 375/447/1280px, 18 real-player checks, production-built standalone demo smoke, pure unit tests, lint, typecheck and build in [run #45716217322](https://github.com/UltraSaura/tutorly-navi/actions/runs/45716217322), commit `5728f7515`.
- **Limits:** Not a camera scanner, OCR pipeline, general CAS, arbitrary expression parser, quadratic solver, or universal Photomath replacement. Only the specified linear template is supported. No student data persistence, automated generator mapping, voice, or analytics integration.

### IM-D02.2 — Focused, low-clutter math workspace (feedback from screenshot review, 26 Nov 2026)

- **Problem observed:** oversized left/right equation cards, large mode buttons, repeated original equation, multiple explanatory paragraphs and competing restart buttons obscured the mathematical transformation.
- **New UI:** one centered equation state at a time (**before → highlighted operation/individual terms → simplified result**), with the solver and underlying algebra unchanged. The verification step likewise moves from the original equation to explicit substitution to equality.
- **Hierarchy:** compact three-mode selector (Comprendre / Ensemble / À toi); brief objective and optional complete prompt; step title and slim progress indicator; single centered math workspace; one primary Next/Animate action plus Previous; optional `Pourquoi cette étape ?` disclosure; low-emphasis restart link.
- **Responsive:** 44px minimum mode/navigation targets, bounded math canvas, wrapping terms, reduced-motion behavior retained. Tests assert no separate left/right cards, only one active equation stage, explanation disclosure and no horizontal overflow at 375/447/1280px.
- **Status:** implementation and QA PASS in feature branch: [GitHub Actions #45718920651](https://github.com/UltraSaura/tutorly-navi/actions/runs/45718920651), code commit `46a6283c0` — 90/90 isolated browser checks (375px, 447px, 1280px), 18/18 lesson-player checks, standalone production-built demo smoke, unit, TypeScript, lint and build. No changes to solver, grading, published lessons or production.
- **Design rule:** show **one mathematical idea per stage**; never hide the actual operation or verification behind a vague animation. Additional explanations are on demand, not repeated on every stage.
- **Preview limitation (26 Nov 2026):** the available READY Vercel preview for this layout is at commit `23b7b66b8` (core compact workspace). Newer commits include the smaller lab reset and additional QA assertions, but a fresh Vercel deployment was blocked by the account's free-tier daily API deployment limit (100/day). GitHub CI built and tested the newer code successfully; no production deployment was attempted.


### IM-D02.3 — Always-visible teaching instruction (student screenshot feedback, 26 Nov 2026)

- **Observed problem:** the simplified interface made the algebra more prominent, but a learner still had to expand `Pourquoi cette étape ?` to know *what operation was happening*.
- **Pedagogical contract:** **What we're about to do → What we're doing → What we obtained** is always visible directly **above the equation animation**, changing with the three demonstration stages. The optional `Pourquoi cette étape ?` contains only the longer conceptual justification and general equality rule.
- **Concrete example:** `3x + 5 = 20` → "Pour isoler le terme en x, on va soustraire 5 aux deux membres." → "On soustrait 5 à gauche ET à droite pour conserver l’égalité." → "Les nombres opposés s’annulent à gauche. À droite, 20 − 5 = 15." This short narration does **not** require opening a disclosure.
- **Exactness:** `equationStepInstruction.ts` derives the instruction from validated solver steps for `subtract-variable`, `subtract-constant`, `divide`, `verify`; handles positive/negative constants, both-sided x terms, negative divisors and exact fractional answers. No AI-generated math.
- **Visual sign clarity:** canceled terms use a small corner × marker instead of a strike-through line across `+`/`−` signs, so `+5` and `−5` remain visually distinct.
- **QA:** `equationStepInstruction.test.ts` validates all three stages and negative/fractional cases. Browser QA checks the always-visible instruction in stage 0/1/2, the optional Why panel remaining closed, and exact verification. Existing 375/447/1280px and reduced-motion checks remain.
- **Status:** implemented on the isolated feature branch; **CI PASS** for the final runtime-code commit `64fa31dd8` in [GitHub Actions #45722482002](https://github.com/UltraSaura/tutorly-navi/actions/runs/45722482002): 90/90 interactive browser checks (375/447/1280px), 18/18 lesson-player checks, standalone production-built demo smoke, unit tests, TypeScript, lint and build. The subsequent documentation-only commit does not affect runtime behavior. No merge or production release.

### IM-D02.4 — Guided learning shows the operation before the answer (26 Nov 2026)

- **Observed gap:** in `Résoudre ensemble`, a correct multiple-choice operation immediately displayed the simplified equation. The learner never saw the cancellation they had chosen; guided practice was less explanatory than the `Comprendre` demonstration.
- **New three-stage guided flow:** (0) choose a valid operation from the original equation → (1) **watch the exact operation and its canceled/grouped terms**, with an always-visible, solver-derived French explanation → (2) explicitly choose **Voir le résultat** to reveal the simplified equation and a short result explanation. Only then can the learner advance or finish the final verification.
- **UI consistency:** reuse the same single-equation `TransformationVisual` and `equationStepInstruction` used in `Comprendre`; optional `Pourquoi cette étape ?` retains the deeper justification. Remove duplicated success text to keep the view focused.
- **Correctness:** incorrect choices still receive targeted feedback and cannot advance. Assisted/independent scoring rules and exact equation validation are unchanged. Switching between learning modes retains the current guided stage while mounted.
- **QA:** browser tests at 375/447/1280px verify wrong operation feedback, operation-before-result gating, cancellation tokens, optional explanation, state preservation on mode switch, complete guided solve including substitution verification, and assisted completion. All other activities remain unchanged.
- **Status:** **CI PASS** in [GitHub Actions #45725652079](https://github.com/UltraSaura/tutorly-navi/actions/runs/45725652079) on code commit `81b226606`: **93/93 isolated browser checks** across 375/447/1280px, **18/18 lesson-player checks**, standalone production-built demo smoke, unit tests, lint, TypeScript and build. Feature branch only; no merge, production release, Supabase or Universal Tutor changes.

**Next iteration:** Validate IM-D02.1 with teachers and students, then evaluate true position-to-position token morphing and accessible mathematical notation; add structured authoring and safe objective mapping before expanding to other equation families.

## 2. Terminology and deployment status

- **Implemented:** Component, mathematical grading, validated activity schema and demo exist in this branch.
- **Lesson-compatible (opt-in):** `LessonV2Player` renders an `interactive_activity` block when an existing **V2.0** lesson explicitly contains a valid spec; completion can gate Continue. It does **not** mean all published lessons contain the activity.
- **Practice-ready component:** A component can be reused in Practice, but **no direct Practice route/session integration is implemented in this PR**.
- **Explanation-ready component:** Can be reused in a guided homework/exercise explanation, but **not integrated into Universal Tutor or the existing homework explanation workflow**.
- **Generator-ready:** **Not yet.** No automatic activity selection/creation by the lesson generator, no V2.1 contract extension, no admin authoring picker or automatic topic mapping.
- **Persistence:** Local React state only in the demo. The real V2.0 lesson player holds activity progress while mounted; no new cross-session storage or Supabase migration.

**Important distinction:** “Explanation V2” here names the isolated feature and interactive lesson blocks. It does **not** imply that the production **homework explanation** or **Universal Tutor** currently uses these animations.

## 3. Activity catalogue and placement matrix

**Legend:** **YES** = code path integrated in this branch for explicit V2.0 lesson blocks; **DEMO** = working in isolated lab; **CANDIDATE** = suitable reuse but not yet connected to that product flow; **NO** = not integrated.

| ID / `kind` | Learner action / demonstration | Suggested French level (sample, not curriculum certification) | Lesson V2.0 | Practice | Homework explanation | Demo | Primary implementation |
|---|---|---|---|---|---|---|---|
| **IM-01** `fraction-select` | Tap any **3 of 4** equal parts to build 3/4; toggle, count, validate | CM1–CM2; sample CM2 | **YES** | CANDIDATE | CANDIDATE | **DEMO** | `src/features/explanation-v2/FractionSelectActivity.tsx` |
| **IM-02** `fraction-bar` | Convert 1/2 to 2/4, then add 3/4 + 1/2 = 5/4 in two guided questions | CM2–6e; sample CM2 | **YES** | CANDIDATE | CANDIDATE | **DEMO** | `src/features/explanation-v2/InteractiveActivityHost.tsx` (`FractionActivity`) |
| **IM-03** `coordinate-plane` | Place A(2;3) by touching/dragging or using four arrow controls | 6e–4e depending on curriculum; sample 4e | **YES** | CANDIDATE | CANDIDATE | **DEMO** | `InteractiveActivityHost.tsx` (`CoordinateActivity`) |
| **IM-04** `algebra-tiles` | Drag/tap x-tiles and unit tiles to construct 2x + 3; remove tiles | 5e–4e; sample 5e | **YES** | CANDIDATE | CANDIDATE | **DEMO** | `src/features/explanation-v2/AlgebraTilesActivity.tsx` |
| **IM-05** `linear-function` | Drag two graph handles or use +/- buttons to set coefficient directeur a and ordonnée à l’origine b of f(x) = ax + b | 3e sample; **teacher review still required** | **YES** | CANDIDATE | CANDIDATE | **DEMO** | `src/features/explanation-v2/LinearFunctionActivity.tsx` |
| **IM-06** `line-fit` | Move a regression line with handles/sliders to reduce squared error against data points | 2nde–Terminale depending on topic; sample 2nde (**review grade fit**) | **YES** | CANDIDATE | CANDIDATE | **DEMO** | `src/features/explanation-v2/LineFitActivity.tsx` |
| **IM-07 / IM-D02** `equation-decomposition` | Animate and justify both-sided operations; solve together or independently, exact rational checking | 5e–3e sample cases, pending curriculum review | **YES** | CANDIDATE | CANDIDATE | **DEMO** | `src/features/explanation-v2/EquationDecompositionActivity.tsx` + `equationSolver.ts` |

**Curriculum caution:** `schoolLevel` is a validated display/scaffolding field, **not** a verified French programme mapping. The affine-function demo now uses the 3e label and French notation (coefficient directeur a, ordonnée à l’origine b, f(x) = ax + b); a teacher must still review the exact grade fit and wording before assignment. The 2nde least-squares fitting activity also requires curriculum review. Never equate a demo label with proof that a concept is mandated at that grade.

### Suggested pedagogical placement (product design, not implemented integration)

| Product surface | Good use | Technical status and next integration |
|---|---|---|
| **Lesson / Learning** | Introduce a concept, manipulate it, make a prediction, practise once, then check understanding | **Already supported** as explicit V2.0 `interactive_activity` blocks in `LessonV2Player`. Add approved authoring/generation and teacher review before publishing |
| **Practice / S'entraîner** | Short, repeatable skill drills with varying numeric targets; hints and mastery analytics | **Not wired**. Add a Practice adapter and question-to-activity mapping; preserve existing `exam_training_items` and `training_item_answers` semantics |
| **Homework explanation / correction** | Demonstrate a misconception and allow the student to try the corrected step interactively | **Not wired**. Build a dedicated explanation adapter and safe activity selection. Do not touch Universal Tutor without approval |
| **Teacher/Admin** | Preview, select, edit, validate and publish age-appropriate interactive content | **Not wired**. Requires an authoring catalogue, validation, preview and versioning |
| **Standalone demo / QA** | Try all seven interaction kinds with no student data | **Working** at `demo.html` and local dev lab |

## 4. Activity specifications, validation, and learning behavior

All seven kinds share the **versioned** `InteractiveActivitySchema` and `InteractiveActivitySpec` contract in `src/features/explanation-v2/activityContract.ts`. Required common fields: `schemaVersion: 1`, `id`, `kind`, `title`, `prompt`. Optional `schoolLevel` is one of `CE1, CE2, CM1, CM2, 6e, 5e, 4e, 3e, 2nde, 1re, terminale`.

| Kind | Required kind-specific fields | Limits and checks | Grading / feedback |
|---|---|---|---|
| `fraction-select` | `target: { n, d }` | integers, `0 <= n <= d`, `2 <= d <= 12` | Exactly `n` selected parts; wrong count prompts correction; 3 hints |
| `fraction-bar` | `left: {n,d}`, `right: {n,d}`, `targetDenominator` | nonnegative unit fractions `n <= d`; left denominator equals target, target divisible by right denominator, max 12 | Two phases: equivalent numerator, then total colored parts; strict whole-number answers; 3 hints per phase |
| `coordinate-plane` | `target: { x, y }` | integer coordinates `[-5,5]` | Exact snapped position; axis-specific feedback; 3 hints |
| `algebra-tiles` | `target: { x, units }` | `x` integer 0–4, `units` integer 0–6, at least one nonzero | Exact x-tile and unit-tile counts; 3 hints; no negative tiles in this version |
| `linear-function` | `target: { m, b }` | integer slope/intercept in `[-3,3]`, `abs(m+b) <= 5` | Exact slope and intercept; diagnosis of wrong intercept vs wrong slope; 3 hints |
| `line-fit` | `points: [{ x, y }, ...]` | 3–8 points, distinct integer x in `[-4,4]`, finite y in `[-5,5]`, best-fit slope/intercept in `[-3,3]` | Deterministic least-squares optimum; pass when displayed squared error is within 0.051 of minimum; 3 hints |
| `equation-decomposition` | `a, b, c, d?` for `ax + b = dx + c` | Integer a,d in [-8,8], b,c in [-20,20]; a ≠ d, unique rational solution | Exact fraction/integer grading, guided step-choice, sign-error feedback, 3 hints; assisted vs independent |

**Known boundaries:** `fraction-bar` currently only handles the restricted denominator-conversion case above; `algebra-tiles` represents nonnegative coefficients only; graph handles/sliders are bounded; `line-fit` is a **linear** least-squares demonstration, not general nonlinear curve fitting. The current graph uses 0.1 increments for fitting. Do not generate out-of-range data or invent missing geometry.

### Copyable V2.0 lesson block

```json
{
  "id": "build-three-quarters",
  "type": "interactive_activity",
  "activity": {
    "schemaVersion": 1,
    "id": "cm2-build-three-quarters",
    "kind": "fraction-select",
    "schoolLevel": "CM2",
    "title": "Construire 3/4",
    "prompt": "Sélectionne trois des quatre parts égales.",
    "target": { "n": 3, "d": 4 }
  }
}
```

The same envelope accepts any of the other six validated kinds, replacing the `kind` and required parameters. A block is part of a complete **V2.0** lesson `sequence`, not a standalone lesson document.

### Copyable component use in a future Practice or Explanation adapter

```tsx
const [progress, setProgress] = useState(initialActivityProgress());
<InteractiveActivityHost
  spec={validatedSpec}
  progress={progress}
  onProgressChange={setProgress}
  onComplete={({ independent, attempts, hintsUsed }) => {
    // Parent product decides whether/how to persist analytics and advance.
  }}
/>
```

Validate `validatedSpec` with `InteractiveActivitySchema.safeParse` **before** publishing. Do not trust generated JSON or pass raw unvalidated teacher input into production. The host also performs a safe validation check and displays an error if invalid. For real usage, the parent owns persistence, authorization, navigation and scoring.

## 5. Code map — where everything sits

### Core feature (all paths relative to repository root)

| Module | Responsibility |
|---|---|
| `src/features/explanation-v2/activityContract.ts` | Zod schema, seven `kind` discriminators, state shape and initial progress |
| `src/features/explanation-v2/InteractiveActivityHost.tsx` | Validates and routes the seven activity kinds; also renders fraction addition and coordinate placement |
| `src/features/explanation-v2/FractionSelectActivity.tsx` | Selectable fraction parts |
| `src/features/explanation-v2/AlgebraTilesActivity.tsx` | Drag/tap algebra manipulatives |
| `src/features/explanation-v2/LineGraph.tsx` | Shared SVG graph, draggable slope and intercept handles, plotted points |
| `src/features/explanation-v2/MathDemonstration.tsx` | Reusable step-by-step explanation and visual demonstrations, derived fraction script |
| `src/features/explanation-v2/LinearFunctionActivity.tsx` | Affine function demonstration / exploration / challenge modes, live equation, +/- controls |
| `src/features/explanation-v2/LineFitActivity.tsx` | Data-fitting task, sliders, live squared-error and regression comparison |
| `src/features/explanation-v2/equationSolver.ts` | Exact linear-equation decomposition, rational normalization, equivalence and substitution checks |
| `src/features/explanation-v2/equationTermVisual.ts` | Derived left/right cancellation token storyboard with explicit inverse pairs, grouping and substitution |
| `src/features/explanation-v2/EquationDecompositionActivity.tsx` | Three-mode worked equation animation and guided/solo response UI |
| `src/features/explanation-v2/equationAnimations.css` | Original transformation reveal, term-level cancellation/combination, reduced-motion support |
| `src/features/explanation-v2/math.ts` | Exact rational math, coordinate transforms, strict grading, linear regression and squared error |
| `src/features/explanation-v2/pedagogicalQuestions.ts` | Structured, level-conscious question wording for fraction/coordinate tasks |
| `src/features/explanation-v2/cm2FractionLesson.ts` | Self-contained sample V2.0 lesson (not published) |
| `src/features/explanation-v2/Cm2LessonPreview.tsx` | Five-step simulated CM2 lesson with completion gating |
| `src/pages/dev/ExplanationV2MathLab.tsx` | Seven-kind developer lab and CM2 preview switch |
| `src/features/explanation-v2/demo-entry.tsx` + `demo.html` | Standalone Vercel preview without router, login or DB |
| `src/features/explanation-v2/qa-entry.tsx` | Isolated browser QA harness |
| `src/features/explanation-v2/qa-player-entry.tsx` | Real `LessonV2Player` QA fixture |
| `src/features/explanation-v2/previewAccess.ts` | Guards dev-only preview route to development/preview hostnames |

### Existing app integration points

| Existing module | Actual connection |
|---|---|
| `src/types/lesson-generator.ts` | `LessonBlockSchema` accepts `type: 'interactive_activity'` with `InteractiveActivitySchema` in **V2.0** |
| `src/components/learning/LessonV2Player.tsx` | Renders `InteractiveActivityHost`, holds per-block progress while mounted, gates Continue |
| `src/App.tsx` | Dev/preview-host route `/dev/explanation-v2-math` |
| `vite.config.ts` | Builds `demo.html` alongside the app |
| `vercel.json` | Preview-route rewrite |
| `src/pages/practice/PracticePage.tsx` and Practice session pages | **Not connected** to this new activity host |
| Existing homework explanation / Universal Tutor | **Not connected** to this new activity host |

### Existing visuals vs interactive activities

`src/types/lesson-generator.ts` also defines a **different** `VisualSchema` for visual representations (`clock`, `timeline`, `number_line`, `fraction_bar`, `fraction_circle`, `triangle`, `rectangle`, `circle`, `polygon`, `angle`, `symmetry`, `coordinate_plane`, `geometric_solid`, `solid_section`, `measurement`, `unit_conversion`, `groups`, `comparison`, `part_whole`, `table`, `equation`, `diagram`, `sequence`). These are **visual schema categories, not the six new interactive `kind` implementations**. A visual block must not be silently treated as a manipulable exercise. The existing `PedagogicalVisual` component and other older animations need their own separate inventory/audit.

## 6. Student experience and activity-selection guidance

**Mandatory question quality** (see `docs/EXPLANATION_V2_QUESTION_QUALITY.md`):
1. Show a meaningful visual and context before asking for input.
2. Ask **one concrete, grade-appropriate question** at a time.
3. Explain how to respond (tap, drag, type, slider) and in which format.
4. Give targeted wrong-answer feedback, then progressive hints.
5. Allow retries and preserve local progress; celebrate completion without overclaiming mastery.
6. Make mobile/touch and keyboard alternatives available, and use accessible status announcements.

**Choosing a component:**
- “Color 3/4 of a whole” → `fraction-select`.
- “Why does 1/2 equal 2/4? Add quarters” → `fraction-bar` (within current denominator limits).
- “Place A(2;3) / understand axes” → `coordinate-plane`.
- “What does 2x+3 mean?” → `algebra-tiles` (positive counts only).
- “How does f(x) = ax + b change when a or b moves?” → `linear-function`.
- “How well does a line represent measured data?” → `line-fit`.
- “Why does each operation preserve the equation, and how do I solve for x?” → `equation-decomposition` (only the validated linear template).

**Do not** select by keyword alone. Match the topic's **objective**, prerequisites, difficulty, approved curriculum level, available data, misconception and response format. An activity is not required in every lesson; it must add learning value. Do not copy proprietary competitors' visuals, assets or wording.

## 7. Tests, release evidence and current limitations

- **Latest verified CI at time of this snapshot:** [GitHub Actions #45714358708](https://github.com/UltraSaura/tutorly-navi/actions/runs/45714358708) — **PASS** for IM-D02 source commit `ad399dd4f`.
- **84** isolated activity browser checks across **375px, 447px and 1280px**; **18** real lesson-player browser checks; standalone demo smoke, unit/build/typecheck in the same workflow.
- Tests: `src/features/explanation-v2/math.test.ts`, `lessonIntegration.test.ts`, `pedagogicalQuestions.test.ts`, `previewAccess.test.ts`; browser QA: `qa/explanation-v2-browser.mjs`, `qa/explanation-v2-player-browser.mjs`, `qa/explanation-v2-demo-browser.mjs`.
- CI success proves tested scenarios, **not** broad curriculum approval, production rollout or automatic lesson generation.
- No cross-session activity persistence; no new database tables, migrations or writes.
- No integration with V2.1 generator, Practice, homework explanation, teacher authoring or Universal Tutor.
- This branch is based on `parent`; selectively review provenance before bringing changes into newer branches. **Do not blindly merge other branches**.
- Preview protection may require a Vercel login or a share link; a successful deployment alone does not prove anonymous access.
- Potential future QA: screen-reader end-to-end, pointer dragging across device/browser variants, real pupil comprehension, teacher validation, real-content compatibility, and regression checks against existing learning flows.

### C.06 stabilization status — 2026-11-26

- Equation invalid-answer feedback now uses the existing progress updater and distinguishes a zero denominator from malformed or empty input. Hosted standalone checks cover empty, malformed, zero-denominator, wrong integer/fraction, equivalent correct fraction, retry, hint and correct-answer paths.
- The affine-function “skip demonstration” control has a 44px minimum height. The French 3e notation remains `f(x) = ax + b`, with coefficient directeur `a` and ordonnée à l’origine `b`; teacher review is still required for exact level fit and wording.
- Hosted run [#45885806033](https://github.com/UltraSaura/tutorly-navi/actions/runs/45885806033) verified **180/180 standalone checks PASS** at 320, 375, 390, 447 and 1280px, including the affine pointer drag after the graph is scrolled into view. The real LessonV2Player script executed 35 checks; 25 passed and 10 exposed fixture setup assumptions about the CM2 prerequisite gate. Those fixtures now explicitly verify and clear the prerequisite before checking the activity; the corrected player run is pending.
- The standalone browser suite found no JavaScript runtime errors. The previous player failures were QA setup issues, not a confirmed player defect. The corrected final hosted run will provide definitive player and production-preview results.

## 8. Safe integration roadmap — after the animation library is approved

**Phase A — animation catalogue (current priority):** IM-D02 is now implemented and passed isolated CI. Finish and review each new interaction in the isolated lab, including its `kind` contract, correct math, feedback, mobile interaction and tests. Possible later entries: interactive number line, geometric transformations, angles, equation balancing, area/perimeter, graph transformations. These are **ideas, not implemented features**.

**Phase B — lesson authoring:** Extend the appropriate V2.1 schema and authoring pipeline, add a teacher/admin picker and preview, map activities to validated objectives and grade levels, generate activity specs from safe templates, and publish only after review. Keep the existing lesson sequence until separately approved.

**Phase C — Practice adapter:** Embed `InteractiveActivityHost` in the existing Practice flow with appropriate session state, skill linkage, retries and analytics. Preserve existing `exam_training_items`/answer semantics.

**Phase D — homework explanation adapter:** Connect a validated, objective-specific interaction to a guided correction step. Keep Universal Tutor untouched until a separate approved integration plan.

**Phase E — persistence and outcomes:** Introduce reviewed persistence/analytics and independent-vs-assisted mastery policies, with RLS/security tests and privacy review.

## 9. Rules for future coding agents — mandatory maintenance protocol

When adding or changing an animation or learning module:

1. **Inspect the actual branch and source first**; do not rely on old reports. Record branch, commit and PR. Do not change `main` or production.
2. Assign a stable ID (`IM-07`, `IM-08`, …) and an exact `kind`; avoid duplicate names.
3. Add or update this file's **catalogue**, **placement matrix**, **code map**, **schema limits**, **examples**, **status**, **QA evidence** and **known limitations** in the **same PR** as the code change.
4. Explicitly mark **Lesson**, **Practice**, **Homework Explanation**, **Admin/Teacher**, and **Demo** independently. “Reusable” is **not** “integrated”.
5. Never mark **YES** without a real code path and appropriate tests; never mark **released** without verified deployment and approval.
6. Require grade-appropriate French copy, precise mathematical validation, helpful wrong-answer remediation, progressive hints, mobile/keyboard controls, and tests for success/failure.
7. Maintain backward compatibility for existing V2.0 blocks; version contract-breaking changes. Do not assume V2.1 accepts new blocks without checking its separate validator.
8. Never add Supabase writes, new published lessons, migrations, branch merges, Universal Tutor modifications, or production deployments without explicit permission.
9. Update the date and CI link on every meaningful catalogue change; note outstanding QA rather than inventing a PASS.
10. If code and this document disagree, **code is the operational truth**; correct the document in the same change, and flag the discrepancy to the reviewer.

## 10. Related knowledge sources

- [Explanation V2 interactive math MVP and original QA runbook](./EXPLANATION_V2_INTERACTIVE_MATH_MVP.md) — **historical**; its “NOT YET EXECUTED” section reflects an earlier stage, not the latest test results.
- [Explanation V2 question-quality rules](./EXPLANATION_V2_QUESTION_QUALITY.md) — age-appropriate prompts, answer formats, hints and examples.
- [Practice experience and exam-training architecture](./practice-experience.md) — existing Practice behavior and persistence boundaries.
- [Draft PR #56](https://github.com/UltraSaura/tutorly-navi/pull/56) — actual changes and ongoing review.
- [Latest CI evidence at snapshot](https://github.com/UltraSaura/tutorly-navi/actions/runs/45714358708) — automated verification.

**Owner decision:** Complete the animation library **before** restructuring lessons. Keep this file as the single entry point for the **new interactive animation catalogue**, and expand it to other app modules only after source-level verification.
