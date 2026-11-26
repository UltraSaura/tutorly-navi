# STUWY / TUTORLY — LIVING PROJECT LEDGER
**Version:** 1.0  
**Last reconciled:** 2026-11-26  
**Owner:** Product owner + ChatGPT/Work/Codex implementation team  
**Repository:** https://github.com/UltraSaura/tutorly-navi  
**Ledger branch:** docs/stuwy-project-ledger  
**Purpose:** Durable handover across chats, design reviews, GitHub branches, Work sessions, and releases.

> **IMPORTANT:** This ledger is a living coordination document, not proof that a feature is deployed. It must be reconciled against GitHub, the target branch, Vercel, and the real application before marking an implementation complete. A screenshot is evidence of a UI state, not of end-to-end correctness. **Do not overwrite or silently revise the canonical product architecture.**

## 0. HOW TO USE THIS FILE IN A NEW CHAT

1. Open this document from the GitHub link in the handover section below. Read the entire current ledger.
2. Read the canonical product architecture: TUTORLY_FINAL_PRODUCT_AND_ADAPTIVE_ARCHITECTURE.md (available in project source material; verify whether present in repository).
3. Ask GitHub for current branch heads, latest commits, PRs, changed files, and test/deployment status before making implementation claims.
4. Identify the exact workstream (V1 stabilization, Explanation V2, Universal Tutor V2, or shared learning architecture). **Never merge branches by assumption.**
5. Continue the first actionable item in Section 8, respecting gates and the user's latest direction.
6. At the end of every meaningful task, update this ledger in the SAME documentation branch, append a dated changelog entry, and give the user one stable link.
7. If a new chat has no GitHub access, use a downloaded copy of this file, update it explicitly, and ask for GitHub connection or for the revised file to be committed. Do not claim remote updates that did not happen.

**Single permanent handover URL:**  
https://github.com/UltraSaura/tutorly-navi/blob/docs/stuwy-project-ledger/docs/STUWY_PROJECT_LEDGER.md

**Read-first instruction for any new ChatGPT Work session:**  
"Open docs/STUWY_PROJECT_LEDGER.md on branch docs/stuwy-project-ledger in UltraSaura/tutorly-navi. Read the current ledger and the canonical Tutorly architecture. Verify live GitHub branch and preview status. Continue only the current approved workstream, keep production protected, and update the ledger with evidence, decisions, blockers, and next actions before stopping."

## 1. STATUS LEGEND AND EVIDENCE RULES

- **IDEA** — suggestion, not yet approved.
- **APPROVED / PLANNED** — product direction agreed; no claim of implementation.
- **IN PROGRESS** — work reported or demonstrated but not fully accepted.
- **IMPLEMENTED — UNVERIFIED** — code reportedly exists; not independently checked against current commit and browser.
- **DEMO REVIEWED** — the user saw a particular prototype state; not proof of deployment.
- **ACCEPTED** — user explicitly approved the specific delivered behavior after evidence.
- **BLOCKED** — dependency prevents next action.
- **DONE** — merged/deployed/tested to the specified target and accepted. Always name the target.
- **UNKNOWN / VERIFY** — do not invent completion.

Every task entry must contain: task ID, workstream, status, target branch, commit SHA (if known), preview URL (if verified), test evidence, owner/agent, blocker, next action, last update.

## 2. NON-NEGOTIABLE PRODUCT DECISIONS

### 2.1 Product vision and canonical architecture
- Stuwy/Tutorly is a French-curriculum-aligned, age-adaptive learning product from CP through Terminale.
- Five student destinations: **Home / Learn / Tutor / Practice / Me**. Subjects are inside Learn and Practice, not separate bottom navigation tabs.
- One shared learning model for mastery, misconceptions, prerequisite gaps, attempts, recommendations, and review. Tutor, Learn, and Practice share evidence and preserve session context across handoffs.
- Prefer deterministic exact grading, transformations, and animations where feasible; AI interprets submissions and generates contextual explanations but must not certify mastery on its own.
- Reuse existing Tutor chat, TwoCards, KidExplanationFlow, lesson player, curriculum, analytics, parent portal, and manipulatives before building parallel systems.
- Adapt explanations to the student's school grade, actual understanding, and age. Do not assume a rigid permanent learning style.
- Learning priority: accuracy, understanding, independence, retention; avoid decorative complexity and excessive speed pressure.

### 2.2 UX and educational quality
- Mobile-first, Android-safe areas, accessible controls, keyboard and reduced-motion support, compact use of screen space.
- Avoid large side margins, multiple nested cards, redundant text, excessively tall feedback panels, and content hidden behind bottom navigation/composer.
- Every exercise must state a **clear action** the student should take, in grade-appropriate French, before asking for input.
- Interactive learning should use selection, dragging, graph manipulation, fraction bars, number lines, balance/equation transformations, not just multiple-choice text.
- Show a **short on-screen explanation of what an animation is doing**. "Pourquoi cette étape ?" expands deeper reasoning; students should not have to open it to understand the basic action.
- Correct/incorrect feedback must be explicit; never display "Réponse non évaluée" for an evaluable answer.
- Explain mistakes with actionable hints; use progressive assistance, retries, mini-challenges, and return-to-task navigation.
- All demonstrations must distinguish mock/simulated content from actual persisted student results.

