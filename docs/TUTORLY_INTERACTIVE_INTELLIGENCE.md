Warning: truncated output (original token count: 20763)
Total output lines: 572

# Tutorly / Stuwy — Interactive Learning Intelligence

## Task F.03 — V2.1 lesson compatibility implementation

The isolated interactive feature branch now validates V2.1 `interactive_activity` blocks through the shared `InteractiveActivitySchema`; supported kinds remain exactly `fraction-select`, `fraction-bar`, `coordinate-plane`, `algebra-tiles`, `linear-function`, `line-fit`, and `equation-decomposition`. It keeps the existing `LessonContentStudent → LessonV21Path → LessonV2Player → InteractiveActivityHost` path and adds no runtime registry or player. V2.0 normalization is strict and invalid versioned content no longer falls through to legacy rendering. Source: `src/types/lesson-v21-contract.ts`, `src/types/lesson-generator.ts`, `src/components/learning/LessonContentStudent.tsx`.

Test fixtures in `src/features/explanation-v2/fixtures/` include all seven activity kinds plus the four-level CM2 proposal; objective IDs are test placeholders. Local checkpoint: 42/42 focused tests, TypeScript and build passed; focused lint 0 errors (one QA-only Fast Refresh warning). Final hosted browser results are pending and must be read from the workflow for the exact final commit before any acceptance statement.

