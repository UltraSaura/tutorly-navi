# STUWY F.02 — Unified lesson structure and contract design

**Status:** contract proposal only; not implemented or teacher-approved  
**Design baseline:** `feature/explanation-v2-interactive-math` at `844ce9e497c55d42d2f52a332b7b935ed2b70fc7`  
**PR:** #56 remains open and draft.  
**Scope:** documentation; no runtime, published lesson, Supabase, deployment or branch integration changes.

## 1. Executive recommendation

Keep the current four-level V2.1 path and continue to render each level with the existing `LessonV2Player`. Make the existing typed `interactive_activity` lesson block valid in a V2.1 level by delegating its `activity` payload to the existing `InteractiveActivitySchema`. Do not create a third player, a second activity registry, a new lesson envelope or a new generation engine.

The immediate contract gap is real: the V2.0 `LessonBlockSchema` accepts `interactive_activity`, but the handwritten V2.1 `validateLessonV21` block switch rejects it. `LessonContentStudent` tests the V2.1 parser first, so a V2.1 level containing an activity is rejected before the existing V2.0 player can receive it. `LessonV21Path` already passes `level.lesson` to `LessonV2Player`; that player already renders the seven validated activity kinds and gates continuation until an activity is complete. This makes shared validation the intended compatibility seam.

The V2.0 normalization fallback needs a safe fix as part of that work. Do **not** merely add `interactive_activity` to its `supportedTypes` set: that fallback currently returns a cast object after the strict parse fails and could therefore admit a malformed `activity`. It should preserve an interactive block only after its payload passes the existing strict activity schema. Unknown kinds or invalid specs must remain invalid and produce an actionable validation issue.

Keep V2.0, V2.1 and legacy lesson reads working. Keep the existing four levels, per-level objectives, mastery thresholds and lesson progression. A viewed demonstration or guided activity may unlock the next block when its existing contract says so, but it must not be relabeled independent mastery. Keep the E.09 evidence distinctions in activity analytics; do not change database schemas, XP or persistent mastery formulas in F.03.

## 2. Sources reviewed and limits

### Exact feature baseline

- `src/types/lesson-generator.ts`: `LessonV2Schema`, `LessonBlockSchema`, `LessonV21` types, `parseLessonContent` and `parseLessonV21`.
- `src/types/lesson-v21-contract.ts`: handwritten V2.1 validator. Its `block` switch has no `interactive_activity` case.
- `src/features/explanation-v2/activityContract.ts`: single Zod allow-list, `InteractiveActivitySchema`, seven activity specs and local evidence types.
- `src/features/explanation-v2/InteractiveActivityHost.tsx`: activity dispatch and activity-level behavior.
- `src/components/learning/LessonContentStudent.tsx`: V2.1-first, then V2.0, then legacy renderer selection.
- `src/components/learning/LessonV21Path.tsx`: four-level navigation, gates, local storage for level score/resume position, and existing mastery callback.
- `src/components/learning/LessonV2Player.tsx`: V2 block rendering, activity host, continuation gate, interaction events and lesson completion.
- `src/pages/learning/LessonPage.tsx`: lesson and separate topic-video composition.
- `src/components/math/MathText.tsx`: shared safe KaTeX renderer introduced in F.01A.
- `docs/EXPLANATION_V2_QUESTION_QUALITY.md`: level-aware instructions and question quality requirements.
- `docs/STUWY_LESSON_ARCHITECTURE_AUDIT_TASK_F.md`, `docs/STUWY_TEACHER_EVALUATION_F00.md`, `docs/STUWY_PEDAGOGICAL_VALIDATION_TASK_E.md`, `docs/TUTORLY_INTERACTIVE_INTELLIGENCE.md`, and the latest project ledger entry LEDGER-019 on `docs/stuwy-project-ledger`.

### Branch and architecture-document findings

The latest ledger says the current recommendation is to preserve V2.1 → existing V2 player, retain V2.0 and legacy parsing, and separately authorize an adapter. Its F.01A entry records the exact-source hosted preview and five-width/195-check plus 40-player-check acceptance. Teacher approval is still pending.

The named “Tutorly — Final Product & Adaptive Learning Architecture” was not found in the repository code search, tracked source tree, or the provided files. Searches for an explicit V2.2 lesson specification/runtime also returned no result. No architecture or behavior has been inferred for either missing reference.

There is a source-provenance discrepancy that F.03 must handle explicitly: at F.01A feature head `844ce9e…`, the tracked tree includes the V2.1/V2.0 player and activity contracts, but **does not contain** `docs/lesson-generation-progress.md`, `src/services/lessonVersionWorkflow.ts`, `src/pages/admin/StagingLessonWorkflowPage.tsx`, or the `topic_lesson_versions` migrations named by the earlier F.01 audit. Those files were independently located on `main` head `5b5ea1de14c223b28f1838b105b6d82d0385cdf3` and `feature/guided-practice-lessons` head `a57846c388c904fff15bc374a13afa06f0d9f6db`. The staging workflow documentation/service and publication migrations are therefore verified on those branches, not as available imports in the exact F.01A feature tree. Before runtime work, compare ancestry and the eventual PR base, then reuse the already-existing staging workflow if it is part of the implementation base. Do not re-create its draft table, validator, admin workflow or publish RPC.

### Lesson generation and publication evidence

On `main` and `feature/guided-practice-lessons`, `docs/lesson-generation-progress.md`, `src/services/lessonVersionWorkflow.ts`, `src/pages/admin/StagingLessonWorkflowPage.tsx`, `src/components/admin/learning/StagingLessonVersionPanel.tsx`, and migrations `20261014111115_create_topic_lesson_versions.sql` / `20261014111455_publish_topic_lesson_version.sql` describe and implement a draft/version path separate from `topics.lesson_content`. The publish RPC requires authorized admin context, explicit confirmation and a version in `validated` status before copying the version to the topic. These files were read as source on their verified branches; no RPC was run and no Supabase data was accessed or changed.

The tracked F.01A feature tree also contains `supabase/functions/generate-lesson-content/index.ts`; its legacy generation path writes `topics.lesson_content` directly. Do not treat that path as the external ChatGPT draft import contract or use it for F.03 import. Product direction remains: generate externally in ChatGPT, import as a draft, preserve existing drafts and published lessons, review/validate, then publish through the existing guarded workflow.

## 3. Recommended canonical lesson contract

### 3.1 Persisted V2.1 envelope

Keep the persisted student lesson envelope at `version: "2.1"`:

```text
LessonV21
  version = "2.1"
  topic_goal: non-empty string
  levels: 1..4 LevelV21 objects
    id, level_number, title, purpose, difficulty, objective_ids
    lesson
      lesson_goal, success_criteria, prerequisites, misconceptions,
      sequence: LessonBlock[], mastery { skills, threshold }
```

The current validator accepts one to four levels; this product contract keeps **four** levels for a complete curriculum lesson, with level content allowed to vary in length and block count. Stable topic, grade, subject and language are resolved from the selected curriculum topic and draft/import context. Do not insert new top-level metadata into `LessonV21` until the data contract is deliberately versioned. A machine import manifest can carry `topic_id`, expected grade, subject, language, source, and generator/version separately from the student lesson JSON.

Every block keeps the existing `{id, type, ...type-specific fields}` shape. An interactive block remains:

```json
{
  "id": "stable-lesson-block-id",
  "type": "interactive_activity",
  "activity": {
    "schemaVersion": 1,
    "id": "stable-activity-id",
    "kind": "fraction-bar",
    "schoolLevel": "CM2",
    "title": "Mettre les fractions en quarts",
    "prompt": "Transforme les moitiés en quarts puis additionne.",
    "left": { "n": 3, "d": 4 },
    "right": { "n": 1, "d": 2 },
    "targetDenominator": 4
  }
}
```