### 2.3 User approval and release boundaries
- No production app changes, protected-branch merges, Supabase migrations/data writes, paid AI calls, or public deployments without the applicable approval.
- Do not merge the Universal Tutor branch into the Explanation V2 integration workstream unless the user explicitly approves it.
- Verify before creating a preview URL; a path yielding 404 is NOT a delivered demo.
- Vercel rate/quota restrictions can block preview publication; verify current quota and retry rather than promise a reset time.
- Code completion is separate from browser acceptance, Vercel preview publication, and release.

## 3. WORKSTREAM AND BRANCH REGISTER

| Workstream | Known branch / worktree | Status | Guardrail |
|---|---|---|---|
| V1 stabilization | release/v1-stabilization; /Users/hiroshigawa/projects/stuwy-v1 | Active/historical; exact head VERIFY | Do not overwrite with V2 experiments |
| Practice and guided lessons | feature/guided-practice-lessons; historical practice/learning | Existing work; current merge state VERIFY | Reuse, do not duplicate |
| Stuwy Explanation V2 | feature/stuwy-explain-v2 | Prototype work reported; head VERIFY | Keep separate from Universal Tutor |
| Explanation V2 interactive mathematics | feature/explanation-v2-interactive-math | Relevant branch exists; actual content/merge state VERIFY | Inspect before editing |
| Explanation V2 integration | integration/stuwy-explain-v2 | Branch exists; exact integration state VERIFY | No blind merges |
| Historical explanation branch | explain | Branch exists; content VERIFY | Check for Universal Tutor content before choosing |
| Universal Tutor V2 | feature/v2-universal-tutor | Design/implementation stream, EXCLUDED from Explanation V2 consolidation by user request | No merge without approval |
| Parent experience | historical parent branch | Existing parent portal; integration state VERIFY | Preserve family RLS and child switching |
| Shared project ledger | docs/stuwy-project-ledger | Dedicated documentation-only branch | Update this file here; do not merge automatically |

**Branch safety protocol:** fetch refs; inspect git status and heads; compare merge bases and diffs; classify features and conflicts; propose selective cherry-picks/merges with explicit source/target; run regression checks; only then implement approved integration. Do not infer that similarly named branches have identical code.

## 4. MASTER PRODUCT BACKLOG — AGREED DIRECTION

| ID | Initiative | Current state | Acceptance / next step |
|---|---|---|---|
| P-01 | V2 UX/UI blueprint, mobile/desktop, 4 age bands, 5-tab navigation, parent portal | APPROVED / prototype work reported; current acceptance VERIFY | Clickable preview covering essential flows, age adaptation, errors, loading, empty states |
| P-02 | Tutor question/photo/document ingestion with rich interactive learning blocks | APPROVED / existing Tutor foundation | Demonstrate Tutor -> animation/lesson/practice -> resume original question |
| P-03 | Photomath-style mathematics: exact step-by-step symbolic transformations with animated visual demonstration | APPROVED / interactive prototype work reported | Show operation, result, concise explanation and expandable why; test math correctness |
| P-04 | Video integration in explanations and lessons | APPROVED / integration design pending | Reusable video block, curated content, captions, controls, progress/resume, fallback, age suitability |
| P-05 | Brilliant-like interactive manipulation, not copied assets/code | APPROVED / exploratory prototypes reported | Reusable fraction, number-line, graph, equation and tile interactions |
| P-06 | Student-clickable fraction models (e.g. select 3 of 4 equal parts) | DEMO REVIEWED | Test selection, hints, validation, mobile touch, accessibility |
| P-07 | Grade-appropriate lesson questions and instructions | APPROVED / corrections requested | Review all demo levels, especially math language and action clarity |
| P-08 | Reusable animations and module intelligence catalog | APPROVED / existence of complete catalog VERIFY | Inventory actual components, location, props, constraints, Learn/Tutor/Practice reuse, tests |
| P-09 | Compact feedback and explanation layout | APPROVED / visual issues observed | No excessive horizontal margins, nested panels, or hidden continuation buttons |
| P-10 | Calendar, study plan, reminders and alerts | APPROVED AS PRODUCT DIRECTION; not verified implemented | Unified calendar of schoolwork, review, tests and student-chosen study blocks |
| P-11 | Teacher-defined upcoming tests and practice coverage | APPROVED AS PRODUCT DIRECTION; not verified implemented | Support teacher-assigned syllabus and test dates, not only AI-inferred topics |
| P-12 | Test-date discovery | PLANNED | Student/parent/teacher entry; optional document/photo parsing with confirmation; never invent dates |
| P-13 | Adaptive test preparation | PLANNED | Backward plan from exam date, syllabus mapping, diagnostic checks, revision and reminders |
| P-14 | Personalized next-best-action, prerequisite remediation, spaced review | Canonical architecture; historical phases reported accepted | Verify current target implementation and cross-area evidence |
| P-15 | Parent progress, family switching, language/account settings | Existing parent foundation + planned enhancement | Parent-child isolation, understandable reports, child switch, logout, language |
| P-16 | Structured curriculum lessons with teacher review, titles, levels, subject/grade filters | Draft work reported in guided-practice stream | Verify published vs draft, no accidental overwrite, full CM2 coverage |
| P-17 | App-wide production hardening and launch readiness | PLANNED / ongoing | CI, security, RLS, devices, analytics, deployment, rollback |

