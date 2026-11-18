# Brilliant patterns: evaluation and implementation preparation

Date: 18 November 2026. Source review only; this document does not change the app, database, deployments, or the Google Doc.

Source: [Brilliant to Tutorly — Product Direction and Module Plan](https://docs.google.com/document/d/1XCmQzet8PW1KkxUApTdAUxy19e_xPuZsaMwuLQ1LgJY/edit?tab=t.0#heading=h.f8rtvxk9lfzk), tab `t.0`, read through the connected Google Docs tool. The source is a synthesis of two observed paths, not a full Brilliant audit. Its recommendation and code names are proposals, not established Tutorly requirements.

Repository reviewed: the working `feature/guided-practice-lessons` checkout. It contains local work as well as committed code. This inventory does not imply that every listed feature is on the Vercel main/development/practice deployments. No live database schema or signed-in learner data was read.

## Evaluation

The proposed learning loop fits Tutorly: one focused step, an active response, deterministic validation, short feedback, targeted support, retry, then a fresh independent check. Its strongest addition is to preserve correct substeps and explain only the unresolved part. It does not require a second tutor, course hierarchy, or mastery store.

The document correctly distinguishes observed UI from inferred algorithms. Keep that distinction: the confidence diagnostic does not establish Brilliant's recommendation algorithm, an intentionally incorrect session does not establish remediation efficacy, and the 30-lesson coordinate catalogue does not define Tutorly's curriculum. Tutorly's examples, copy, assets, and feedback must be original.

Most of the delivery pieces already exist. The significant work is a small adapter between them and reliable evidence semantics. A broad replacement runtime would introduce avoidable risk while the current lesson, quiz, and progress paths still differ.

## Reuse and required changes

Paths below are relative to the repository root.

| Capability in the source | Existing Tutorly evidence | Recommended change |
| --- | --- | --- |
| Short sequenced lessons | `src/components/learning/LessonV2Player.tsx` owns block index, prerequisite checks, hints, retry state, mastery check, and completion. `LessonV21Path.tsx` owns level selection and local position/progress. | Add a thin adapter around one existing block type. Keep the current player and progression; do not introduce a parallel course system. |
| One problem per screen | `src/components/learning/QuizOverlay.tsx` owns `currentIndex`, submission, attempts and question grades; `QuestionCard.tsx` renders the actual question. | Reuse this path for Practice. A session runner must not duplicate submission or score ownership. |
| Deterministic checking | `src/utils/quizEvaluation.ts` implements `evaluateQuestion`, completeness checks and score penalties for existing question types. | Register new types here, with focused tests. Keep correctness independent of generated prose. New feedback can consume a deterministic result. |
| Partial correctness | `src/features/practice/numberLine/numberLineTypes.ts` defines a result with `correct`, `incorrect`, `partial` and per-item correctness. `GraduatedNumberLineActivity.tsx` computes those results. | Adapt this existing result to feedback that affirms correct items and targets the earliest unresolved item. Do not reduce partial work to one boolean before feedback. |
| Preserve learner work | Number-line read-value and placement retries preserve answers/placements; ordering retries deliberately reset to a deterministic initial arrangement. | Preserve correct placements for the first pilot. Changing ordering retry behavior needs its own explicit pedagogical decision and regression coverage. |
| Interactive tools | Number-line code already supports tick selection, dragging, keyboard handlers and select-based alternatives. Counting and subtraction have object models; the current task adds equal groups and colour grids. | Reuse these models. Build CoordinatePlane only after one tool runs through the adapter successfully. A static `coordinate_plane` visual is not an interactive plotter. |
| Shared visual rendering | `src/components/learning/LessonVisualBlock.tsx` and `PedagogicalVisual.tsx` render existing lesson visuals. `src/types/lesson-generator.ts` enumerates visual kinds, including groups, number line and coordinate plane. | Keep display visuals separate from tools with controlled actions and validators. Reuse frame, legends and accessible text; do not assume a supported visual kind has a working interactive implementation. |
| Feedback and explanation | `QuestionCard.tsx`, `PracticeFeedback`, `src/features/explanations/TwoCards.tsx` and the explanation runtime already supply feedback and remediation surfaces. | Add authored structured feedback actions and render them in existing surfaces. Keep a brief success message and Continue distinct from an optional explanation. |
| Attempts and evidence | `src/services/learningAnalytics.ts` accepts topic/objective/question IDs, correctness, attempt number, hint use, timing and bounded metadata. It writes only when `VITE_ENABLE_LEARNING_ANALYTICS === 'true'`. | Define support/independence fields and mapping before enabling new writes. Extend and test the existing question-kind allowlist when needed; unknown kinds currently become null. |
| Scores and review | `quizEvaluation.ts` awards 1, 0.5, 0.25, then 0 of the available points on successive successful attempts. `QuizOverlay.tsx` records grades and attempts. | Preserve existing Practice scoring. A coached recovery must not overwrite an assessment's original score. Hint use and retry count are different facts. |
| Objective mastery | `src/lib/mastery.ts` stores the historical maximum score in `objective_mastery`, marking scores at least 80 as mastered. `LessonV21Path.tsx` sends mastery results to that helper. | Do not send supported or revealed solves as independent mastery evidence. Define a policy and adapter first; a new feedback UI must not silently redefine mastery. |
| Shared progress | `src/lib/progressService.ts` aggregates topic objectives and `objective_mastery` for student/guardian/teacher views. Lesson completion is also written to `user_learning_progress`. | Preserve the distinction between completion, best score, current evidence and independent mastery. Confirm deployed constraints and RLS before any persistence change. |
| Authoring and publication | `src/components/admin/learning/QuestionEditor.tsx` edits existing quiz types. `src/services/lessonVersionWorkflow.ts` validates drafts, stores versions and publishes through `publish_topic_lesson_version`. `src/types/lesson-v21-contract.ts` owns the canonical V2.1 contract. | Extend existing editors and publication validators. Add new response/tool types through a versioned adapter and validation, not by bypassing the canonical lesson validator. |
| Recommendations | `src/hooks/useRecommendations.ts` invokes an existing recommendations function; the app also has learning-resource recommendation flows. | Inspect and adapt these before introducing a new scheduler. Treat resume/prerequisite/review priorities as proposed Tutorly policy, not recovered Brilliant behavior. |

## Gaps requiring explicit decisions

1. **Supported versus independent outcome.** `LessonV2Player` can call `onMasteryResult` after retries and hints; the current boolean/result alone does not prove independent understanding. `QuizOverlay` currently includes `hintUsed: false` in submission analytics. Neither should become a claimed independent mastery signal without a richer adapter.
2. **Revealed answer.** The Brilliant proposal allows a worked explanation after bounded hints. Existing Tutorly requirements keep hints from revealing answers. Introduce a separately labeled explanation action only in a context where that policy is agreed, and require a fresh transfer task for independent evidence.
3. **Source/current/historical scores.** A historical maximum in `objective_mastery` cannot represent current mastery, assessment score, coached recovery and confidence at once. Do not reinterpret that column or replace its semantics during a UI change.
4. **Exact curriculum placement.** Coordinate reading, negative coordinates, linear equations and graph transformations need objective/grade mapping for the active French curriculum. The document's Brilliant catalogue is not sufficient evidence for a grade assignment.
5. **Session persistence.** There are already learner-scoped local stores and topic/level progress hooks. A generic resumable session needs stable content-version, topic, objective and learner keys; otherwise edits or profile switches can restore the wrong state.
6. **New activity observability.** New question kinds must survive the analytics allowlist; correct-part feedback, support stage and transfer must be recorded consistently when analytics is enabled. Do not write raw learner text or sensitive prompts into event metadata.

## Proposed contracts, before implementation

Use TypeScript adapters first. These are not new database tables or a replacement content schema:

- `LearningStepRef`: existing topic/objective/question or lesson-block identity, content version, intent and renderer kind.
- `AttemptEvidence`: deterministic correctness, optional per-part results, attempt count, hint stage, explanation/reveal use, supported/independent classification, and duration when available.
- `FeedbackAction`: `acknowledge`, `focus_part`, `hint`, `change_representation`, `explain`, `retry`, `continue`, or `transfer`, with authored copy and target part/tool state.
- `SessionIntent`: distinguish teaching, prerequisite assessment, scored Practice, remediation and independent check. Rendering may be shared while score, hint and mastery policy remain explicit.

Keep separate owners: the existing quiz/player owns current score and navigation; the feedback adapter owns which support to show; the existing analytics/mastery adapters own writes. Do not add another effect that records the same event or completion.

If these fields cannot be represented safely by existing event columns and bounded metadata, prepare a migration proposal showing the exact constraints, RLS, compatibility and rollback before changing a deployed schema. No schema change is justified merely to draw an interactive model.

## Implementation order and acceptance gates

| Phase | Concrete deliverable | Acceptance gate |
| --- | --- | --- |
| 0. Reconcile | Inventory active branches/deployments and current contracts; choose one curriculum objective and fixture. | Exact source and target are known; existing lesson navigation still works. |
| 1. Feedback pilot | Adapt one existing equal-groups or word-problem question to authored step-level feedback. Preserve the correct operation/quantity when the other part is wrong. | Wrong/partial/correct/retry/hint flows pass deterministic tests; no answer leaks in hints; no independent mastery from a coached solve. |
| 2. Tool pilot | Host the existing number-line tool through the same result/feedback adapter. Reuse per-item validation and non-drag controls. | Same adapter works for a conventional question and a visual tool; keyboard, touch, narrow mobile, reduced motion and accessible labels are checked. |
| 3. CoordinatePlane v1 | Positive-quadrant select/plot/read tasks, labeled axes and origin, direct x/y entry, move controls and per-axis feedback. | A response such as correct x/wrong y preserves x, focuses y and can be corrected without restarting. Exact comparison and bounds are tested. |
| 4. Evidence adapter | Map authored attempt facts to existing analytics and independent mastery policy. | Disabled analytics produces no writes; enabled synthetic transport tests validate payloads; guardian/student aggregation semantics remain consistent. Live schema/RLS audit precedes any production persistence change. |
| 5. Transfer and review | Distinct assessment result, coached review and fresh independent retry. | Original score remains unchanged; fresh success is associated with its own attempt; completion is not automatically mastery. |
| 6. Tutor handoff | Resume original homework context after focused prerequisite practice, using the existing Tutor/explanation surfaces. | Same learner, task, content version and context restore correctly; cancellation, profile switching and bounded remediation do not loop. |
| 7. Broader authoring | Validated templates, previews, misconception branches and curriculum mapping in existing admin. | Invalid/unsupported payloads fail publication clearly; no handcrafted screen is required per problem. |

## Recommended first pilot

Use the equal-groups module being implemented for the Synthesis-inspired work as the first feedback pilot: validate group count, group size and total separately; preserve correct construction; coach only the unresolved relation between repeated addition and multiplication. Follow it with a fresh unassisted question. This avoids building an unrelated new screen before the shared feedback contract is proven.

Use the existing graduated number line as the second pilot. It already provides the multi-part result shape needed for partial-correctness feedback. CoordinatePlane should follow once these two examples demonstrate that the adapter is reusable.

## Validation required before claiming delivery

- Deterministic validators: zero/empty/incomplete input, wrong operation, partial correctness, equivalent values, repeated submissions, and invalid content boundaries.
- Interactions: preserve correct parts; hints reveal a method rather than an answer; bounded support; retry; restart; complete; next problem; fresh transfer.
- Persistence: reload mid-step, learner switch, content version change, assessment versus Practice, and analytics disabled. Use synthetic transport or local disposable data; never create production learner test records.
- UI: real Practice entry, quiz-bank rendering, lesson rendering when registered, admin create/edit/preview, narrow mobile and desktop, keyboard and touch, reduced motion, accessible names and feedback announcements.
- Compatibility: existing arithmetic, number-line, lesson-start and quiz-score checks. Report pre-existing failures separately. A passing isolated component test is not evidence that every deployed branch contains the change.

## Readiness conclusion

Proceed with a thin feedback/result adapter and the equal-groups pilot after the current exercise families are validated. The document is useful as product direction and sequencing; it is not an implementation-ready specification for all modules. CoordinatePlane, mastery integration, recommendation policy and Tutor handoff each need their own scoped contracts and acceptance checks. No app or database behavior has been implemented by this evaluation.