Do not add a component name, arbitrary renderer, activity type alias, generated UI code, or extra activity schema. `kind` must be one of the seven values in the existing `InteractiveActivitySchema`; `activity.schemaVersion` remains 1.

### 3.2 Validator and parser alignment

Proposed F.03 implementation requirements:

1. Add a V2.1 `interactive_activity` validation case. Delegate `block.activity` to the existing `InteractiveActivitySchema.safeParse`; translate its issue paths into the V2.1 `ContractIssue` path (for example `levels[2].lesson.sequence[1].activity.targetDenominator`). Do not duplicate the seven payload schemas in a second handwritten list.
2. Keep V2.0 `LessonBlockSchema` as the current Zod typed block contract. Prefer extracting a small shared block-contract module only if the dependency graph requires it; avoid importing `LessonBlockSchema` from `lesson-generator.ts` into `lesson-v21-contract.ts`, since `lesson-generator.ts` itself imports the V2.1 validator. No circular import or unchecked cast is acceptable.
3. Keep `LessonContentStudent` dispatch order: parse V2.1 → `LessonV21Path`; else parse V2.0 → `LessonV2Player`; else legacy renderer. With valid V2.1 activities, `LessonV21Path` continues to supply the nested level lesson to the existing `LessonV2Player`.
4. Fix `parseLessonContent` normalization so an exact valid interactive spec can survive harmless outer V2.0 normalization. Validate every normalized block with the strict block schema before returning parsed content. Do **not** broaden the old `supportedTypes` escape hatch without strict validation of each block; `interactive_activity` with an unknown kind, malformed numbers or wrong schema version must return invalid, not be cast into `LessonV2`.
5. Admin validation/preview, draft validation and student parsing must agree on the same supported activity payload. If a validator runs outside this feature branch, identify its owning branch and integrate it deliberately rather than maintaining divergent lists.
6. Actionable errors must name the path, kind and rule. Example: `levels[3].lesson.sequence[2].activity.transfer.targetDenominator: doit correspondre au dénominateur de la fraction de gauche et être divisible par celui de droite.` Unknown activity type: `kind non pris en charge; activités autorisées : fraction-select, fraction-bar, coordinate-plane, algebra-tiles, linear-function, line-fit, equation-decomposition.`

### 3.3 Lesson/level completion semantics

- A block completion means the current interaction's own requirement was met; it may unlock the next block according to the current player.
- A level reaching its existing mastery threshold is the current level-path gate. Continue to source that score only through the existing mastery-check callback until a separately approved model changes it.
- A lesson/player completion screen means the sequence is complete; it is not, by itself, proof of independent mastery or durable long-term mastery.
- Keep `exposure`, `guidedCompleted`, `assisted`, `independent`, `transfer`, `disclosedItems`, attempts and hint counts distinct. A demonstration view is exposure. A guided answer is assisted evidence. Do not infer independent success from a block's `completed` boolean.
- Activity completion callback analytics already include `activityId`, attempts, hints and an independent flag. Keep that contract. Do not duplicate XP or mastery attribution by separately awarding mastery from both the activity callback and `LessonV21Path`.

## 4. Compatibility matrix: current versus proposed

| Path | Current verified behavior at baseline | Proposed F.03 behavior | Backward-compatibility rule |
|---|---|---|---|
| V2.0 strict parser | `LessonV2Schema` includes `interactive_activity` and validates through `InteractiveActivitySchema`; `LessonV2Player` renders it through `InteractiveActivityHost`. | Keep as is; add regressions for a valid exact payload and valid payload under outer normalization. | Existing V2.0 JSON, ids, answer grading, hints, animations and gates remain unchanged. |
| V2.0 normalization fallback | Strict parse is tried first. Fallback normalizes block ids/threshold but a `supportedTypes` list omits `interactive_activity`; fallback is an unchecked cast after its type allow-list. | Replace broad type-only fallback with strict per-block validation after safe normalization; preserve a valid activity only if its nested schema passes. | Never use fallback to bless unknown/malformed activity data or drop invalid blocks. |
| V2.1 validation | `validateLessonV21` rejects `interactive_activity`; the student dispatcher tests V2.1 first. | Add an activity case delegated to the existing activity schema; retain all current V2.1 checks. | Existing V2.1 lessons continue to parse byte-for-byte; no persisted rewrites. |
| V2.1 level rendering | `LessonV21Path` opens a level and passes `level.lesson` to `LessonV2Player`. | Existing player renders the new valid block using existing host. No new player. | Preserve level titles, objective IDs, stored level progress and resume position. |
| Legacy lesson | Used if both modern parsers reject and legacy shape is recognized. | No schema conversion; retain the current renderer and old titles/content. | An unknown modern kind must not be silently converted to an apparently complete legacy lesson. Show validation/fallback error in author preview; keep student legacy lessons readable. |
| Lesson generation/publish | Draft/version guarded workflow verified on `main` and `feature/guided-practice-lessons`; absent from F.01A feature tree. Separate legacy Edge Function can write directly to topic content. | External ChatGPT JSON enters the existing draft/version workflow only after branch/provenance reconciliation. Continue current validate→teacher review→validated→explicit publish sequence. | No direct import to `topics.lesson_content`; no overwrite/regeneration of existing draft or published version. |
| Evidence/mastery | Activity evidence is local while mounted; V2.1 saves score/position locally and sends existing mastery update; LessonV2Player records analytics and lesson completion. | Preserve these boundaries; tests prove guided completion does not become independent evidence and does not add another mastery/XP event. | No database schema, persistent mastery formula, XP logic or historical progress migration. |
| Mathematical rendering | Shared safe `MathText` / `MathFormula` renderer from F.01A on covered student-facing paths. | All new lesson examples use explicit safe math markup; preserve renderer and answer parser separation. | Student may still enter accepted `3/4` text; grading remains exact and unchanged. |

## 5. Four-level structure and pedagogical principles

Four levels are an architecture, not four identical page templates. Each level has a specific, topic-related title, one primary objective, prerequisites suited to that objective, appropriate blocks, and criteria that say what the learner can show. Vary sequence length to match the concept. Do not make every lesson a fixed number of cards or interactions.

| Stage | Appropriate use in an existing lesson | Evidence meaning |
|---|---|---|
| Discover | Hook, prediction, visual or low-stakes `fraction-select`; invite noticing before the rule. | Exposure / prediction only; not mastery. |
| Understand | Concept/rule, representation, worked example, visual equivalence and reasons for each transformation. | Explanation exposure. |
| Manipulate | Existing validated activity lets the learner change/choose/build a mathematical representation. | Action and feedback; only the module's own evidence semantics apply. |
| Practise together | Guided example, checkpoint or activity's guided phases, with smallest-useful hints. | Guided/assisted evidence. |
| Practise independently | Student-try, mastery-check or activity transfer with changed values and no disclosed answer. | Independent evidence only if first correct, no relevant help/disclosure and task contract says independent. |
| Remediate | Specific feedback/hints tied to a misconception; learner retries without losing prior work. | Assisted evidence; do not count as unassisted independence. |
| Transfer | A changed value, representation or context; ideally asks for a short interpretation or reason, not just a copied answer. | Transfer evidence, distinct from routine completion. |

Not every lesson needs every stage. Adapt the sequence to age, prerequisite result, objective, complexity, existing mastery, and observed misconceptions. Use one concrete representation at a time for CM2; explain what stays constant when a representation changes. Use short, direct French instructions and label the response method. A student should be able to explain why equivalent fractions preserve amount and why only same-sized parts can be combined.