### Calendar and test preparation — intended differentiator
Do not reduce the calendar to a passive schedule. Proposed experience:
- **What is coming?** Test/homework dates entered by student, parent or teacher, or extracted from an uploaded note/photo after explicit confirmation.
- **What will be tested?** Teacher-defined chapters, objectives, sample exercises and marking expectations take precedence over generic guesses; link them to the French curriculum.
- **What should I study today?** Short personalized sessions chosen from time available, readiness, prerequisite gaps, and spacing.
- **What if I fall behind?** Re-plan without punitive notifications, and explain trade-offs.
- **Am I ready?** Evidence-based readiness by test objective, practice questions and error history, with uncertainty shown.
- **Parents/teachers:** Appropriate visibility and permissions; do not expose other children's records or allow untrusted data to overwrite grades.

These are product intentions, **not claims of working calendar features**.

## 5. EXPLANATION V2 / INTERACTIVE MATHEMATICS — DEMO OBSERVATIONS

The following states were seen or discussed in screenshots in project conversations. **Their exact code locations, latest commits and preview URLs still require verification.**

| Demo | Evidence from review | Product decision / outstanding QA |
|---|---|---|
| CM2 fraction addition 3/4 + 1/2 | Bar model and numerical prompt displayed; initial question unclear | Explain each visual part and explicitly ask what to select/count; validate 5/4 accurately |
| CM2 build 3/4 | Four tappable fraction-bar segments shown | Allow choosing three of four, count live, verify, reset, hints, tactile feedback |
| 4e affine function / graph manipulation | Graph with draggable control points and target y=2x+1; user found instructions confusing | First teach axes, slope and intercept; stage one action at a time; correct curriculum-level labeling |
| 5e equation 3x+5=20 | Three modes shown: Comprendre / Résoudre ensemble / M'entraîner seul | Reduce screen crowding; keep one clear focus at a time |
| Equation animation subtract 5 on both sides | Animated terms/cancellation, compact explanation and "Pourquoi cette étape ?" | Keep short always-visible action description; expanded why optional; avoid ambiguous crossed-out terms |
| TwoCards fraction enclosure 7/3 | Incorrect/ungraded feedback reported in V1 | End-to-end exact validator and displayed result need real-component acceptance |
| Mobile explanation cards | Excessive side margins, stacked nested panels, bottom composer/navigation overlap | Remove unnecessary wrappers and ensure completion/continue reachable on small screens |
| Demo publication | A shared route returned 404; later local lab screenshots available | Verify URL and branch deployment before sharing; Vercel preview pending if quota blocked |

### Math animation design contract
1. State the problem and objective in one short sentence.
2. Show one transformation at a time, with visible before/after or animated transition.
3. Put the operation label on screen (e.g. "On soustrait 5 des deux côtés") BEFORE or during motion.
4. Explain the immediate mathematical consequence in one line.
5. Offer "Pourquoi ?" for deeper conceptual reasoning, not as the only explanation.
6. Allow replay, previous/next, pause, reduced motion and non-animation equivalent.
7. Include an active student check or manipulation where pedagogically useful.
8. Use exact arithmetic/symbolic validation; never animate a false equality.
9. End with explicit answer, verification, understanding check and handoff to targeted practice.
10. Adapt vocabulary and visual density to grade; no childlike UI for high school.

### Reusable module catalog (to be reconciled with code)
Proposed entries: FractionModel/FractionBar, NumberLine, ObjectCounter, ArrayBuilder, PlaceValueBlocks, BalanceScale, GeometryCanvas, draggable CartesianGraph, AlgebraTiles, EquationStepAnimator, MathStepExplanation, VideoLessonBlock, MultipleChoiceChallenge, interactive feedback, HintStack, Tutor-to-Practice handoff.

For EACH actual module, record:
- exact file path, export name, source branch, commit SHA;
- status (prototype / production), age/subject, required props/data contract;
- interactions and animation semantics;
- supported contexts: Learn / Tutor / Practice;
- accessibility and reduced-motion behavior;
- test fixtures and example route;
- known defects and limitations.

Do not label a proposed module "implemented" until located in the repository and tested. The user specifically requested an **intelligence/knowledge-base file** for all animations and modules; create or reconcile docs/STUWY_INTERACTIVE_MODULE_CATALOG.md after repository inspection.

## 6. EXISTING CANONICAL ARCHITECTURE / HISTORICAL PHASES