Integration boundary: the lesson-version staging workflow remains on `main` / `feature/guided-practice-lessons` and is not present in this feature branch. The validator supports the staging prerequisite format, but workflow branch reconciliation, authoring/publication validation parity, and the separate Edge Function validator remain follow-up integration work. No persistent evidence, mastery calculation, XP, curriculum objective binding, or teacher approval is claimed. See [F.02 contract with F.03 record](STUWY_UNIFIED_LESSON_CONTRACT_TASK_F02.md) and [F.01 architecture audit update](STUWY_LESSON_ARCHITECTURE_AUDIT_TASK_F.md).
> **Living knowledge base for humans, Codex, Claude, and other coding agents.**
>
> **Status snapshot:** 2026-11-26 · **Repository:** `UltraSaura/tutorly-navi` · **Working branch:** `feature/explanation-v2-interactive-math` · **Draft PR:** [#56](https://github.com/UltraSaura/tutorly-navi/pull/56)
>
> **Scope:** The seven newly implemented Explanation V2 interactive math activity kinds and their supporting modules, including IM-D01 and IM-D02. This is **not** a claim to inventory every pre-existing animation across Tutorly. Extend this catalogue as modules are audited or created.
>
> **Safety:** This is a preview-only branch; do not merge, deploy to production, change Supabase data, or modify Universal Tutor, TwoCards or CompactMathStepper without explicit approval.

## 1. Where to see the activities

**Historical preview URL (not verified at the current catalog commit):** [Interactive Math Lab](https://stuwy-git-feature-explanation-v2-interactive-math-stuwy.vercel.app/demo.html). For current acceptance evidence, use the hosted CI and artifact linked in the Task C section below; the latest deployment attempt was rate-limited.

- Click **CM2 · Sélectionner 3/4** for the selectable fraction strip.
- Click **CM2 · Additionner** for guided fraction addition.
- Click **4e · Coordonnées** to move a point on a grid.
- Click **5e · Tuiles** to construct an algebraic expression.
- Click **3e · Fonction affine** to change the coefficient directeur a and ordonnée à l’origine b in f(x) = ax + b.
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
- **Fonction affine (3e):** **Comprendre** (four-stage demonstration: horizontal line → y-intercept → slope → recap) → **Explorer** (free manipulation without scoring) → **M’entraîner** (independent interactive challenge). The function activity starts in **Comprendre**; students who already know the concept may skip to the challenge.
- **Fraction addition:** **Voir la démonstration pas à pas** optionally shows four derived steps: identify fractions → rewrite in equal-sized parts → add colored parts → interpret the result. Returning to the exercise does not change attempts, hints, selected answer or completion.
- **Visual animations:** Graph transitions and dashed rise/run guides, stepwise fraction-bar transformations. Navigation is manually paced; no autoplay, sound, narration, or video yet. Respect reduced-motion settings.
- **Lesson:** YES, displayed as part of the `linear-function` and `fraction-bar` V2.0 activity UI; no change to lesson block sequence schema.
- **Practice:** CANDIDATE, not integrated.
- **Homework explanation:** CANDIDATE, not integrated with Universal Tutor.
- **Teacher/Admin:** CANDIDATE, no editor or generator mapping yet.
- **Demo:** YES in the two existing activity tabs once a preview deployment includes the changes.
- **QA:** `MathDemonstration.test.ts`; current five-width regression is tracked in the Task E.09 follow-up below. Older three-width counts are historical.
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
- **QA:** earlier 375/447/1280px results are historical. Task E.09 extends `qa/explanation-v2-browser.mjs` and `qa/explanation-v2-player-browser.mjs`; see the final hosted run linked below for current five-width evidence.
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
- “Place A(2;3) / understand axes” → `coordinat…5763 tokens truncated…
Exact branch folders: [practice components](https://github.com/UltraSaura/tutorly-navi/tree/a57846c388c904fff15bc374a13afa06f0d9f6db/src/components/practice), [feature logic](https://github.com/UltraSaura/tutorly-navi/tree/a57846c388c904fff15bc374a13afa06f0d9f6db/src/features/practice), [pages](https://github.com/UltraSaura/tutorly-navi/tree/a57846c388c904fff15bc374a13afa06f0d9f6db/src/pages/practice). Branch contains activity/page/editor families. Main/integration does not have these new paths. Tests are present in source, not executed here.

| ID | Exact component / logic / page sources | Objective, prerequisites, validation |
|---|---|---|
| GP-ARITHMETIC-QUIZ | ArithmeticQuizActivity.tsx; features/practice/arithmeticQuiz.ts; AddUpTo100Page.tsx; ArithmeticQuizEditor.tsx | Targeted arithmetic retrieval; prerequisites depend on deck. Logic tests exist. |
| GP-ADD-ACROSS-TEN | AdditionAcrossTenModel.tsx; features/practice/additionAcrossTen.ts; AdditionAcrossTenPage.tsx | Addition across ten with concrete grouping; counting/place-value prerequisite. Tests exist. |
| GP-COUNTABLE-DOTS | CountableDotModel.tsx; features/practice/countingExercise.ts | One-to-one counting and quantity; model/logic tests exist. |
| GP-COUNTABLE-OBJECTS | CountableObjectModel.tsx; features/practice/countingExercise.ts | Concrete collection counting; tests exist. |
| GP-SUBTRACTION-DOTS | SubtractionWithDotsModel.tsx; features/practice/subtractionWithDots.ts; SubtractionWithDotsPage.tsx | Subtraction as remove/count remaining; counting prerequisite. Tests exist. |
| GP-COORDINATES | CoordinatePlaneActivity.tsx; CoordinateQuestion.tsx; features/practice/coordinatePlane.ts; CoordinatePlanePage.tsx; CoordinatePlaneEditor.tsx | Read/place ordered pairs; axes prerequisite. Tests and browser scenario are source-only here. |
| GP-EQUAL-GROUPS | EqualGroupsTransfer.tsx; features/practice/equalGroupsFeedback.ts | Equal groups/repeated addition as multiplication precursor. Helper tests exist. |
| GP-GUIDED-FAMILIES | GuidedFamilyActivity.tsx; features/practice/guidedFamilies.ts; GuidedFamiliesPracticePage.tsx; GuidedFamilyEditor.tsx | Practice related number/arithmetic families; typed family schema, tests exist. |
| GP-VISUAL-QUIZ | VisualQuizActivity.tsx; features/practice/visualQuiz.ts; VisualQuizEditor.tsx | Match/answer authored visual quiz items; schema tied to visual kind. Tests exist. |
| GP-FLASHCARDS | features/practice/flashcardPractice.ts; FlashcardPracticePage.tsx | Retrieval practice; spacing/mastery relation needs validation before adaptive use. Test exists. |
| GP-MENTAL-RACE | features/practice/mentalCalculationRace.ts; MentalCalculationRacePage.tsx | Timed mental calculation. Avoid for remediation unless learner/teacher policy allows. Test exists. |
| GP-NUMBERS-AFTER-TEN | features/practice/numbersAfterTen.ts; NumbersAfterTenPage.tsx | Sequence/place value past ten. Test exists. |
| GP-ONE-HOUR-LATER | features/practice/oneHourLater.ts; OneHourLaterPracticePage.tsx | Time arithmetic on clock/time concepts. Test exists. |
| GP-NUMBER-LINE | GraduatedNumberLineActivity.tsx; numberLineActivities.ts; numberLineUtils.ts; numberLineFeedback.ts; numberLineSupport.ts; GraduatedNumberLinePage.tsx | Place values/fractions/decimals with graduated line; drag plus keyboard/button paths, retry and targeted hints. Existing in main; feature branch adds helper tests. Static Learn renderer and interactive practice activity remain separate. |
| GP-CATALOGUE-HELPERS | features/practice/exerciseCurriculum.ts; exerciseCataloguePolicy tests; materializeArithmeticDeck.ts; addUpTo100.ts | Catalogue policy, curriculum metadata and deck materialization; infrastructure rather than standalone teaching UI. |

## D.03 — Cross-application integration matrix

Statuses describe availability in the audited main/application surface. Feature branch sources remain isolated unless explicitly noted.

| Module family | Tutor | Learn | Practice | Teacher/Admin | Adaptive remediation |
|---|---|---|---|---|---|
| TwoCards / CompactMathStepper | INTEGRATED — TwoCards imports/renders CompactMathStepper for supported examples. | REQUIRES DEVELOPMENT — no V2 lesson-block adapter. | REUSABLE WITH ADAPTER — mini-practice contract exists, no universal targeted catalogue adapter. | NOT VERIFIED — no authoring path verified. | REUSABLE WITH ADAPTER — existing explanation hints/check contract only. |
| PedagogicalVisual / LessonVisualBlock | REQUIRES DEVELOPMENT — no Tutor call site verified. | INTEGRATED — LessonV2Player renders both. | REUSABLE WITH ADAPTER — visual prompt only where practice schema accepts it. | REUSABLE WITH ADAPTER — selected visual editors exist, not full kind coverage. | REUSABLE WITH ADAPTER — only validated visual data and kind. |
| LessonV2Player / LessonV21Path | REQUIRES DEVELOPMENT — no Tutor homework bridge verified. | INTEGRATED — exact paths above; progression and mastery callbacks exist. | INTEGRATED for lesson-contained practice only; does not imply all practice routes use it. | INTEGRATED — GeneratedLessonsPage and StagingLessonVersionPanel review flows. | REUSABLE WITH ADAPTER — lesson prerequisites/remediation hints; cross-session adaptive selector not verified. |
| Number line | REQUIRES DEVELOPMENT | INTEGRATED for static visual; drag activity not verified inside LessonV2Player. | INTEGRATED — GraduatedNumberLinePage and GraduatedNumberLineActivity. | REUSABLE WITH ADAPTER — config exists; parameter authoring not fully verified. | REUSABLE WITH ADAPTER — feedback/support helpers need shared misconception contract. |
| Seven V2 activities | REQUIRES DEVELOPMENT for Tutor; do not assume UniversalTutor compatibility. | INTEGRATED on accepted branch through LessonV2Player activity rendering and InteractiveActivityHost; Task C player tests. | REUSABLE WITH ADAPTER — independent challenges exist; catalogue integration not verified. | REQUIRES DEVELOPMENT — no V2 editor authoring verified. | REUSABLE WITH ADAPTER — hints/outcomes exist; no shared misconception selector. |
| feature/stuwy-explain-v2 modules | IMPLEMENTED BUT ISOLATED at cec2b07; absent from main/integration. | REQUIRES DEVELOPMENT | REQUIRES DEVELOPMENT | REQUIRES DEVELOPMENT; teacher engine is logic, not editor | REQUIRES DEVELOPMENT pending runtime and evidence integration |
| guided-practice feature families | REQUIRES DEVELOPMENT for Tutor | REUSABLE WITH ADAPTER if lesson block schema can represent them; no current adapter verified | IMPLEMENTED BUT ISOLATED at a57846c, except number-line family already on main | IMPLEMENTED BUT ISOLATED for new arithmetic/coordinate/family/visual editors | REUSABLE WITH ADAPTER after common skill/error semantics; no adaptive routing verified |
| Main admin visual/quiz tools | NOT VERIFIED | REQUIRES DEVELOPMENT for editor-to-player preview proof | REUSABLE WITH ADAPTER for current quiz schemas | INTEGRATED through admin learning/visual-editor paths | REQUIRES DEVELOPMENT |

Exact source evidence for integrated statuses: TwoCards and CompactMathStepper files above; LessonV2Player and LessonV21Path paths above; number-line page/activity paths above; V2 activity host and lesson player above; admin editor paths listed under V1-ADMIN-TOOLS.

## D.04 — Pedagogical capability map

This is a source capability map, not curriculum approval.

| Objective | Existing module evidence | Coverage and gap |
|---|---|---|
| Number sense/place value | GP countable objects/dots, numbers-after-ten, add-across-ten; STUWY place-value grid; V1 number line | Early numeracy exists on isolated branch; main branch coverage is less broad. Misconception routing absent. |
| Number lines | GraduatedNumberLineActivity; PedagogicalVisual number_line | Static Learn rendering and interactive Practice activity use separate contracts. |
| Addition/subtraction | CompactMathStepper; OperationPosee; GP arithmetic/add-across-ten/subtraction dots; STUWY subtraction guide/compensation | Rich representation choices, but fragmented by branch and no consolidated error taxonomy. |
| Multiplication/division | Supported CompactMathStepper operations; GP equal groups; existing exact-practice generation | No dedicated interactive division manipulative verified. |
| Fractions | V2 fraction select/addition; visual fraction bar/circle; TwoCards fraction bounds | V2 covers bounded fraction cases. General denominator operations need schema check. |
| Decimals | Stepper builders and number-line representation | No dedicated decimal interactive module among reviewed V2 activities; scale alignment needs dedicated verification. |
| Proportionality | Affine graph may illustrate rate in 3e, but is not a general proportionality activity | Gap: no verified ratio/unit-rate/scale-table interactive module. |
| Percentages | None verified | Gap: no percent bar, benchmark or discount activity. |
| Algebraic expressions | V2 algebra tiles; supported stepper visuals | Bounded expression construction; expansion, distribution and term collection need schema coverage review. |
| Equations/inequalities | V2 bounded linear equation module incl. exact rational solutions | Gap: no inequality module; equation grammar is bounded. |
| Coordinates/functions | V2 coordinate, affine function, line fit; GP coordinate activity | Coordinate modules are in separate branches/contracts. Line fit is not the 3e affine lesson. |
| Geometry | PedagogicalVisual shapes/angle/symmetry; visual editors; geometry draft fixtures | Static diagrams and authoring exist; no broad interactive construction/proof module verified. |
| Statistics/probability | Line-fit points/data context | Gap: no data interpretation or probability experiment activity verified. |
| Other subjects | Generic lesson/question/visual contracts only | No distinct reusable non-math manipulative identified in this scoped audit. |

## D.05 — Module-selection intelligence (proposal, not implemented)

1. Validate: accept only allowlisted module ID + schema version whose input and prerequisites validate. Never generate unknown component IDs or unsupported schemas.
2. Filter by objective tags, curriculum level, age suitability evidence, problem type, supported operation and available representation. Curriculum labels remain unreviewed until a teacher approves them.
3. Use prerequisite evidence, not grade alone. Missing prerequisite or high-confidence misconception selects concrete/visual demonstration or guided representation; uncertain mastery uses guided practice; independent challenge only when assessment is intended.
4. Match misconception only when module error tags support it. If evidence is ambiguous, use a typed diagnostic question instead of inferring from one error.
5. Keep evidence distinct: demo viewing is exposure only; guided success is assisted; independent assessment records mode, attempts, hints and retries per contract. Lesson completion and historical assessment evidence are separate.
6. Honor accessibility metadata: select a keyboard/touch alternative when available, respect reduced motion, do not select drag-only interaction if an equivalent path is required. Avoid timed practice for remediation unless policy permits.
7. Respect LessonV2Player progression gates. Do not advance from a demo viewed alone; preserve compatible progress on mode switch.

Fallback ladder: compatible same-objective module; existing validated visual plus typed question; supported worked explanation/stepper; plain text worked example plus diagnostic question. If none validates, omit the activity block and identify the objective for teacher authoring.

### Proposed registry schema (design only)

    type ModuleRegistryEntry = {
      id: string; version: string;
      component: { exportName: string; sourcePath: string; branchCommit: string };
      availability: { tutor: Status; learn: Status; practice: Status; teacherAdmin: Status; remediation: Status };
      objectiveTags: string[]; concepts: string[]; problemTypes: string[]; misconceptionTags: string[];
      curriculum: Array<{ system: string; level: string; approval: "unreviewed" | "teacher-reviewed"; evidenceUrl?: string }>;
      prerequisites: Array<{ skillId: string; evidenceRequired: "independent" | "guided" | "diagnostic"; minimum?: number }>;
      inputSchema: { schemaId: string; version: string }; operations: string[]; representations: string[];
      modes: { demonstration: boolean; guided: boolean; independent: boolean };
      interaction: { keyboard: boolean | "unknown"; pointer: boolean | "unknown"; touch: boolean | "unknown"; reducedMotion: boolean | "unknown" };
      feedback: { incorrect: boolean | "unknown"; progressiveHints: boolean | "unknown"; retry: boolean | "unknown" };
      completion: { criterion: string; demoCountsAsMastery: false };
      evidence: { attempts: boolean | "unknown"; hints: boolean | "unknown"; independentAssessed: boolean | "unknown"; assistedAssessed: boolean | "unknown" };
      tests: Array<{ path: string; verifiedCommit?: string; result: "pass" | "fail" | "not-run" | "source-only" }>;
      dependencies: string[]; limitations: string[];
      reuse: "unchanged" | "adapter" | "extension" | "isolated" | "legacy" | "not-verified";
    };

Consumers must resolve ID and version against a reviewed allowlist before rendering; generated lesson text cannot select arbitrary components.

## D.06 — Overlap, duplication and dependencies

| Overlap | Assessment | Recommendation |
|---|---|---|
| TwoCards / ExplanationTwoCards / AdaptiveTeachingStepper | Current Tutor composition, chat wrapper and grouped retry have distinct contracts. | Keep separate until call-site/contracts are reconciled; do not consolidate by name. |
| CompactMathStepper / InteractiveMathStepper / V2 equation | Written operation animation, parser-generated interactive steps, and bounded equation/assessment engine differ. | Keep separate. Preserve CompactMathStepper; adapter only after schema and evidence review. |
| PedagogicalVisual number line / GraduatedNumberLineActivity / GP coordinate activity | Static visual, interactive number placement, coordinate quiz differ in schemas and scoring. | Reuse static renderer unchanged; keep interactive schemas separate; compare utility contracts before sharing. |
| OperationPosee / CleanWrittenOperation / StructuredOperationGrid | Manipulative verification differs from structured visual presentation. | Adapter only if operation and feedback contracts match. |
| Algebra tiles / equal groups | Symbolic expression construction vs concrete multiplicative grouping. | Keep separate; concrete-to-symbolic sequencing is a design recommendation requiring teacher review. |
| MathDemonstration / CompactMathStepper | Conceptual scripted explanation vs algorithmic written computation. | Keep separate; demo never inherits mastery attribution. |
| SubtractionVisualGuide / SubtractionWithDots / stepper | Different representation and feature-branch contracts. | Adapter only after mismatch taxonomy and regression proof. |
| CountableDotModel / CountableObjectModel | Similar counting goal with different concrete representations. | Keep separate unless interaction/accessibility parity is established. |
| Practice activity/page/feature triplets | Logic, rendering and route each own validation/control. | Reuse unchanged; consider central helper only after approved integration and regression tests. |

Dependencies to preserve: V2 activities rely on Zod activity schema, ActivityProgress, host dispatch, math helpers and lesson generator integration. V1 visuals rely on PedagogicalVisual supported kinds and shared visual contracts. Stepper modules rely on operation builders/parser. Practice pages rely on feature data builders and exercise contracts. Editors must not save data the runtime rejects.

## D.07 — Gaps and priorities for Task E/F

Proposed Task E:
1. Review stable module IDs, schema versions, adapters and evidence semantics before implementing runtime registry.
2. Add teacher authoring/preview for existing V2 kinds using the runtime validator.
3. Integrate one bounded V2 lesson with teacher-authored preview and preserve demo/guided/independent evidence.
4. Decide whether/how to integrate isolated explain-session and guided-practice branches; compare contracts and migration evidence, not filenames.
5. Obtain teacher review for 3e affine sequence, language and all proposed mappings.

Proposed Task F:
1. Prioritize proportionality, percentages, inequalities, decimal scale, statistics/probability and interactive geometry construction.
2. Add cross-module progression/evidence regression tests for gates, assisted/independent work, retries/hints and duplicate attribution.
3. Verify an accessible non-drag path, keyboard, touch, reduced-motion behavior per activity and expose these capabilities in registry.
4. Establish teacher-facing coverage review with unapproved mappings clearly marked.

These are inventory recommendations only; Task E implementation did not begin.

## Current validation and stale-reference reconciliation

- Current accepted code head is 3fc22b11a3d595da53fe9b787daec475d3f233c4. Hosted Task C run [#45887495298](https://github.com/UltraSaura/tutorly-navi/actions/runs/45887495298) is recorded in the ledger: 180/180 standalone checks, 40/40 actual LessonV2Player checks, five widths 320/375/390/447/1280, complete CM2 path, runtime-error checks, screenshots and JSON reports. This is inherited Task C evidence, not a Task D rerun.
- Task D tests were NOT RUN; source test files in feature branches are source-only unless stated in the CI evidence above.
- Current affine wording is 3e: fonction affine, coefficient directeur a, ordonnée à l'origine b, f(x)=ax+b. Teacher review of exact curriculum fit and wording remains required against [Édubase 22940](https://edubase.eduscol.education.fr/fiche/22940).
- Older preview hostnames and B.3 viewport limitations are historical and superseded by hosted Task C evidence. They are not current deployment claims.
- The lab is a preview/simulation; it is not proof of production lesson persistence or integration of every feature-branch module.


## Task E pedagogical validation — 26 Nov 2026

The evidence-labelled internal pedagogical review is [STUWY_PEDAGOGICAL_VALIDATION_TASK_E.md](STUWY_PEDAGOGICAL_VALIDATION_TASK_E.md). It covers all nine live V2 scenarios and the five-step CM2 path, representative source-only legacy/isolated modules, the weighted rubric, French curriculum staging, bounded competitor evidence, teaching principles, example explanations and prioritized backlog.

**Historical first-round result:** TASK E PARTIAL — PEDAGOGICAL VALIDATION GAPS REMAIN. This captured the initial review before E.09 corrections. The live simulated lab was qualitatively reviewed; this does not establish production persistence, student learning outcomes or teacher approval. The Task C run [#45887495298](https://github.com/UltraSaura/tutorly-navi/actions/runs/45887495298) is historical/inherited (180/180 standalone, 40/40 player); E.09 has separate hosted evidence below. Source-only modules remain clearly marked.

First-round findings: IM-03 and IM-05 revealed answer/recipe in the challenge; IM-01/IM-04 permitted completion without explaining the mathematical relationship; the CM2 path used “Tu sais…” after a single scaffolded example without independent transfer; line fitting invited trial-and-error without explaining residuals/squared error. These areas were corrected or bounded in E.09 as detailed below. Equation demonstrations visibly explain the operation and result without opening “Pourquoi cette étape ?”. The affine activity uses 3e French terminology consistently, but teacher review remains pending.

The current programme-date distinction matters: the 2026 cycle-4 programme rolls out for 3e in 2028–29, so grade-year applicability must be confirmed; Édubase 22940 is a Troisième example resource, not a Stuwy approval. See report Section 5 for official sources and limitations. No runtime code was changed; no Task F implementation started.

## Task E.09 pedagogical correction follow-up — 26 Nov 2026

The prior Task E conclusions above are the **first-round review** and are superseded only for the specifically corrected behaviors below. Teacher approval and student learning outcomes remain unverified. Full before/after notes and the rubric are in [STUWY_PEDAGOGICAL_VALIDATION_TASK_E.md, Section 14](STUWY_PEDAGOGICAL_VALIDATION_TASK_E.md#14-e09-correction-follow-up--26-nov-2026).

### Identifier reconciliation

| Activity kind | Catalog ID | Evaluation scenario |
|---|---|---|
| `fraction-select` | IM-01 | EVAL-01; CM2 composite |
| `fraction-bar` | IM-02 | EVAL-02; CM2 composite |
| `coordinate-plane` | IM-03 | EVAL-03 |
| `algebra-tiles` | IM-04 | EVAL-04 |
| `linear-function` | IM-05 | EVAL-05 |
| `line-fit` | IM-06 | EVAL-09 |
| `equation-decomposition` | IM-07 | EVAL-06, EVAL-07 and EVAL-08 |

The residual “explain why signed values cancel” question is EVAL-09 / IM-06 line fitting; it does not belong to the equation scenarios. These are separate namespaces, not new or duplicate module IDs.

### Corrected behavior and evidence status

- [`LinearFunctionActivity.tsx`](https://github.com/UltraSaura/tutorly-navi/blob/feature/explanation-v2-interactive-math/src/features/explanation-v2/LinearFunctionActivity.tsx) preserves the 3e French notation and graph, then asks a changed `f(x)=−2x+3` interpretation and construction sequence. The controls are not pre-highlighted.
- [`InteractiveActivityHost.tsx`](https://github.com/UltraSaura/tutorly-navi/blob/feature/explanation-v2-interactive-math/src/features/explanation-v2/InteractiveActivityHost.tsx) preserves coordinate interaction and adds a changed negative/positive coordinate pair with targeted error feedback. Fraction addition requires a new exact-rational `1/4+1/2` item after its guided `3/4+1/2` example.
- [`FractionSelectActivity.tsx`](https://github.com/UltraSaura/tutorly-navi/blob/feature/explanation-v2-interactive-math/src/features/explanation-v2/FractionSelectActivity.tsx) checks numerator/denominator meaning and adds `2/5`; pre-attempt selected counts are withheld.
- [`AlgebraTilesActivity.tsx`](https://github.com/UltraSaura/tutorly-navi/blob/feature/explanation-v2-interactive-math/src/features/explanation-v2/AlgebraTilesActivity.tsx) connects `2x` to `x+x`, distinguishes units and x-tiles, and includes a changed-expression check.
- [`EquationDecompositionActivity.tsx`](https://github.com/UltraSaura/tutorly-navi/blob/feature/explanation-v2-interactive-math/src/features/explanation-v2/EquationDecompositionActivity.tsx) preserves the validated animation, rotates correct guided answer positions, and gates overall activity completion on the optional changed-equation transfer. Exposure, guided completion, assisted response, independent success and transfer now have distinct evidence fields in `ActivityProgress`.
- [`LineFitActivity.tsx`](https://github.com/UltraSaura/tutorly-navi/blob/feature/explanation-v2-interactive-math/src/features/explanation-v2/LineFitActivity.tsx) and [`math.ts`](https://github.com/UltraSaura/tutorly-navi/blob/feature/explanation-v2-interactive-math/src/features/explanation-v2/math.ts) show observed-minus-predicted residuals, explain signed cancellation and squared residuals, and check an independent residual interpretation. The line-fit acceptance compares with the best attainable 0.1-grid fit.
- The five-step CM2 sequence now shows equal-length bars for `1/2=2/4`, preserves `3/4+1/2=5/4`, and gates the continuation after a new exact `1/4+1/2` check. Recap language describes a completed guided example, not mastery.

`ActivityProgress.learningEvidence` stores exposure, guided completion, assisted evidence, independent evidence, transfer success, disclosed items, transfer attempts and transfer hints. Attempt/hint counts and historical equation-mode evidence are retained. Demonstration exposure alone does not score or unlock mastery. This is local lesson evidence; persistent mastery calculations were not changed.

**Hosted E.09 final run:** [workflow #45905584726](https://github.com/UltraSaura/tutorly-navi/actions/runs/45905584726), implementation commit `389c97040c069b6938b3ad77704c7cdc8d3c7d2e`: 195/195 standalone checks and 40/40 actual LessonV2Player checks passed across 320, 375, 390, 447 and 1280px. The production-built `/demo.html` smoke and five-step CM2 preview passed with no page errors. [QA screenshots and reports](https://github.com/UltraSaura/tutorly-navi/actions/runs/45905584726/artifacts/15157763030): 96 files, 6.4 MB. Hosted unit/build job: 49/49 tests (8 files), TypeScript PASS, focused lint 0 errors/4 Fast Refresh warnings, production build PASS. Build warnings remain for fonts, bundle chunk size and mixed static/dynamic Supabase imports. Do not substitute inherited Task C evidence for these E.09 results.

**Still open:** human teacher review of the affine 3e fit and all changed educational content, the applicable curriculum year, learner comprehension and outcomes. The current live Vercel preview was not refreshed or verified; the hosted smoke used the production-built standalone demo on the CI server. Isolated demo and LessonV2Player fixtures are not production persistence validation. No Task F, merge, Supabase change or production deploy has occurred.

## F.01A — Mathematical display standard (27 Nov 2026)

**Mandatory student-facing standard:** display fractions vertically, with the numerator above the denominator and a horizontal bar. New generated lesson content should use explicit LaTeX, preferably `\\frac{n}{d}` in inline text and `\\dfrac{n}{d}` when a larger display fraction improves readability. Multi-step arithmetic should use a display equation with coherent aligned rows when a mobile line would otherwise become too wide. Supported authoring syntax also includes powers (`x^{2}`), roots (`\\sqrt{...}`), negative values, operators (`\\times`, `\\div`, `\\pm`), parentheses, equations and aligned calculations. Display syntax is presentation only: validators, answer inputs and exact rational grading continue using their existing contracts. Never interpret arbitrary HTML or unsafe TeX commands.

**Implementation paths:** `src/components/math/MathText.tsx` is the shared safe KaTeX boundary. It renders explicit `$...$`, `$$...$$`, `\\(...\\)`, `\\[...\\]` plus backward-compatible simple numeric `n/d` fractions in text. URL/path/date and explicitly named ratio contexts are preserved. Inputs, option values and code blocks are not rewritten. `MathTextTree` visits native elements and React fragments, but not custom components, SVG text or values; components that compose numerator/denominator as sibling nodes must wrap the complete sentence/expression in `MathText`, because separate nodes cannot safely be joined. `src/components/math/MathRenderer.tsx` delegates existing math-only call sites to the same renderer. `MathTextTree` is applied to the V2 player, concept and visual blocks, legacy lesson content, V2.1 level titles/goals, QuestionCard, `AIResponse` Tutor text containing fractions, and the interactive math lab/activities. CM2 authoring now uses explicit fraction markup and an aligned calculation in `src/features/explanation-v2/cm2FractionLesson.ts`; `LessonV2Player` tags its conclusion and the simulated CM2 preview tags its completion summary for browser checks. Practice prompts use QuestionCard. No stored lesson data or answer grading schema was changed.

**Evidence / limits:** focused renderer + lesson tests: 23/23 pass locally; TypeScript passes; focused lint reports 0 errors and 4 existing Fast Refresh warnings; production build passes with the repository's existing asset/chunk warnings. These are local results only until hosted workflow completes. Existing legacy contents with ambiguous bare `n/d` may be rendered as fractions; use explicit math delimiters for ratios. The separately implemented `ManipulativeMathRenderer`, any V2.1 content rendered outside `LessonV2Player`, other branch-specific apps, and any teacher/admin preview outside these shared paths need coverage in hosted QA and teacher review. Teacher/admin compatibility is not claimed solely from sharing the renderer. The required five viewport widths, actual lesson path, and before/after screenshots are pending the hosted run. No teacher approval is implied.

## Task F preparation — 27 Nov 2026

- **Teacher preview:** [French evaluation packet](STUWY_TEACHER_EVALUATION_F00.md) records nine standalone scenarios and the five-step CM2 path as teacher-review items, not as teacher-approved curriculum. The live simulated lab is available at [the current READY Vercel preview](https://stuwy-mechcwccu-stuwy.vercel.app/demo.html). Deployment source is `389c97040c069b6938b3ad77704c7cdc8d3c7d2e`; final E.09 head `b2c7c3e87a9930232d03500b2f08fc7f51480f6f` differs only in two documentation files, so runtime source is identical. The preview is simulated and does not persist student data.
- **Architecture audit:** [F.01 lesson architecture audit](STUWY_LESSON_ARCHITECTURE_AUDIT_TASK_F.md) documents audited branch heads, lifecycle, engines, schemas, administration, activity compatibility, evidence proposal and F.02–F.08 recommendations. It found that V2.0 accepts `interactive_activity`, while V2.1 level validation rejects it; extend the existing player family through a shared backward-compatible contract/adapter instead of introducing another player.
- **Evidence limitation:** Detailed `ActivityProgress.learningEvidence` remains local player state; no persistence or long-term mastery semantics are claimed. The canonical product architecture reference and explicit V2.2 spec were unavailable. The historical CI evidence remains in the E.09 section above; the Task F live simulated-preview exercise does not replace it or validate production persistence.


## F.02 — Unified lesson contract design (documentation only)

The detailed proposal is in [STUWY_UNIFIED_LESSON_CONTRACT_TASK_F02.md](./STUWY_UNIFIED_LESSON_CONTRACT_TASK_F02.md). It recommends preserving the four-level V2.1 path and existing LessonV2Player, adding validated V2.1 support for the existing `interactive_activity` block through `InteractiveActivitySchema`, and repairing the V2.0 normalization fallback only with strict per-block validation. It introduces no player, registry, activity kind or generation engine.

The report provides a four-level CM2 fraction-addition JSON proposal using only `fraction-select` and `fraction-bar`, identifies the V2.1 validator gap and fallback risk, records that the staging/version workflow is present on main/guided-practice but absent from the F.01A feature tree, and documents unavailable canonical architecture/V2.2 references. The proposed CM2 objective binding and teacher review remain outstanding. No runtime implementation or F.03 adapter has started.

**F.03 prerequisites:** review this contract; reconcile the existing draft workflow against the eventual implementation base; obtain real topic/objective IDs and teacher review; then authorize implementation separately. Do not change persistent mastery formulas, published lessons, video contracts, or answer grading under the contract task.