## 6. Supported content blocks and rendering limits

The current V2.0 block union defines these supported types: `interactive_activity`, `hook`, `concept`, `visual`, `prediction`, `guided_example`, `student_try`, `feedback_checkpoint`, `contrast`, `rule`, `worked_example`, `reflection`, and `mastery_check`. V2.1 has handwritten validation and the same supported set **except** `interactive_activity` until F.03. V2.1 acceptance is not proof that every optional field is rendered meaningfully; exercise each block's actual player branch in F.03 tests.

| Content need | Reuse now | Design guidance / limit |
|---|---|---|
| Concept explanation / rule | `concept`, `rule`, `guided_example`, `worked_example` | Put the reason beside the step; do not rely on an optional explanation disclosure for a key idea. |
| Real-life example | `hook`, `concept`, `worked_example`, `student_try` text | Choose a context that clarifies the quantities; do not use decoration that adds reading load. |
| Image/illustration | Existing `visual` block/`VisualSchema` and admin/player visual renderers | Provide purpose and accurate alt text. Verify the current supported visual data shape in its real renderer; schema acceptance alone does not guarantee render quality. |
| Mathematical diagram | Existing `fraction_bar`, `coordinate_plane`, `number_line`, `part_whole`, `equation`, `diagram` visual kinds where supported by the target renderer; activity visuals for their exact tasks. | Do not invent arbitrary SVG/HTML payloads. Test rendering and accessibility. For the fraction reference, the validated bars/tiles are enough; no external illustration needed. |
| Worked mathematical steps | `guided_example` or `worked_example`; equation activity for its supported equation family | Keep computation separate from display. Author displayed math with safe KaTeX markup; do not change grading data. |
| Animated explanation | Existing activity demonstrations and animations | Preserve deterministic math engine, reduced-motion support and visual transformations. Animation must name the action and resulting state; it is not proof of understanding. |
| Interactive manipulatives | `interactive_activity` with existing seven-kind schema and host | No arbitrary component IDs, runtime registry, or new kind. Gate on the validated schema. |
| Guided / independent questions | `prediction`, `student_try`, `feedback_checkpoint`, `mastery_check`, activity guided/transfer modes | Keep correct answer, hint and feedback contracts. Independent items must not reveal their answer in the prompt or prior demonstration. |
| Quiz / completion | `mastery_check` (1–4 questions), existing player completion and V2.1 path gate | Lesson completion, mastery threshold and evidence are separate concepts. Avoid “maîtrise acquise” after exposure only. |
| Summary | `reflection`, `concept` takeaway, a final existing supported text block | Summarize the invariant or method in student language and invite a transfer check if needed. |
| Educational video | Separate topic video resources rendered alongside lesson content by `LessonPage` | Recommendation: keep video as a separate topic resource for F.03. No video lesson-block type or new video system. Consider an optional in-sequence video block only in a later approved schema proposal with skip/accessibility/completion semantics; video watch must not count as mastery. |

### Mathematical notation standard

Use the shared F.01A renderer. New math text should use explicit delimiters and LaTeX: `\\(\\frac{3}{4} + \\frac{1}{2}\\)` or a display expression. Use `\\frac`/`\\dfrac` for stacked fractions, `x^2`/`\\sqrt{}` for powers/roots, `-` or `\\(-\\)` for negative values, supported operators and parentheses. Long working should be broken at equality boundaries using aligned or separate coherent lines. Do not add raw slash fractions such as `3/4` to new displayed prose. Existing plain `n/d` visible text remains a safe backward-compatibility path where the renderer covers it. Never format answer input values, URLs, dates, paths or intentional ratios. `MathText` is not an evaluator; `parseRationalAnswer` and existing validators continue to determine correctness.

## 7. Activity compatibility and curriculum review

The limits below are exact contract boundaries from `src/features/explanation-v2/activityContract.ts`, not a curriculum authorization. All activities share `schemaVersion: 1`, id (1–120 chars), title (1–120), prompt (1–400), optional allowed `schoolLevel`, and one allowed `kind`. Each stable lesson block ID and nested activity ID must be unique within its scope.

| Kind | Compatible objective / placement | Schema boundary and prerequisites | Modes/evidence | Teacher review / fallback |
|---|---|---|---|---|
| `fraction-select` | Represent a fraction as selected equal parts; early discover/manipulate or check. | Target numerator 0–12, denominator 2–12, numerator ≤ denominator; optional changed target transfer. Learner should understand equal partitioning. | Tap/select exact parts, feedback/hints and optional transfer. Completion is task evidence, not automatically mastery. | Confirm representation and reading demand at grade. If no compatible schema, use a validated visual plus `student_try`; never invent an equivalent tile component. |
| `fraction-bar` | Equivalent fractions and adding/subtracting supported fractions; understand/guided/independent transfer. | Left/right numerators 0–12, denominators 1–12, numerator ≤ denominator; target denominator 2–12 must equal left denominator and be divisible by right denominator; optional transfer obeys same constraints. | Conversion and sum phases, hints/feedback, optional changed-value transfer, completion analytics. | Review common-denominator cases, fraction >1 display and exact input contract. If denominators do not satisfy bounds, choose another existing valid problem/block or use a supported worked example; do not weaken the validator. |
| `coordinate-plane` | Plot and interpret `(x;y)`; manipulation and sign/order transfer. | Integer x,y in −5…5; optional transfer in same range. Prerequisites: axes, origin, signed integers and ordered pairs. | Pointer/touch plus accessible buttons, feedback, optional transfer. | Confirm school-level sequence and French `abscisse/ordonnée` usage. If task requires fractional coordinates or unbounded plane, no compatible config; use existing explanation/visual/question. |
| `algebra-tiles` | Interpret coefficient and constant as counts of x/unit tiles; model expressions. | x tiles 0–4, units 0–6, nonempty expression; same constraints for optional transfer. | Construct by interaction; targeted feedback/hints; transfer. | Teacher confirms letter-as-unknown prerequisite and vocabulary. If negatives/products/equations are needed, use no unsupported tile configuration. |
| `linear-function` | Build/read bounded affine line and relate slope/intercept controls to graph. | Integer `m,b` in −3…3, fit constraint `abs(m+b)≤5`; same for transfer. | Demonstration/exploration and independent changed target; graph updates live. | Proposed school level 3e remains pending teacher/curriculum approval. If objective needs non-integer values or broader domain, use an existing graph/lesson block, not fake a config. |
| `line-fit` | Compare a line with data and interpret residual/error; later data objective. | 3–8 points; distinct integer x in −4…4; y −5…5; best-fit parameters must fit controls; optional valid distinct interpretation point indexes. | Slider/pointer manipulation, changing error, explanation question and residual transfer. | Teacher review for level, residual convention and least-squares language. If the data do not validate or grade fit is uncertain, use a supported table/visual + question. |
| `equation-decomposition` | Preserve equality across steps; simple equation, x on both sides, bounded rational result. | Integer a −8…8, b/c −20…20, optional d −8…8; `a≠d`; optional transfer equation also unique. | Demonstration, guided choice, independent practice, hints, exact answer and substitution evidence. | Review grade and signed fractions. If nonlinear/no unique solution/out of bounds, do not pass this spec; author supported explanation or defer. |

All activity fallback behavior is fail-closed: invalid specs block draft validation/publication with the exact nested path and constraint. At runtime, never render a blank block or mark it complete. In author preview, preserve the invalid source for correction and show the issue. For the student renderer, use the existing invalid-lesson handling until a specifically designed accessible error/fallback is approved; do not silently drop the block or swap in another activity.