The canonical architecture file describes a 17-phase roadmap: audit; age configuration; learning types; LearningSessionPlayer; mastery; shared learning events; prerequisites; Tutor integration; Home; Skills Lab; math practice; manipulatives; cross-subject activities; spaced review; structured AI generation; personalization; parent progress; production hardening.

**Historical handover dated 2026-11-01** reports phases 0–15 largely accepted or verified in a historical "learning" stream, with Phase 15.1 Tutor hero/mobile acceptance outstanding, Phase 16 parent progress and Phase 17 hardening not yet accepted. That handover is NOT a statement about the latest Explanation V2 branch or release.

Known existing foundations to inspect/reuse:
- Tutor ChatInterface, MessageInput, AttachmentMenu, CameraCapture, ImageCropDialog, useChat.
- KidExplanationFlow, TwoCards, CompactMathStepper, lesson/practice components, LessonV2Player.
- Curriculum topics/objectives/prerequisites, student mastery, learning events, age config, XP/streak.
- Guardian/parent portal with family authorization and child switching.
- Supabase staging referenced in prior work; confirm exact project/environment before changes.

## 7. OPEN ISSUES / BLOCKERS

| ID | Severity | Issue | Required evidence to close |
|---|---|---|---|
| B-01 | Closed for this preview | The specified /demo.html route opened and ran in the interactive browser at the audited head | Recheck if the deployment or alias changes |
| B-02 | High | Vercel preview may be limited by deployment quota | Query deployment status/limit; retry when allowed; do not invent reset time |
| B-03 | High | Mobile explanation bottom action can be obscured by composer/nav | 320/375/390/447px and desktop screenshots + clickable continuation |
| B-04 | High | Excessive margins/nested feedback cards | Side-by-side before/after mobile QA; maintain readability |
| B-05 | High | V1 TwoCards "Réponse non évaluée" for 7/3 enclosure | Full input -> classifier -> TwoCards -> grading integration test and UI confirmation |
| B-06 | Medium | Affine-function activity now labelled 3e and uses French notation; exact grade fit and wording still need teacher review | Teacher review and user test |
| B-07 | Medium | Animation operation not self-explanatory without opening "why" | Short inline action sentence visible during each transition |
| B-08 | High | Branch consolidation risk, especially Universal Tutor exclusion | Exact merge/diff report before any integration |
| B-09 | Medium | Current interactive module inventory not verified | Repo file-path/props audit and catalog |
| B-10 | Medium | Current production vs staging vs local demo divergence | Environment/branch/commit matrix |
| B-11 | Medium | Video sourcing, licensing, and player architecture not finalized | Video content policy, permissions, captions and fallback |
| B-12 | Medium | Calendar/teacher-defined test requirements not specified as data contracts | PRD, role permissions, calendar events and acceptance tests |

## 8. NEXT ACTIONS — ORDER OF EXECUTION

**A. Documentation and reality check (repository/CI/deployment metadata reconciled 2026-11-26; interactive preview outstanding).** Inspect GitHub Explanation V2 and integration branches, identify latest commits, exact routes, previews, existing module catalog and tests. Populate a current-state evidence table in this ledger. Do not edit application code during the audit.

**B. Restore a single working review surface.** Verify or publish an authorized non-production Vercel preview for Explanation V2; provide ONE working URL with a clear demo menu and a version/commit label. If Vercel is blocked, use a local/Work preview and report the limitation.

**C. Polish existing math animations BEFORE redesigning lesson structure.** Make animation instructions explicit, fix grade clarity, compact UI, mobile actions and the graph experience; test fraction selection, fraction addition and equation steps.

**D. Build the animation/module intelligence catalog.** Inventory real components, code paths, interactions and reuse eligibility across Tutor, Learn and Practice.

**E. Validate math pedagogy.** Teacher-style rubric: correct mathematical steps, age vocabulary, visual representation, meaningful interaction, error recovery, accessibility and completion. Compare patterns observed from Brilliant and Photomath without copying proprietary code/assets.

**F. Then design lesson structure and integration.** Align with canonical LearningSessionPlayer, teacher-reviewed draft/publish process, video block, Tutor handoffs and learning evidence.

**G. Plan calendar and exam-prep V2.** Write PRD and UX flows including teacher-defined test content, confirmed dates, reminders and readiness, then obtain approval before implementation.

**H. Separate production launch and branch consolidation.** Keep V1 fixes isolated; propose merge plan with excluded Universal Tutor branch; regression-test before deployment.

**Current execution state as of 2026-11-26:** Tasks A/B and the B.3 browser review are recorded in LEDGER-001–006. Task C is **PARTIAL PASS** on the feature branch at code commit `74a1d9cfa8c23b13a7fa8ac69d51355470786975`, PR #56 remains open/draft. Equation mode state, 3e affine vocabulary/notation, and tile grammar are implemented; 464/464 unit tests, TypeScript and production build pass. Exact responsive/browser acceptance at 320/375/390/447/1280px is **NOT RUN** because Chromium is unavailable (Playwright browser download returned 403; installed Chromium wrapper points to a missing binary). Full-repository ESLint remains failing; see LEDGER-007. B-03/B-04 remain open pending browser screenshots/continuation checks. D–H pending.

