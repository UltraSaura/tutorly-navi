# Tutorly / Stuwy — Interactive Learning Intelligence
> **Living knowledge base for humans, Codex, Claude, and other coding agents.**
>
> **Status snapshot:** 2026-11-24 · **Repository:** `UltraSaura/tutorly-navi` · **Working branch:** `feature/explanation-v2-interactive-math` · **Draft PR:** [#56](https://github.com/UltraSaura/tutorly-navi/pull/56)
>
> **Scope:** The six newly implemented Explanation V2 interactive math activities and their supporting modules. This is **not** a claim to inventory every pre-existing animation across Tutorly. Extend this catalogue as modules are audited or created.
>
> **Safety:** This is a preview-only branch; do not merge, deploy to production, change Supabase data, or modify Universal Tutor, TwoCards or CompactMathStepper without explicit approval.

## 1. Where to see the activities

**Current branch preview:** [Interactive Math Lab](https://stuwy-git-feature-explanation-v2-interactive-math-stuwy.vercel.app/demo.html)

- Click **CM2 · Sélectionner 3/4** for the selectable fraction strip.
- Click **CM2 · Additionner** for guided fraction addition.
- Click **4e · Coordonnées** to move a point on a grid.
- Click **5e · Tuiles** to construct an algebraic expression.
- Click **4e · Fonctions** to change slope and intercept.
- Click **2nde · Ajustement** to fit a line to observations.
- Click **Parcours complet CM2 · 5 étapes** to see a simulated lesson sequence with progression gates.

The URL is a **Vercel preview** and may require Vercel authentication/share access; it is not the production app. Preview hostname is not a permanent release URL. The lab is standalone (`demo.html`), uses simulated in-memory progress, and does **not** save student data. In local development, run `npm ci && npm run dev` and visit `http://localhost:8080/dev/explanation-v2-math` (confirm the Vite port).

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
| **IM-05** `linear-function` | Drag two graph handles or use +/- buttons to set slope m and intercept b of y = mx + b | 4e–2nde depending on topic; sample 4e (**review grade fit**) | **YES** | CANDIDATE | CANDIDATE | **DEMO** | `src/features/explanation-v2/LinearFunctionActivity.tsx` |
| **IM-06** `line-fit` | Move a regression line with handles/sliders to reduce squared error against data points | 2nde–Terminale depending on topic; sample 2nde (**review grade fit**) | **YES** | CANDIDATE | CANDIDATE | **DEMO** | `src/features/explanation-v2/LineFitActivity.tsx` |

**Curriculum caution:** `schoolLevel` is a validated display/scaffolding field, **not** a verified French programme mapping. In particular, the sample 4e affine-function activity and 2nde least-squares fitting require curriculum/teacher review before assignment. Never equate a demo label with proof that a concept is mandated at that grade.

### Suggested pedagogical placement (product design, not implemented integration)

| Product surface | Good use | Technical status and next integration |
|---|---|---|
| **Lesson / Learning** | Introduce a concept, manipulate it, make a prediction, practise once, then check understanding | **Already supported** as explicit V2.0 `interactive_activity` blocks in `LessonV2Player`. Add approved authoring/generation and teacher review before publishing |
| **Practice / S'entraîner** | Short, repeatable skill drills with varying numeric targets; hints and mastery analytics | **Not wired**. Add a Practice adapter and question-to-activity mapping; preserve existing `exam_training_items` and `training_item_answers` semantics |
| **Homework explanation / correction** | Demonstrate a misconception and allow the student to try the corrected step interactively | **Not wired**. Build a dedicated explanation adapter and safe activity selection. Do not touch Universal Tutor without approval |
| **Teacher/Admin** | Preview, select, edit, validate and publish age-appropriate interactive content | **Not wired**. Requires an authoring catalogue, validation, preview and versioning |
| **Standalone demo / QA** | Try all six interactions with no student data | **Working** at `demo.html` and local dev lab |

## 4. Activity specifications, validation, and learning behavior

All six kinds share the **versioned** `InteractiveActivitySchema` and `InteractiveActivitySpec` contract in `src/features/explanation-v2/activityContract.ts`. Required common fields: `schemaVersion: 1`, `id`, `kind`, `title`, `prompt`. Optional `schoolLevel` is one of `CE1, CE2, CM1, CM2, 6e, 5e, 4e, 3e, 2nde, 1re, terminale`.

| Kind | Required kind-specific fields | Limits and checks | Grading / feedback |
|---|---|---|---|
| `fraction-select` | `target: { n, d }` | integers, `0 <= n <= d`, `2 <= d <= 12` | Exactly `n` selected parts; wrong count prompts correction; 3 hints |
| `fraction-bar` | `left: {n,d}`, `right: {n,d}`, `targetDenominator` | nonnegative unit fractions `n <= d`; left denominator equals target, target divisible by right denominator, max 12 | Two phases: equivalent numerator, then total colored parts; strict whole-number answers; 3 hints per phase |
| `coordinate-plane` | `target: { x, y }` | integer coordinates `[-5,5]` | Exact snapped position; axis-specific feedback; 3 hints |
| `algebra-tiles` | `target: { x, units }` | `x` integer 0–4, `units` integer 0–6, at least one nonzero | Exact x-tile and unit-tile counts; 3 hints; no negative tiles in this version |
| `linear-function` | `target: { m, b }` | integer slope/intercept in `[-3,3]`, `abs(m+b) <= 5` | Exact slope and intercept; diagnosis of wrong intercept vs wrong slope; 3 hints |
| `line-fit` | `points: [{ x, y }, ...]` | 3–8 points, distinct integer x in `[-4,4]`, finite y in `[-5,5]`, best-fit slope/intercept in `[-3,3]` | Deterministic least-squares optimum; pass when displayed squared error is within 0.051 of minimum; 3 hints |

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

The same envelope accepts any of the other five validated kinds, replacing the `kind` and required parameters. A block is part of a complete **V2.0** lesson `sequence`, not a standalone lesson document.

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
| `src/features/explanation-v2/activityContract.ts` | Zod schema, six `kind` discriminators, state shape and initial progress |
| `src/features/explanation-v2/InteractiveActivityHost.tsx` | Validates and routes the six activity kinds; also renders fraction addition and coordinate placement |
| `src/features/explanation-v2/FractionSelectActivity.tsx` | Selectable fraction parts |
| `src/features/explanation-v2/AlgebraTilesActivity.tsx` | Drag/tap algebra manipulatives |
| `src/features/explanation-v2/LineGraph.tsx` | Shared SVG graph, draggable slope and intercept handles, plotted points |
| `src/features/explanation-v2/LinearFunctionActivity.tsx` | Affine function task, live equation, +/- controls |
| `src/features/explanation-v2/LineFitActivity.tsx` | Data-fitting task, sliders, live squared-error and regression comparison |
| `src/features/explanation-v2/math.ts` | Exact rational math, coordinate transforms, strict grading, linear regression and squared error |
| `src/features/explanation-v2/pedagogicalQuestions.ts` | Structured, level-conscious question wording for fraction/coordinate tasks |
| `src/features/explanation-v2/cm2FractionLesson.ts` | Self-contained sample V2.0 lesson (not published) |
| `src/features/explanation-v2/Cm2LessonPreview.tsx` | Five-step simulated CM2 lesson with completion gating |
| `src/pages/dev/ExplanationV2MathLab.tsx` | Six-tab developer lab and CM2 preview switch |
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
- “How does y = mx+b move?” → `linear-function`.
- “How well does a line represent measured data?” → `line-fit`.

**Do not** select by keyword alone. Match the topic's **objective**, prerequisites, difficulty, approved curriculum level, available data, misconception and response format. An activity is not required in every lesson; it must add learning value. Do not copy proprietary competitors' visuals, assets or wording.

## 7. Tests, release evidence and current limitations

- **Latest verified CI at time of this snapshot:** [GitHub Actions #45456200780](https://github.com/UltraSaura/tutorly-navi/actions/runs/45456200780) — **PASS**.
- **60** isolated activity browser checks across **375px, 447px and 1280px**; **18** real lesson-player browser checks; standalone demo smoke, unit/build/typecheck in the same workflow.
- Tests: `src/features/explanation-v2/math.test.ts`, `lessonIntegration.test.ts`, `pedagogicalQuestions.test.ts`, `previewAccess.test.ts`; browser QA: `qa/explanation-v2-browser.mjs`, `qa/explanation-v2-player-browser.mjs`, `qa/explanation-v2-demo-browser.mjs`.
- CI success proves tested scenarios, **not** broad curriculum approval, production rollout or automatic lesson generation.
- No cross-session activity persistence; no new database tables, migrations or writes.
- No integration with V2.1 generator, Practice, homework explanation, teacher authoring or Universal Tutor.
- This branch is based on `parent`; selectively review provenance before bringing changes into newer branches. **Do not blindly merge other branches**.
- Preview protection may require a Vercel login or a share link; a successful deployment alone does not prove anonymous access.
- Potential future QA: screen-reader end-to-end, pointer dragging across device/browser variants, real pupil comprehension, teacher validation, real-content compatibility, and regression checks against existing learning flows.

## 8. Safe integration roadmap — after the animation library is approved

**Phase A — animation catalogue (current priority):** Finish and review each new interaction in the isolated lab, including its `kind` contract, correct math, feedback, mobile interaction and tests. Possible later entries: interactive number line, geometric transformations, angles, equation balancing, area/perimeter, graph transformations. These are **ideas, not implemented features**.

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
- [Latest CI evidence at snapshot](https://github.com/UltraSaura/tutorly-navi/actions/runs/45456200780) — automated verification.

**Owner decision:** Complete the animation library **before** restructuring lessons. Keep this file as the single entry point for the **new interactive animation catalogue**, and expand it to other app modules only after source-level verification.