## 8. External ChatGPT generation and import contract

ChatGPT is an external authoring tool, not a new in-app generation engine. The authoring request should provide:

1. **Identity:** exact existing topic UUID/slug, displayed topic name, grade, subject, curriculum objective and curriculum year/version. No request to regenerate if a draft or published lesson already exists unless a teacher explicitly asks for a new version.
2. **Language:** French or English as selected by the curriculum/product context; use one consistent language in prompts, feedback, hints and titles. French grade-level vocabulary follows `EXPLANATION_V2_QUESTION_QUALITY.md`.
3. **Four levels:** a V2.1 JSON payload with four topic-specific titles, purposes, increasing/appropriate difficulty, objective ID references, lesson goal, 1–5 success criteria, prerequisites, misconception remediation, supported sequence blocks, and mastery skills/threshold. Vary length; no fixed screen count.
4. **Math correctness:** exact operations and computed outcomes; explicit safe math markup in every student-facing mathematical expression; independent calculation audit separately from generated prose. Preserve `answer_type`, expected answer types and exact grading representation.
5. **Interactive selection:** choose only the seven allowed kinds; emit a complete schemaVersion 1 payload using documented bounds and validated configuration. Do not create component identifiers or change schemas. If no compatible activity exists, do not include `interactive_activity`; use a supported block and flag the capability gap for the reviewer.
6. **Pedagogy:** each interaction states the context, one concrete task, response method and useful feedback. Include targeted misconception feedback/remediation, progressive hints where its existing schema supports them, an unassisted changed-value or representation transfer item, and explain why core operations work.
7. **Visual spec:** only existing visual kinds and renderer-supported data fields. Include concise alt text and purpose. No arbitrary HTML, scripts, raw SVG or generated React.
8. **Validation metadata (import manifest, not student lesson JSON):** topic ID, selected subject/grade/language/curriculum version, source ChatGPT conversation or author, generated-on date, schema version, content checksum, validator version/result, mathematical QA result/reviewer, teacher review state/reviewer/date, and draft version ID assigned by existing workflow. Do not claim ChatGPT output is teacher-approved.

### Import path recommendation

External output is first saved as a local/exported JSON draft package. An import adapter validates it against the exact V2.1 contract, resolves the pre-existing topic and curriculum metadata, reports all errors without partial saving, and creates a new draft through the existing `topic_lesson_versions` workflow on the approved integrated base. It must not call the legacy Edge Function path that directly updates `topics.lesson_content`. Drafts remain drafts until teacher review and existing validation. Publication remains a separately confirmed admin action through the current guarded RPC. Never overwrite an existing draft or published lesson without making a new version and preserving the original.

This import capability was not found in the feature baseline. It is an integration requirement for F.03+ only if current owner confirms it is in scope; F.02 does not implement it.

## 9. Complete proposed CM2 reference lesson

### Curriculum scope and learning intent