## 9. REQUIRED WORK LOG FORMAT — APPEND AFTER EACH TASK

### YYYY-MM-DD HH:MM — [Task ID] Short title
- **Workstream / branch / SHA:**
- **Status before -> after:**
- **Decision / user approval:**
- **Files changed:**
- **What was implemented vs only planned:**
- **Tests:** commands, pass/fail, scope
- **Visual QA:** actual tested URL/device/viewport; screenshot path if applicable
- **Deployment:** staging/production/none; exact environment
- **Open issues / blockers:**
- **Next action:**

**Update rules:** Preserve history; do not silently replace old claims. Mark contradictions and reconcile with commit evidence. Add dates and source of every status change. If a test is not run, write NOT RUN, not PASS. For any failed deployment, mark NOT DEPLOYED. Update both the relevant backlog row and this log.

### 2026-11-26 — LEDGER-001 Create cross-chat living ledger
- **Workstream:** documentation only.
- **Branch:** docs/stuwy-project-ledger.
- **Status:** initial consolidated planning and review history recorded.
- **Basis:** project conversation, user-provided canonical architecture and prior handover material; current repository implementation details NOT yet audited.
- **Application code / database / production:** no changes intended.
- **Next action:** verify latest GitHub branch heads, demo route, Vercel state and module inventory; update status with concrete evidence.


### 2026-11-26 — LEDGER-002 GitHub branch and interactive-module audit checkpoint
- **Workstream / branch:** documentation-only audit of `feature/stuwy-explain-v2`, `feature/explanation-v2-interactive-math`, `integration/stuwy-explain-v2`, `feature/guided-practice-lessons`; recorded on `docs/stuwy-project-ledger`.
- **Status before -> after:** NEXT / UNKNOWN -> IN PROGRESS (repository structure and PR evidence checked; no browser acceptance).
- **Decision / user approval:** Follow Memory.txt's instruction to continue from ledger, audit first, preserve branch and release safeguards.
- **GitHub evidence as checked 2026-11-26:** default `main` comparison base `5b5ea1de14c223b28f1838b105b6d82d0385cdf3`. GitHub compare reports feature/stuwy-explain-v2 diverged (60 ahead, 1 behind); feature/explanation-v2-interactive-math diverged (158 ahead, 408 behind); integration/stuwy-explain-v2 diverged (16 ahead, 1 behind); feature/guided-practice-lessons diverged (82 ahead, 5 behind). These figures are per comparison against current main, NOT a recommendation to merge. `feature/v2-universal-tutor` was behind main (0 ahead, 44 behind); leave excluded. `release/v1-stabilization` was behind main (0 ahead, 5 behind).
- **PR evidence:** [#56](https://github.com/UltraSaura/tutorly-navi/pull/56) WIP Explanation V2 interactive math open; [#54](https://github.com/UltraSaura/tutorly-navi/pull/54) development baseline/browser QA open; [#55](https://github.com/UltraSaura/tutorly-navi/pull/55) mental calculation quiz open. Open PR does not prove release.
- **Module catalog discovery:** `docs/TUTORLY_INTERACTIVE_INTELLIGENCE.md` already exists on `feature/explanation-v2-interactive-math`; it describes the new Explanation V2 activity kinds, `MathDemonstration`, equation solver/animation modules, reusable contracts, linked GitHub CI runs, and a standalone demo at `/demo.html`. It explicitly disclaims a complete inventory of old Tutorly modules. **Reconcile/extend that file; do not replace it with an unrelated catalog.**
- **Routes found in source:** `src/App.tsx` in interactive-math branch registers `/dev/explanation-v2-math` only on dev/approved preview hosts. The catalog describes a preview at https://stuwy-git-feature-explanation-v2-interactive-math-stuwy.vercel.app/demo.html ; this URL was documented in source but **NOT opened/validated in an interactive browser during this checkpoint**. Do not advertise it as verified working.
- **Code/tests:** file and comparison inspection only. Tests NOT RUN in this checkpoint. The catalog cites historical CI PASS runs, including #45722482002 and #45718920651; independently reconcile current head SHA to each CI run before treating these as current.
- **Visual QA:** NOT RUN; screenshot/device acceptance remains outstanding.
- **Files changed:** this ledger only; no app code, Supabase, Vercel deployment, protected branches or production modification.
- **Blockers:** full branch-head/PR SHA reconciliation, actual Vercel state and browser route check, current CI and exhaustive module mapping.
- **Next action:** complete A with exact branch head SHAs, PR/CI and Vercel-to-commit matrix; then B verify one browser-working non-production review surface before UX redesign or code modification.


### 2026-11-26 — LEDGER-003 Branch heads, CI and Vercel reconciliation
- **Status:** Task A repository/CI/deployment metadata checkpoint complete; interactive preview validation remains outstanding, Task B blocked on current preview and browser access. No code or release acceptance implied.
- **Exact branch heads:** main `5b5ea1de14c223b28f1838b105b6d82d0385cdf3`; feature/stuwy-explain-v2 `cec2b07a802844aacd789bd01e58d8316f73a1c4`; feature/explanation-v2-interactive-math `a92d3c797c3ce38361ea6e10d925e9e9ace2c97d`; integration/stuwy-explain-v2 `828413a32af273cb1f2dbc27711f7c86f0574a23`; feature/guided-practice-lessons `a57846c388c904fff15bc374a13afa06f0d9f6db`; release/v1-stabilization `d53af6c49d63fa8bffb9a939e3c5968267c21add`; feature/v2-universal-tutor `03698572729b756d9a90231ba45a4ca7ed574956` (excluded).
- **PR #56:** open draft, head matches interactive-math branch, base parent `55f30eccc725a832463373dc85f0ce78cb0b229f`. IM-D02.4 adds guided operation -> cancellation -> simplified result -> advance, always-visible instructions, targeted remediation, mode state preservation. PR reports 93/93 browser and 18/18 real-player checks in run #45725652079; job status independently confirmed successful. Latest head-associated run [#45725868750](https://github.com/UltraSaura/tutorly-navi/actions/runs/45725868750) independently confirmed success, both browser and unit-and-build jobs, including desktop/mobile interactions, standalone demo smoke, exact math/parser, TypeScript, focused lint and production build. No tests newly executed in this chat; counts are PR-reported, not independently counted from logs.
- **Vercel:** branch alias resolves to READY deployment `dpl_92ojhCdfh5gvwiWX7UM7QRtJYjeP`, source `ac0c7c37ea740e8ab6a992dca0c7fbf98ccadc45`, target null (preview), older than current head. List of recent branch deployments confirms this is latest returned record. PR reports daily Hobby API deployment limit 402 for IM-D02.4; no redeployment attempted or reset time inferred in this chat. B-01/B-02 remain open. Preview candidate https://stuwy-git-feature-explanation-v2-interactive-math-stuwy.vercel.app/demo.html ; Vercel metadata verified but route interaction NOT RUN. Existing browser tab inspection failed because extension lacks host permission; no interactive browser controls available in Chat mode.
- **Files changed:** ledger only. No app code, branch merge, Supabase or Vercel writes.
- **Next:** Task B: establish current non-production preview at head or verified equivalent runtime commit; use authorized Work/Codex browser to test /demo.html at 375/447/1280px, capture evidence and version label. If deployment limit persists, use isolated local preview of exact head. Keep user acceptance separate from CI. Full cross-app module inventory remains Task D.


### 2026-11-26 — LEDGER-004 Task B preview deployment
- **Status:** Task B IN PROGRESS; authorized isolated preview request accepted by Vercel, latest observed state BUILDING.
- **Branch / SHA:** feature/explanation-v2-interactive-math / a92d3c797c3ce38361ea6e10d925e9e9ace2c97d.
- **Deployment:** dpl_2df5cLdJssKvScv8dH1W5gMbSDJ6, https://stuwy-6dy8t334d-stuwy.vercel.app/demo.html (candidate; browser NOT RUN). Target null (non-production preview). Previous quota restriction did not prevent this request. Do not claim READY until confirmed; do not claim interactive acceptance without browser QA.
- **Decision:** deploy exact CI-verified branch head without forced rebuild, project-settings change or production promotion; no application source, database or branch merge changes.
- **Next:** inspect deployment and verify branch alias/source SHA; interactively test /demo.html at 375/447/1280px, record actual screenshots and outcomes. If browser access unavailable, hand off to Work/Codex.


### 2026-11-26 — LEDGER-005 Latest preview READY and route verified
- **Status:** Task B deployment and HTTP route verification PASS; interactive live browser acceptance NOT RUN, remains open.
- **Branch / SHA:** feature/explanation-v2-interactive-math / a92d3c797c3ce38361ea6e10d925e9e9ace2c97d, exact match with audited GitHub head.
- **Deployment:** dpl_2df5cLdJssKvScv8dH1W5gMbSDJ6 READY, target null, no alias error. Exact preview https://stuwy-6dy8t334d-stuwy.vercel.app/demo.html . Authenticated Vercel fetch returned HTTP 200, expected French demo HTML, React root, built demo JS and CSS asset references, noindex. Fetch uses Vercel temporary share-link mechanism; no share token recorded or distributed. This verifies HTTP delivery, not JS runtime or pedagogical acceptance.
- **Tests:** existing head CI PASS as recorded in LEDGER-003; no new interactive browser tests or screenshots. Chat browser only reads open tabs and prior host permission failure remains; use Work/Codex for live visual acceptance.
- **Files changed:** ledger only. No app code, database, production promotion, or branch merges.
- **Next:** targeted live preview validation of guided equation operation/cancellation, mode switching, fraction selection/addition, graph manipulation, hints and completion at 375/447/1280px, then Task C based on observed defects.

## 10. CONTINUOUS UPDATE OPERATING PROCEDURE

### In every ChatGPT Work / Codex session
1. At session start, read this ledger and check live code state.
2. Before implementation, log proposed task ID, scope, branch, acceptance and exclusions.
3. During work, capture exact commits, tests and screenshots/URLs. For lengthy tasks, checkpoint after each independently verifiable milestone.
4. At completion, update backlog, blockers, next actions, and append a dated log.
5. Commit only the ledger file to docs/stuwy-project-ledger (or prepare a documentation-only PR if GitHub write permission is absent).
6. Send the user the permanent ledger URL, working demo URL if any, and a short status summary.

**Important limitation:** ChatGPT cannot silently edit GitHub after a chat ends or guarantee updates from other independent Codex/Work sessions. Each agent must be explicitly instructed to update this ledger, or a separately authorized scheduled automation must be configured. Never claim that an update happened unless GitHub confirms the commit.

### Standard update instruction to paste into any implementation agent
"Before starting, read the latest docs/STUWY_PROJECT_LEDGER.md from branch docs/stuwy-project-ledger in UltraSaura/tutorly-navi. Work only on the explicitly approved target branch. Before stopping, update that ledger with the exact feature status, code SHA, tests, preview URL, decisions, blockers and next task; preserve prior entries and commit the documentation-only update to docs/stuwy-project-ledger. Do not touch production, Supabase, or the excluded Universal Tutor branch without approval. If the ledger update fails, report it and supply the complete proposed update."

## 11. SOURCE MATERIAL AND CONFLICT RESOLUTION

1. **Canonical architecture:** user-supplied "Tutorly — Final Product & Adaptive Learning Architecture" (canonical product and implementation roadmap). This ledger tracks execution; it does not replace architecture.
2. **Current GitHub source and commits:** authoritative for what code exists, not for user acceptance.
3. **Current working preview and user visual review:** authoritative for observable UX, not for backend persistence.
4. **V1 stabilization reports and screenshots:** authoritative for the issues observed in that environment, not necessarily V2.
5. **Product conversation decisions:** authoritative for approved goals and constraints; status must be rechecked against code.
6. **Unverified historic assistant statements:** background only until corroborated.

If two sources disagree: record both, identify dates/branches, preserve functioning production behavior, request approval for a product-direction change, and do not silently merge conflicting architectures.


### 2026-11-26 — LEDGER-006 Task B.3 interactive preview acceptance
- **Workstream / branch / SHA:** Explanation V2 interactive mathematics / `feature/explanation-v2-interactive-math` / `a92d3c797c3ce38361ea6e10d925e9e9ace2c97d`.
- **Status before -> after:** preview HTTP-ready, interactive acceptance NOT RUN -> functional browser review PASS for the activities below; exact requested viewport acceptance PARTIAL / NOT RUN.
- **Preview:** https://stuwy-6dy8t334d-stuwy.vercel.app/demo.html opened and rendered. UI identifies this as a simulated local lab with no Supabase access and no saved grades.
- **Functional checks:** PASS — CM2 fraction selection (3/4), fraction addition (3/4 + 1/2 = 5/4), coordinate placement to (2 ; 3) using arrow controls, algebra tiles for 2x + 3, linear-function construction y = 2x + 1 using controls and mode switching, simple equation 3x + 5 = 20 with wrong/correct answer and hint, complete two-sided equation walkthrough through 16 = 16, fractional solution walkthrough and independent grading of -5/2 with wrong answer and all three progressive hints, line fit adjusted to slope 1.7/intercept 1.4 with displayed squared error 0.3 and success feedback, and complete CM2 path through its 5/5 conclusion. Exact arithmetic checked against the displayed transformations and expected results.
- **Incorrect-answer / hint coverage limits:** wrong answers and progressive hints were exercised in fraction addition, coordinate placement, tile construction, linear-function practice, simple equations, fractional-solution practice, and line fitting. Wrong-selection feedback/hints for standalone fraction selection and wrong-answer/hint behavior in standalone two-sided-equation practice were NOT RUN. The CM2 path used correct fraction selection and included an incorrect first answer in fraction addition.\n- **Animation check:** PASS for the equation demonstrations inspected. The operation and immediate consequence remain visible without opening “Pourquoi cette étape ?” (subtract 5, subtract 2x, subtract 3, divide by -2, substitute/check). Fraction-addition walkthrough also exposes the visual goal and explanation. Animation motion itself was reviewed through the live UI; no timing/accessibility or reduced-motion audit was performed.
- **Defect — Medium:** switching from completed “M’entraîner seul” to “Résoudre ensemble” leaves the independent-mode “Bravo ! x = 5” completion message, “Activité terminée” and “Réussi sans aide” status visible while the guided mode is at step 1/3 asking what operation to perform. This gives contradictory progress and feedback. **Correction:** scope completion/feedback to the active mode or reset it when switching modes; preserve only compatible progress. Screenshot captured in the browser review thread.
- **Potential curriculum issue — Medium / verify:** the affine-function activity is labelled 4e while explicitly teaching slope m and intercept b, then asks students to build y = 2x + 1. Confirm intended grade and French curriculum vocabulary/notation with a teacher before release; stage or relabel the activity to match the intended level.
- **Minor copy issue:** tile success text renders “2 tuile(s) x”; use correct French agreement (“2 tuiles x”).
- **Viewport / visual QA:** a responsive screenshot was captured at the available browser size (approximately 1365 × 1024). The requested exact 375px, 447px and 1280px widths were **NOT RUN**: the available browser controls did not expose viewport resizing. Mobile layout, drag-only graph/point interactions, touch target sizing, keyboard navigation, reduced-motion behavior, and small-screen continuation visibility remain unverified. Screenshots of the line-fit prompt and equation mode mismatch were captured inline in the browser review thread; no local screenshot artifacts were persisted.
- **PASS/FAIL/NOT RUN summary:** all 9 standalone activities and the full CM2 learning path were functionally exercised; core math and visible feedback PASS. Equation mode-switch progress consistency FAIL. Exact viewport acceptance NOT RUN. Production/LessonV2Player persistence NOT RUN because this route is explicitly a simulated local lab.
- **Files changed:** this ledger only. No application code, merge, Supabase, or production/deployment change was made.
- **Next action:** fix the equation mode-switch state leak and confirm the affine-function grade/notation; then rerun acceptance at 375px, 447px and 1280px, including actual drag/touch behavior and scroll-to-completion. Keep production acceptance separate from this demo.


### 2026-11-26 — LEDGER-007 STUWY C.01–C.05 interactive mathematics stabilization
- **Workstream / branch:** STUWY C.01–C.05 on `feature/explanation-v2-interactive-math`; starting code SHA `a92d3c797c3ce38361ea6e10d925e9e9ace2c97d`. Code commit pushed via connected GitHub integration: `74a1d9cfa8c23b13a7fa8ac69d51355470786975`. PR [#56](https://github.com/UltraSaura/tutorly-navi/pull/56) verified **open and draft**.
- **Status before → after:** B.3 PARTIAL PASS → **TASK C PARTIAL PASS — REMAINING DEFECTS**. Work is committed; browser acceptance and project-wide lint are incomplete.
- **C.01 equation mode state:** Demonstrated, guided, and solo feedback/completion are now mode-scoped. Guided solving remains available after solo validation; solo assessment evidence and assisted evidence are retained separately; the player records one completion per activity block. Regression coverage was added to the Playwright activity and player fixtures for mode transitions, completion preservation, progression gating, and duplicate completion callback counting.
- **C.02 curriculum/notation:** The affine-function demo now displays level 3e and uses “fonction affine”, “coefficient directeur a”, “ordonnée à l’origine b”, and (f(x)=ax+b) in the demo, graph labels, questions, hints, feedback, and tests. The official Édubase fiche identifies a Troisième affine-functions pathway; the exact age fit and terminology still require teacher review. [Official Édubase reference](https://edubase.eduscol.education.fr/fiche/22940).
- **C.03 grammar:** Algebra-tile success feedback and hints now use singular/plural forms (“1 tuile x”, “2 tuiles x”, “1 unité”, “3 unités”).
- **C.04 responsive/accessibility:** The Playwright suites now target 320, 375, 390, 447 and 1280 CSS pixels and include overflow, 44px button target, keyboard, touch, pointer drag, reduced-motion, feedback, continuation, all nine standalone activities, the complete CM2 path and actual LessonV2Player fixtures. **Browser suites NOT RUN; screenshots NOT CAPTURED.** Playwright Chromium download from the official browser CDN returned HTTP 403 in this environment. The system Chromium launcher also cannot start because `/usr/lib/chromium/chromium` is absent. Thus the 5 viewport layouts, pointer/touch behavior, screenshots and fixture flows remain unverified.
- **C.05 answer coverage:** Added browser cases for fraction-selection wrong answer/hints/retry/success and two-sided-equation independent wrong answer, hint, retry and success. The LessonV2Player fixture covers continuation gating and mode preservation. These browser cases are authored but **NOT RUN** due to the Chromium blocker.
- **Tests / validation:** Full Vitest `npm test -- --run`: **464/464 PASS (63 files)**. Focused explanation-v2 tests: **46/46 PASS (8 files)**. `npx tsc --noEmit`: PASS. `npm run build`: PASS. Focused ESLint on changed feature/test/QA files: **0 errors, 3 Fast Refresh warnings** (the existing `LessonV2Player.tsx:51` `any` was overridden for the focused lint command). Full `npm run lint`: **FAIL**, reporting 946 errors and 86 warnings across the repository; unrelated pre-existing errors remain unaddressed. Playwright: **NOT RUN**; no browser test count or screenshots are claimed.
- **Catalog:** `docs/TUTORLY_INTERACTIVE_INTELLIGENCE.md` updated for 3e terminology and the outstanding teacher review.
- **Scope / deployment:** No merge, production deployment, Supabase change, TwoCards/CompactMathStepper change, or Task D work.
- **Next action:** Run the authored Playwright suites using an available Chromium browser at the five required widths; inspect/save screenshots, fix any defects, verify actual player callbacks/evidence, and rerun focused browser QA. Teacher review remains required for exact 3e fit and wording.