The reference focuses on representing fractions as equal parts, using equivalent fractions to make the parts the same size, adding those parts, and interpreting a result above one. It is a narrow proposal for CM2, not a teacher-approved scheme of work. The 2025 Cycle 3 mathematics programme applies to CM2 from rentrée 2026–2027; it lists fraction interpretation/representation, writing fractions above one as integer plus proper fraction, and addition/subtraction among CM2 learning objectives, and mentions divisors/multiples in fraction comparisons/additions. The reference deliberately uses very small denominators supported by the activity schema, so it is a bounded first lesson example rather than full curriculum coverage. The sequence, vocabulary and placement still require a CM2 teacher review. Official references: [Cycle 3 mathematics programme, BO 16 of 17 April 2025](https://www.education.gouv.fr/bo/2025/Hebdo16/MENE2504620A); [official cycle 3 support resources](https://eduscol.education.gouv.fr/5712/ressources-d-accompagnement-du-programme-de-mathematiques-au-cycle-3).

**Learning goal:** expliquer et calculer une somme de deux fractions de dénominateurs différents lorsque l’un des dénominateurs est un multiple de l’autre, en conservant la même quantité lors du partage en parts plus petites.

**Prerequisites:** reconnaître un tout partagé en parts égales; lire numérateur/dénominateur; connaître les équivalences usuelles `1/2 = 2/4`; additionner des nombres entiers; comprendre qu’une fraction peut être supérieure à 1. Assessment must not assume equivalence without checking it.

### Proposed four-level JSON payload

This is a **design example**, not a saved lesson or teacher-approved content. It intentionally uses the exact V2.1 envelope and current field names. `objective_ids` are explicit curriculum-binding placeholders; replace them with existing canonical objective IDs before importing. The two `interactive_activity` blocks per activity family use current V2.0 activity specs and current host contracts, but the V2.1 validator at the baseline rejects those blocks until the F.03 adapter. All other shown block types/fields are accepted by the current V2.1 validator, subject to its existing runtime/test rules. No extra “grade”, “subject”, “language” or invented player fields are embedded in the V2.1 payload.

```json
{
  "version": "2.1",
  "topic_goal": "Additionner des fractions de dénominateurs différents en les exprimant avec des parts de même taille.",
  "levels": [
    {
      "id": "cm2-fractions-level-1",
      "level_number": 1,
      "title": "Reconnaître les parts d’une fraction",
      "purpose": "Comprendre qu’une fraction décrit des parts égales d’un même tout.",
      "difficulty": "découverte",
      "objective_ids": ["<id-objectif-cm2-fractions-a-lier-au-curriculum-existant>"],
      "lesson": {
        "lesson_goal": "Lire une fraction comme un nombre de parts égales prises dans un tout.",
        "success_criteria": ["Je vérifie que les parts sont égales.", "Je relie le dénominateur au nombre total de parts.", "Je relie le numérateur au nombre de parts choisies."],
        "prerequisites": [
          {"id":"equal-parts","description":"Comprendre le partage en parts de même taille.","check_question":"Une barre est-elle partagée en parts égales ?","answer_type":"multiple_choice","choices":["Oui, chaque part a la même longueur","Non, les parts n’ont pas la même longueur"],"expected_answer":"Oui, chaque part a la même longueur","remediation_hint":"Compare les longueurs des parts avant de compter."}
        ],
        "misconceptions": [
          {"id":"unequal-parts","description":"L’élève compte des morceaux qui n’ont pas la même taille comme des parts d’une fraction.","detect_if":"Il choisit une fraction à partir du seul nombre de régions dessinées.","feedback":"Pour parler de fraction d’un tout, les parts doivent avoir la même taille.","remediation_strategy":"Revenir à une barre partagée en quatre parts égales et demander de comparer les longueurs."}
        ],
        "sequence": [
          {"id":"fraction-discover-hook","type":"hook","title":"Une barre partagée en quatre","content":"Imagine une barre de chocolat partagée en quatre parts égales. Trois parts sont prises. Comment noter cette quantité ?"},
          {"id":"fraction-select-three-quarters","type":"interactive_activity","activity":{"schemaVersion":1,"id":"cm2-fraction-select-3-4","kind":"fraction-select","schoolLevel":"CM2","title":"Construire trois quarts","prompt":"Sélectionne trois parts parmi quatre parts égales.","target":{"n":3,"d":4},"transfer":{"n":2,"d":3}}},
          {"id":"fraction-read-mastery-check","type":"mastery_check","questions":[{"id":"fraction-read-q1","question":"Dans \\(\\frac{3}{4}\\), que signifie le 4 ?","answer_type":"multiple_choice","choices":["\\(\\frac{2}{4}\\)","Le nombre de parts égales du tout","Le nombre de parts coloriées"],"correct_answer":"Le nombre de parts égales du tout","skill":"Lire le dénominateur","difficulty":1,"success_feedback":"Oui : le dénominateur indique le nombre de parts égales du tout.","error_feedback":"Le nombre du bas indique en combien de parts égales le tout est partagé."}]}
        ],
        "mastery":{"skills":["Lire une fraction comme parts égales"],"threshold":0.8}
      }
    },
    {
      "id": "cm2-fractions-level-2",
      "level_number": 2,
      "title": "Partager chaque moitié en deux quarts",
      "purpose": "Comprendre pourquoi une quantité reste égale quand chaque part est subdivisée.",
      "difficulty": "comprendre",
      "objective_ids": ["<id-objectif-cm2-fractions-equivalentes-existant>"],
      "lesson": {
        "lesson_goal": "Expliquer que deux quarts couvrent la même quantité qu’une moitié.",
        "success_criteria": ["Je garde le même tout.", "Je partage chaque moitié en deux parts égales.", "J’explique pourquoi le nombre de parts change sans changer la quantité."],
        "prerequisites": [
          {"id":"read-one-half","description":"Lire une moitié comme une part sur deux parts égales.","check_question":"Dans une moitié, combien de parts égales forment le tout ?","answer_type":"numeric","expected_answer":"2","remediation_hint":"Le nombre du bas indique en combien de parts égales le tout est partagé."}
        ],
        "misconceptions": [
          {"id":"fraction-value-changes","description":"L’élève pense que la fraction devient plus grande parce que le numérateur et le dénominateur augmentent.","detect_if":"Il affirme que deux quarts représentent plus qu’une moitié.","feedback":"On a découpé les mêmes deux moitiés en parts plus petites : la longueur totale coloriée n’a pas changé.","remediation_strategy":"Superposer ou aligner la barre d’une moitié avec celle de deux quarts et comparer la longueur coloriée."}
        ],
        "sequence": [
          {"id":"equivalent-fraction-concept","type":"concept","title":"Même quantité, parts plus petites","content":"On garde la même barre entière. Si chaque moitié est partagée en deux, il y a quatre parts égales. Les deux parts coloriées couvrent toujours la même longueur : \\(\\frac{1}{2}=\\frac{2}{4}\\). Le dénominateur indique le nombre de parts égales du tout; le numérateur indique combien de parts on prend.","key_points":[{"label":"Le tout ne change pas","text":"La barre de référence garde la même longueur."},{"label":"Les parts deviennent plus petites","text":"Chaque moitié est découpée en deux quarts."}],"takeaway":"Une fraction équivalente représente la même quantité avec un autre découpage."},
          {"id":"equivalent-fraction-visual-half","type":"visual","title":"Une moitié coloriée","content":"La barre entière est partagée en deux parts égales; une part est coloriée.","visual":{"kind":"fraction_bar","purpose":"Voir la quantité correspondant à une moitié.","alt_text":"Une barre partagée en deux parts égales, avec une part coloriée.","data":{"numerator":1,"denominator":2}}},
          {"id":"equivalent-fraction-visual-fourths","type":"visual","title":"Deux quarts coloriés","content":"La même barre entière est maintenant partagée en quatre parts égales; deux parts sont coloriées.","visual":{"kind":"fraction_bar","purpose":"Comparer la longueur coloriée avec la barre d’une moitié affichée juste avant.","alt_text":"Une barre de même longueur partagée en quatre parts égales, avec deux parts coloriées.","data":{"numerator":2,"denominator":4}}},
          {"id":"select-two-fourths","type":"interactive_activity","activity":{"schemaVersion":1,"id":"cm2-fraction-select-2-4","kind":"fraction-select","schoolLevel":"CM2","title":"Sélectionner deux quarts","prompt":"Sélectionne deux parts parmi quatre parts égales.","target":{"n":2,"d":4},"transfer":{"n":1,"d":2}}},
          {"id":"equivalence-mastery-check","type":"mastery_check","questions":[{"id":"equivalence-q1","question":"Quelle fraction représente la même quantité qu’une moitié parmi quatre parts égales ?","answer_type":"multiple_choice","choices":["\\(\\frac{2}{4}\\)","\\(\\frac{1}{4}\\)","\\(\\frac{4}{2}\\)"],"correct_answer":"\\(\\frac{2}{4}\\)","skill":"Reconnaître une fraction équivalente","difficulty":1,"success_feedback":"Oui : deux quarts couvrent la même quantité qu’une moitié.","error_feedback":"Compare la longueur coloriée des deux barres."}]}
        ],
        "mastery":{"skills":["Expliquer une équivalence de fractions par subdivision égale"],"threshold":0.8}
      }
    },
    {
      "id": "cm2-fractions-level-3",
      "level_number": 3,
      "title": "Additionner des quarts de même taille",
      "purpose": "Transformer avant d’additionner, puis relier le nombre de parts au résultat.",
      "difficulty": "pratique guidée",
      "objective_ids": ["<id-objectif-cm2-addition-fractions-existant>"],
      "lesson": {
        "lesson_goal": "Résoudre \\(\\frac{3}{4}+\\frac{1}{2}\\) en remplaçant les moitiés par des quarts équivalents.",
        "success_criteria": ["Je n’additionne pas des parts de tailles différentes.","Je réécris \\(\\frac{1}{2}\\) sous forme de quarts.","J’additionne les parts de même taille et j’interprète le résultat."],
        "prerequisites": [
          {"id":"equivalent-half-quarter","description":"Reconnaître l’équivalence entre une moitié et deux quarts.","check_question":"Combien de quarts représentent une moitié ?","answer_type":"numeric","expected_answer":"2","remediation_hint":"Partage chacune des deux moitiés en deux parts égales."}
        ],
        "misconceptions": [
          {"id":"add-denominators","description":"L’élève additionne aussi les dénominateurs.","detect_if":"Il écrit \\(\\frac{3}{4}+\\frac{1}{2}=\\frac{4}{6}\\).","feedback":"Les dénominateurs décrivent la taille des parts. Il faut d’abord parler de parts de même taille.","remediation_strategy":"Revenir aux bandes : transformer la moitié en deux quarts, puis compter trois quarts et deux quarts."},
          {"id":"ignore-equivalence","description":"L’élève ajoute le numérateur sans transformer la moitié.","detect_if":"Il écrit \\(\\frac{3}{4}+\\frac{1}{2}=\\frac{4}{4}\\).","feedback":"Le quart et la moitié ne sont pas des parts de même taille.","remediation_strategy":"Demander combien de quarts couvrent la moitié avant de calculer."}
        ],
        "sequence": [
          {"id":"fraction-add-worked","type":"worked_example","context":"On additionne trois quarts de la même barre et une moitié de cette barre.","steps":[{"instruction":"Découper chaque moitié en deux parts égales.","representation":"La barre d’une moitié devient deux quarts.","reason":"La quantité coloriée reste la même; seules les parts sont plus petites."},{"instruction":"Réécrire la somme avec des quarts.","representation":"\\(\\frac{3}{4}+\\frac{2}{4}\\)","reason":"Les deux fractions comptent maintenant des parts de même taille."},{"instruction":"Additionner les parts coloriées.","representation":"\\(\\frac{3}{4}+\\frac{2}{4}=\\frac{5}{4}\\)","reason":"Trois quarts et deux quarts font cinq quarts."},{"instruction":"Interpréter cinq quarts.","representation":"\\(\\frac{5}{4}=1+\\frac{1}{4}\\)","reason":"Quatre quarts font un tout; il reste un quart."}],"conclusion":"La somme vaut un tout et un quart."},
          {"id":"fraction-add-guided","type":"interactive_activity","activity":{"schemaVersion":1,"id":"cm2-fraction-add-3-4-plus-1-2","kind":"fraction-bar","schoolLevel":"CM2","title":"Additionner trois quarts et une moitié","prompt":"Transforme les moitiés en quarts puis additionne.","left":{"n":3,"d":4},"right":{"n":1,"d":2},"targetDenominator":4,"transfer":{"left":{"n":1,"d":4},"right":{"n":1,"d":2},"targetDenominator":4}}},
          {"id":"fraction-add-check","type":"feedback_checkpoint","question":"Pourquoi peut-on additionner les numérateurs après avoir transformé \\(\\frac{1}{2}\\) en \\(\\frac{2}{4}\\) ?","answer_type":"multiple_choice","choices":["Parce que les deux fractions comptent maintenant des quarts de même taille","Parce qu’on additionne aussi les dénominateurs"],"correct_answer":"Parce que les deux fractions comptent maintenant des quarts de même taille","success_feedback":"Exact : les parts ont la même taille, donc on peut compter toutes les parts ensemble.","error_feedback":"Regarde la taille d’une part dans chaque barre. Il faut des parts de même taille avant de les réunir.","hints":["Compare la taille d’un quart et d’une moitié.","Réécris la moitié comme deux quarts."]},
          {"id":"fraction-add-mastery-check","type":"mastery_check","questions":[{"id":"fraction-add-q1","question":"Combien vaut \\(\\frac{3}{4}+\\frac{1}{2}\\) ?","answer_type":"multiple_choice","choices":["\\(\\frac{5}{4}\\)","\\(\\frac{4}{6}\\)","\\(\\frac{4}{4}\\)"],"correct_answer":"\\(\\frac{5}{4}\\)","skill":"Additionner après mise en parts de même taille","difficulty":1,"success_feedback":"Oui : une moitié vaut deux quarts, puis trois quarts et deux quarts font cinq quarts.","error_feedback":"Transforme d’abord la moitié en quarts, puis additionne les parts."}]}
        ],
        "mastery":{"skills":["Additionner des fractions compatibles en utilisant une équivalence"],"threshold":0.8}
      }
    },
    {
      "id": "cm2-fractions-level-4",
      "level_number": 4,
      "title": "Résoudre un nouveau calcul et expliquer le résultat",
      "purpose": "Réutiliser la méthode avec d’autres valeurs et vérifier le sens de la somme.",
      "difficulty": "transfert",
      "objective_ids": ["<id-objectif-cm2-addition-transfert-existant>"],
      "lesson": {
        "lesson_goal": "Résoudre une somme nouvelle de fractions compatibles et expliquer pourquoi les parts peuvent être réunies.",
        "success_criteria": ["Je repère les tailles de parts.","Je choisis une écriture équivalente avec des parts de même taille.","Je calcule puis je vérifie si le résultat est inférieur ou supérieur à un tout."],
        "prerequisites": [
          {"id":"same-size-parts","description":"Savoir que seules des parts de même taille peuvent être comptées ensemble.","check_question":"Avant d’additionner, que dois-tu vérifier ?","answer_type":"short_text","expected_answer":"Que les parts ont la même taille","remediation_hint":"Compare les dénominateurs et cherche une écriture équivalente."}
        ],
        "misconceptions": [
          {"id":"copied-result","description":"L’élève recopie le résultat de l’exemple travaillé sans appliquer la méthode aux nouvelles valeurs.","detect_if":"Il donne la réponse précédente ou additionne les mauvais numérateurs.","feedback":"Les nombres ont changé. Représente chaque quantité et vérifie la taille d’une part.","remediation_strategy":"Demander d’abord une fraction équivalente, puis laisser l’élève effectuer la somme avec une nouvelle tentative."}
        ],
        "sequence": [
          {"id":"fraction-transfer-activity","type":"interactive_activity","activity":{"schemaVersion":1,"id":"cm2-fraction-transfer-2-4-plus-1-4","kind":"fraction-bar","schoolLevel":"CM2","title":"Résoudre une nouvelle addition","prompt":"Additionne deux quarts et un quart, puis essaie le calcul de transfert sans aide.","left":{"n":2,"d":4},"right":{"n":1,"d":4},"targetDenominator":4,"transfer":{"left":{"n":1,"d":4},"right":{"n":1,"d":2},"targetDenominator":4}}},
          {"id":"fraction-transfer-reflection","type":"reflection","question":"Dans le calcul de transfert, qu’est-ce qui a changé et qu’est-ce qui doit rester égal pour additionner ?","expected_idea":"Les nombres peuvent changer, mais il faut réécrire les fractions avec des parts de même taille; la quantité reste la même lors d’une équivalence."},
          {"id":"fraction-final-summary","type":"concept","title":"La méthode à retenir","content":"Pour additionner des fractions de tailles différentes, on cherche une écriture équivalente avec des parts de même taille. On additionne alors les nombres de parts. Par exemple : \\(\\frac{1}{4}+\\frac{1}{2}=\\frac{1}{4}+\\frac{2}{4}=\\frac{3}{4}\\).","takeaway":"Je transforme les fractions sans changer leur quantité, puis je compte les parts de même taille."},
          {"id":"fraction-transfer-mastery-check","type":"mastery_check","questions":[{"id":"fraction-transfer-q1","question":"Pour résoudre \\(\\frac{1}{4}+\\frac{1}{2}\\), quelle écriture garde la même quantité et permet de compter des parts de même taille ?","answer_type":"multiple_choice","choices":["\\(\\frac{1}{4}+\\frac{2}{4}\\)","\\(\\frac{2}{4}+\\frac{1}{2}\\)","\\(\\frac{1}{5}+\\frac{1}{3}\\)"],"correct_answer":"\\(\\frac{1}{4}+\\frac{2}{4}\\)","skill":"Justifier la mise en parts de même taille","difficulty":2,"success_feedback":"Exact : une moitié équivaut à deux quarts.","error_feedback":"Vérifie que chaque fraction garde sa valeur et que les deux parts deviennent des quarts."}]}
        ],
        "mastery":{"skills":["Transférer la méthode et justifier l’équivalence"],"threshold":0.8}
      }
    }
  ]
}
```

### Payload compatibility annotation

| Payload portion | Current validation status at 844ce9e | F.03 requirement |
|---|---|---|
| Top-level `version`, `topic_goal`, four `levels`; level identity/title/purpose/difficulty/objectives; nested goals, criteria, prerequisites, misconceptions, sequence and mastery | Accepted by `validateLessonV21` when values meet its constraints. | Add schema-level tests using this exact sample after replacing objective placeholders. |
| `hook`, `concept`, `visual`, `worked_example`, `feedback_checkpoint`, `reflection` blocks and fields shown | Accepted by existing V2.1 switch. Actual visual renderer data shape and every display behavior still need fixture tests. | Exercise student and admin preview from the same payload. |
| `interactive_activity` block shell plus `fraction-select` and `fraction-bar` specs | Accepted by current V2.0 `LessonBlockSchema` / `InteractiveActivitySchema`; **rejected by current V2.1 `validateLessonV21`** because no case exists. | Permit only by delegating nested spec to existing `InteractiveActivitySchema`; render through current `LessonV21Path` → `LessonV2Player` → `InteractiveActivityHost`. |
| Placeholder strings inside `objective_ids` | Syntactically accepted as non-empty strings, but not real curriculum/objective references and not import-ready. | Resolve exact objective IDs from selected topic before draft validation; reject missing/stale IDs in import context if the existing workflow supports this. |
| `schoolLevel: "CM2"` | Accepted by activity schema; a label is not teacher approval or objective mapping. | Confirm teacher and curriculum year; never treat schema success as grade approval. |
| F.01A display markup `\\(...\\)` | String fields validate; renderer displays supported safe math. This does not alter answer contracts. | Browser test the sample in V2.1/player/admin contexts and ensure no raw delimiters/commands leak. |

### Annotated sequence

1. **Level 1 — Discover and manipulate:** the hook anchors “parts of a whole.” The student selects 3 of 4 equal parts, then a changed fraction provides a check. This proves a selection task was completed, not that the student can yet explain addition.
2. **Level 2 — Understand equivalence:** prose names what stays invariant (the whole and colored length); the visual compares one half with two fourths; `fraction-select` lets the learner select two fourths. A short reflection/check should ask why the amount is unchanged before moving to addition.
3. **Level 3 — Practise together:** a worked example gives each mathematical step and reason. The existing fraction-bar activity models conversion and addition, then offers a changed-value transfer. The feedback checkpoint asks why same-sized parts matter; its hints are targeted and preserve the attempted work.
4. **Level 4 — Independent transfer:** the activity uses a new sum and then a different transfer item. The student should first attempt without a hint; feedback/remediation is available on error. Completion wording must describe the activity result, not durable mastery. The reflection and summary consolidate the invariant and method.

**Mathematical audit of examples:** `3/4 + 1/2 = 3/4 + 2/4 = 5/4 = 1 + 1/4`; transfer `1/4 + 1/2 = 1/4 + 2/4 = 3/4`; final practice `2/4 + 1/4 = 3/4`, transfer `1/4 + 1/2 = 3/4`. All denominators satisfy the current fraction-bar divisibility constraints. The sample does not require the student to find a least common denominator; every instance uses the smaller denominator as a divisor of the larger, consistent with the current bounded engine.

## 10. Learning evidence and progression design

### What can be said now

- `ActivityProgress` and `learningEvidence` are activity-local structures. In V2.0 the player stores activity progress in component state keyed by block while that player remains mounted. It can preserve it across sequence navigation within the mounted player, but the detailed input/evidence state is not established as durable across refresh or unmount.
- `LessonV2Player` records activity completion analytics with activity ID, attempts, hints and the independent result. It has a separate lesson-completion upsert to `user_learning_progress`. The code does not show a persistent projection of all learningEvidence booleans to a canonical student model.
- `LessonV21Path` stores per-level scores and positions in learner-scoped localStorage and calls the existing objective-mastery update from its level mastery callback. It does not store activity-level exposure/guided/assisted/independent/transfer detail in that local summary.
- V2.1 level progression threshold and the player's activity continuation gate are not the same evidence. Completing an activity block may satisfy its continuation gate; level completion/mastery is governed by the existing player callback/threshold path.

### Proposed semantics (no calculation changes)

| Evidence | Meaning | Permitted progression use in F.03 |
|---|---|---|
| Exposure | Learner opened/saw demonstration or representation. | Resume/experience signal only; no score, XP or mastery. |
| Guided completion | Learner completed steps with prompts or worked disclosure. | May satisfy block's existing completion gate; never independent mastery. |
| Assisted success | Correct after hint, error feedback, retry or disclosed solution. | Keep as assisted evidence; it may help adapt next instruction but must not be relabeled independent. |
| Independent success | Correct on a valid independent prompt before relevant hint/disclosure, under the activity's existing evidence rule. | Preserve activity analytics independent flag. Do not alter global mastery formula/threshold. |
| Transfer success | Correct on changed values/representation/context. | Preserve separately; use as a future recommendation signal only after data-owner approval. |

The current level gate remains the current score threshold. F.03 should add regression tests that demonstrate (a) viewing the demo does not increase the level score, (b) guided completion unlocks only the next block if that is existing behavior, (c) an activity completion does not itself add objective mastery or XP, (d) existing mastery-check threshold still controls level progress, and (e) no duplicate completion event is emitted when revisiting or changing mode.

Do not persist new evidence or change database schema in F.03. A later evidence-persistence design needs explicit data ownership, privacy/retention, idempotency/session identifiers, unmount/reload semantics and migration review. Until then, tell authors and users that detailed evidence can be lost on refresh/unmount; only existing local score/resume position and existing analytics/progress mechanisms have their current behavior.

## 11. Backward compatibility and fail-safe behavior

1. Do not rewrite any published `topics.lesson_content` in place. New content is a new draft/version and publication uses the existing guarded workflow.
2. Preserve strict V2.0 and V2.1 parsing and legacy lesson rendering. V2.1 activity acceptance is additive; no existing block discriminator is renamed.
3. Keep current lesson title/topic-name fallback and existing student progress keys. Do not change level IDs in an existing lesson version; new version IDs should be stable in that version.
4. Preserve `InteractiveActivitySchema`, the exact answer parsers, rational math, grading contracts, hints, animation implementations and reduced-motion behavior.
5. Maintain V2.1-first routing. A malformed V2.1 activity should produce a visible actionable validation issue in teacher/admin preview; do not allow it to reach a blank player via legacy fallback.
6. Unsupported kind, schema version or out-of-range value must fail closed. Never remove an invalid block silently, mark it complete, convert its `kind` to a “closest” type, or fabricate a component id.
7. Parse failure should expose stable issue paths for the editor and QA. Validation errors should not include unsafe echoed HTML/LaTeX as executable markup.
8. Test already published V2.1 lessons, V2.0 activities, legacy lessons, missing/unknown types, normalized V2.0 activity payloads and student progress records without any database mutation.

## 12. Remaining architecture decisions

| Decision / missing fact | Current evidence | Required resolution |
|---|---|---|
| Canonical product architecture | Named document unavailable in repo/provided files/search. | Owner provides exact document/version or confirms this proposal as the direction. |
| V2.2 | No explicit spec or runtime found; “staging” has separate implementation on main/guided branch. | Confirm no separate V2.2 contract exists and do not relabel staging. |
| Generation/publication workflow availability on implementation base | Staging workflow and migrations are on main/guided branch, absent from F.01A feature tree. | Before F.03, reconcile merge base and select already-existing workflow code; no duplicate database/workflow implementation. |
| V2.1 visual payload/rendering | Validator's visual checks are permissive; player expects renderer-specific data. | Confirm exact visual data contract with fixtures before adding generated diagrams. |
| External ChatGPT draft import | No verified import path in target feature tree. | Product owner confirms whether a later task should add import to the existing version workflow; no direct write to `topics.lesson_content`. |
| Detailed activity evidence durability | In-memory per block; analytics subset and localStorage score/position elsewhere. | Data-owner decision on persistence, privacy, retries/idempotency and refresh recovery before any schema proposal. |
| Teacher editing/rejection and approval status | F.01 audit found read-only preview and no reject/edit action in the audited paths; teacher approval remains pending. | Resolve existing admin workflow needs separately; technical validation is not teacher approval. |
| Curriculum mapping | CM2 example aligns with broad new Cycle 3 fraction objectives but exact topic objective IDs/year mapping need resolution. | Bind actual objective IDs and obtain a CM2 teacher's review; do not claim approval. |
| Video placement | Existing video is a separate topic resource. | Keep separate in F.03; approve an in-sequence block only through later schema/design review. |

## 13. Detailed F.03 implementation plan (requires separate authorization)

F.03 should implement only after this contract is reviewed and the workflow branch/source discrepancy is resolved:

1. **Branch preflight:** record current heads and merge bases for `main`, `feature/guided-practice-lessons`, and the implementation branch. Identify whether existing draft workflow files will be available after the intended PR base; do not cherry-pick or merge as part of a validator change without authorization.
2. **Schema seam:** add focused shared validation so V2.1 recognizes `interactive_activity` only through `InteractiveActivitySchema`. Avoid circular imports and do not create another registry or player.
3. **Normalization repair:** change V2.0 fallback to strictly validate normalized blocks; add a valid normalized activity case and invalid/unknown-kind/schema-version cases. Preserve valid optional/provider normalization without unchecked casts.
4. **Route/player integration:** retain LessonContentStudent dispatch and LessonV21Path → LessonV2Player. Verify all seven kinds have at least one V2.1 fixture and that fractional activity/equation outputs use F.01A rendering.
5. **Author/admin validation:** make server/draft validation and preview report the same activity issues. Confirm they reuse the workflow on its owning branch and that invalid data cannot be saved as validated or published.
6. **Evidence tests:** verify no exposure→mastery, guided→independent, duplicate activity completion, duplicate XP, or new persistence writes. Existing score/threshold contracts remain unchanged.
7. **Backward compatibility tests:** retain all legacy/V2.0/V2.1 player fixtures; include unsupported and malformed content fail-safe assertions.
8. **Quality checks:** focused unit and schema tests, TypeScript, lint, build, exact-hosted browser matrix, actual LessonV2Player integration checks, and QA screenshot/report artifact. Test mobile layouts and keyboard/touch interactions on activity-containing V2.1 paths.
9. **Draft-only review:** if external import is authorized, import only to a new draft using the existing version workflow; review in teacher/admin preview. Do not publish, change Supabase schema or modify published lessons under F.03 unless separately authorized.
10. **Closeout:** update this design's implementation status, interactive intelligence catalog and ledger with exact commits, tests, preview source SHA and remaining teacher decisions.

## 14. Evidence and acceptance boundaries

- F.01A exact feature source: [commit 844ce9e](https://github.com/UltraSaura/tutorly-navi/commit/844ce9e497c55d42d2f52a332b7b935ed2b70fc7).
- F.01A exact-head hosted browser/player acceptance: [run 46061878502](https://github.com/UltraSaura/tutorly-navi/actions/runs/46061878502); final QA screenshots/report: [artifact 15228458618](https://github.com/UltraSaura/tutorly-navi/actions/runs/46061878502/artifacts/15228458618).
- Lesson generation/version workflow evidence: [main branch generation progress](https://github.com/UltraSaura/tutorly-navi/blob/main/docs/lesson-generation-progress.md), [lessonVersionWorkflow.ts](https://github.com/UltraSaura/tutorly-navi/blob/main/src/services/lessonVersionWorkflow.ts), and migrations [draft table](https://github.com/UltraSaura/tutorly-navi/blob/main/supabase/migrations/20261014111115_create_topic_lesson_versions.sql) / [guarded publish RPC](https://github.com/UltraSaura/tutorly-navi/blob/main/supabase/migrations/20261014111455_publish_topic_lesson_version.sql). These are main-branch evidence and not claims that those paths are present at F.01A feature SHA.
- Applicable CM2 curriculum: [Cycle 3 mathematics programme, BO 16/2025](https://www.education.gouv.fr/bo/2025/Hebdo16/MENE2504620A), in application to CM2 from rentrée 2026–2027; supporting resources: [Éduscol Cycle 3](https://eduscol.education.gouv.fr/5712/ressources-d-accompagnement-du-programme-de-mathematiques-au-cycle-3).
- Teacher review is outstanding. The preview and CI validate software behavior, not pedagogical effectiveness or curriculum approval. The JSON above has not been run through current validators as a complete payload because current V2.1 intentionally rejects its activity blocks and its objective IDs remain placeholders. It is a proposed design, not a validated/importable lesson.

**F.02 conclusion:** the recommended design is ready for review, while the canonical product document, version-workflow branch reconciliation and teacher review remain open decisions.

## 15. F.03 implementation record

**Status: implemented on the isolated feature branch; hosted acceptance and cross-branch integration remain separate gates.** The V2.1 validator now accepts `interactive_activity` only by delegating its payload to the existing `InteractiveActivitySchema` in `src/features/explanation-v2/activityContract.ts`. Its allow-list is therefore the existing seven discriminated kinds. Validation reports nested activity paths and rejects duplicate block IDs and activity IDs across the lesson. The validator also accepts the existing staging prerequisite format through an options argument, preserving the default legacy contract for current callers.

The V2.0 parser now strictly validates canonical and harmlessly normalized lesson content through `LessonV2Schema`; it no longer returns unsupported content through the former type allow-list fallback. Invalid modern versioned content is shown as an unavailable lesson in `LessonContentStudent`, rather than being reinterpreted by the permissive legacy renderer. Existing legacy inputs remain on their legacy path. Activity schema refinement messages now include actionable nested field paths.

`LessonContentStudent → LessonV21Path → LessonV2Player → InteractiveActivityHost` remains the rendering path. The isolated four-level CM2 test fixture is `src/features/explanation-v2/fixtures/cm2FractionLessonV21.fixture.ts`; its objective IDs are explicitly test placeholders and it is not persisted or approved. `v21ActivityFixtures.ts` covers each existing activity kind. The hosted browser runner exercised the four-level gates, transfer items, mode switching, keyboard/touch, reduced motion and 320/375/390/447/1280px widths. Final run 46074138414 passed 195/195 standalone checks, 80/80 player checks, and 6/6 production-built demo checks. See the final F.03 evidence below.

Local verification at the implementation checkpoint: 42/42 focused tests passed, TypeScript and focused lint passed (0 errors; QA-only Fast Refresh warning), `node --check` passed, and production build passed. Final hosted run [46074138414](https://github.com/UltraSaura/tutorly-navi/actions/runs/46074138414) passed the unit/build job (93 tests, TypeScript, focused lint, production build) and browser job (195/195 standalone, 80/80 LessonV2Player including all seven V2.1 kinds and the full CM2 path, plus 6/6 production demo checks). Screenshot/QA artifact: [15233663871](https://github.com/UltraSaura/tutorly-navi/actions/runs/46074138414/artifacts/15233663871).

**Branch/workflow boundary:** `src/services/lessonVersionWorkflow.ts`, `StagingLessonWorkflowPage.tsx`, `StagingLessonVersionPanel.tsx` and the guarded publication migrations exist on the audited `main` / `feature/guided-practice-lessons` line, not this implementation tree. The main-branch workflow's `validateLessonV21(..., { prerequisiteFormat: 'staging' })` call is supported by the new validator option, but no staging UI, workflow, migration, or publication path was copied or recreated here. The separate Edge Function validator at `supabase/functions/generate-lesson-content/lesson-v21-contract.ts` still rejects interactive blocks and writes its own generated content contract; it is not an accepted draft import route. Reconcile shared validator imports and activity validation in the owning workflow only in a separately authorized integration task; do not write directly to `topics.lesson_content`.

**Evidence remains local:** lesson activity evidence is not made durable by this change. Demonstration, guided, independent and transfer semantics continue to be governed by existing activity/player logic; no persistent mastery formula, XP attribution, or schema was changed. Full evidence durability after refresh/unmount requires a separately approved design. The teacher must still bind real curriculum objective IDs and review the lesson. The unavailable canonical architecture document and explicit V2.2 specification remain unresolved. The exact-source non-production preview was READY at [stuwy-6el0v7gsd-stuwy.vercel.app/demo.html](https://stuwy-6el0v7gsd-stuwy.vercel.app/demo.html), source `a8d5ba301e0f1846edd17f45eb0b5e0fbc3590de`; the demo remains simulated and does not establish integration into the divergent main/guided staging workflow. The hosted run also caught and verified a fix for the V2.1 end-state sentinel (`findIndex` returning -1 after all levels).
