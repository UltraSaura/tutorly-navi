# Tutorly — Final Product & Adaptive Learning Architecture

**Status:** Canonical product and implementation architecture  
**Project:** Tutorly / Stuwy / Tutorly-Navi  
**Repository:** https://github.com/UltraSaura/tutorly-navi

## 1. Final Product Vision

Tutorly is a French-curriculum-aligned adaptive learning platform that helps students:

- learn curriculum concepts;
- get guided help with real homework;
- practice and retain skills;
- identify and repair prerequisite gaps;
- become progressively more independent;
- give parents a clear view of progress.

Tutorly must not behave like an AI answer machine. Its job is to decide whether the student needs an explanation, guided lesson, hint, practice activity, interactive tool, remediation, or review, and adapt this to age, level, mastery, learning preferences, and recent difficulties.

## 2. Final Student Navigation

Tutorly should have five primary destinations:

```text
Home
Learn
Tutor
Practice
Me / Progress
```

| Area | Student intent |
|---|---|
| Home | What should I do now? |
| Learn | Teach me this subject/topic. |
| Tutor | Help me with this homework/question. |
| Practice | Help me strengthen and retain skills. |
| Me / Progress | Show me how I am progressing. |

Subjects are not top-level navigation items. They live under Learn and Practice.

## 3. Final Architecture

```text
                         TUTORLY
                            |
                            v
                           HOME
                   Personalized "Today"
                            |
          +-----------------+-----------------+
          |                 |                 |
          v                 v                 v
        LEARN              TUTOR            PRACTICE
     "Teach me"      "Help my homework"    "Train me"
          |                 |                 |
     Curriculum        Question/photo      Skills Labs
      lessons            /document          Challenges
          |                 |               Review
          +-----------------+-----------------+
                            |
                            v
                  SHARED LEARNING ENGINE
                            |
        +-------------------+--------------------+
        |                   |                    |
   Curriculum           Student Model        Content Engine
        |                   |                    |
 concepts/objectives    mastery              explanations
 prerequisites          error history        lessons
 grade/subject          learning style       exercises
                        age config           activities
                        review history       manipulatives
                            |
                            v
                    NEXT BEST ACTION
                            |
                 Advance / Practice / Remediate
```

## 4. One Shared Student Learning Model

Every meaningful interaction should teach Tutorly something about the learner.

Signals include:

- lesson attempts;
- homework attempts;
- tutor conversations;
- quiz answers;
- hints used;
- practice activities;
- incorrect answers;
- response time;
- independent solutions;
- repeated misconceptions;
- prerequisite failures;
- spaced-review performance.

Learn, Tutor and Practice must read from and write to the same mastery model.

## 5. Home — "What Should I Do Now?"

Home should lead with personalized next actions, not a passive subject catalog.

Suggested order:

1. Continue unfinished learning
2. Recommended for you
3. Daily challenge
4. Today's program
5. Explore subjects

Recommendation priority:

1. unfinished session;
2. blocking prerequisite;
3. weak current curriculum skill;
4. spaced review due;
5. homework follow-up;
6. current curriculum objective;
7. enrichment.

Subjects remain browsable, but Tutorly should usually know the best next action.

## 6. Learn — Structured Curriculum Learning

```text
Learn
  |
Subjects
  +-- Maths
  +-- Français
  +-- Sciences
  +-- Histoire
  +-- Géographie
  +-- Anglais
  +-- ...
       |
   Curriculum domains
       |
   Concepts/objectives
       |
   Learning session
```

Each subject home can expose:

- Continue
- Recommended
- My curriculum
- Practice
- Progress

Math Skills Lab therefore belongs inside Mathematics as its practice surface, but the underlying architecture must be cross-subject.

## 7. Tutor — Homework and Question Assistance

Tutor is a separate learning entry point with the intent:

> I have a specific problem and need help.

Keep the UI simple:

```text
Ask Tutorly

[ Take a photo ]
[ Upload homework ]
[ Type a question ]

Recent homework
```

Target flow:

```text
Homework submitted
      |
Extract / understand problem
      |
Detect subject
      |
Detect curriculum concept/objective
      |
Estimate difficulty
      |
Read mastery + prerequisites
      |
Choose tutoring strategy
      |
Student attempts
      |
Tutor evaluates attempt
      |
Hint / explanation / remediation
      |
Student solves
      |
Check understanding
      |
Update learning model
```

Tutor must guide instead of instantly revealing final answers.

### Tutor support levels

**Strong mastery:** Socratic prompts and light hints.  
**Developing mastery:** targeted hints, worked steps, visuals.  
**Weak mastery:** brief concept explanation.  
**Prerequisite gap:** pause the homework, remediate prerequisite, mini-check, then return to the homework.

## 8. Tutor ↔ Learn ↔ Practice Handoffs

This is a core feature.

Example:

```text
Homework: 864 ÷ 8
        |
Tutor detects weak ×8 facts
        |
"Your division method is good. Let's strengthen ×8 for 3 minutes."
        |
Practice → Times Tables Sprint
        |
Mastery update
        |
Return to Tutor
        |
Resume 864 ÷ 8
```

The same model works for French conjugation, science circuits, history cause/consequence, geography maps, etc.

The original Tutor context must be resumable after a handoff.

## 9. Practice — Cross-Subject Skills Lab

Practice is the retention and skill-strengthening mode.

```text
Practice
   |
   +-- Recommended for You
   +-- Daily Challenge
   +-- Spaced Review
   |
   +-- Subjects
       +-- Maths
       +-- Français
       +-- Sciences
       +-- Histoire
       +-- Géographie
       +-- Anglais
```

Math Skills Lab is the first implementation, not a separate architecture.

### Subject examples

**Maths:** multiplication, division, mental arithmetic, fractions, decimals, algebra, geometry, error analysis.  
**Français:** conjugation, spelling, grammar, vocabulary, sentence building.  
**English:** vocabulary, listening, sentence building, verbs, spelling.  
**Science:** classification, diagram labeling, prediction, experiments, circuits.  
**History:** timelines, chronology, cause/consequence, source reasoning.  
**Geography:** maps, capitals, regions, rivers, data interpretation.

## 10. Reusable Activity Engines

Do not create one codebase per game or subject.

Build reusable engines:

```text
FactSprint
MatchPairs
SortClassify
SequenceBuilder
TimelineBuilder
DiagramLabel
NumberLine
BuildManipulate
Simulation
ErrorDetective
SentenceBuilder
FlashRecall
MapInteraction
MultipleChoiceChallenge
MentalChain
MissingNumber
```

Example: `MatchPairs` can power multiplication facts, French conjugation, historical dates, science vocabulary and English vocabulary.

Suggested subject-neutral type:

```ts
interface SkillActivityDefinition {
  id: string;
  subjectId: string;
  conceptId: string;
  objectiveId?: string;

  engine:
    | "fact_sprint"
    | "match_pairs"
    | "sort_classify"
    | "sequence"
    | "timeline"
    | "diagram_label"
    | "number_line"
    | "build"
    | "simulation"
    | "error_detective"
    | "sentence_builder"
    | "mental_chain"
    | "missing_number";

  ageBand: PedagogicalAgeBand;
  masteryLevels: Array<1 | 2 | 3 | 4>;
  difficulty: number;
  estimatedMinutes?: number;
  configuration: Record<string, unknown>;
}
```

## 11. Central Age Adaptation

Replace coarse age branching with four pedagogical bands while preserving existing compatibility.

### Early Primary — CP / CE1 — approx. 6–8
- very short instructions;
- big visuals;
- objects;
- tap/drag/build;
- minimal abstraction;
- high scaffolding;
- no stressful timers.

Practice label can be **Jeux**.

### Upper Primary — CE2 / CM1 / CM2 — approx. 8–11
- visual + symbolic;
- guided examples;
- manipulatives;
- progressively reduced hints.

Practice label can be **Défis**.

### Middle School — 6e / 5e / 4e / 3e — approx. 11–15
- method + symbolic reasoning;
- fewer playful elements;
- strategy explanations;
- error analysis.

Practice label can be **Entraînement**.

### High School — 2nde / 1re / Terminale — approx. 15–18
- concise notation;
- reasoning;
- transfer;
- selective visual support;
- non-childish UI.

Practice label can be **Skills / Practice**.

Suggested API:

```ts
getAgeLearningConfig(studentLevel)
```

## 12. Unified LearningUnit Model

```ts
type LearningUnitType =
  | "explanation"
  | "lesson"
  | "exercise"
  | "manipulative"
  | "skill_activity"
  | "remediation";
```

Common base:

```ts
interface BaseLearningUnit {
  id: string;
  type: LearningUnitType;
  subjectId: string;
  conceptId: string;
  objectiveId?: string;
  masteryLevel: 1 | 2 | 3 | 4;
  ageBand?: PedagogicalAgeBand;
  difficultyScore?: number;
  prerequisiteConceptIds?: string[];
}
```

Use discriminated unions for unit-specific content.

## 13. LearningSessionPlayer

Create one orchestration layer that reuses current explanation/practice UI.

Suggested structure:

```text
src/features/learning-session/
  LearningSessionPlayer.tsx
  LearningUnitRenderer.tsx

  renderers/
    ExplanationUnitRenderer.tsx
    LessonUnitRenderer.tsx
    ExerciseUnitRenderer.tsx
    ManipulativeUnitRenderer.tsx
    SkillActivityUnitRenderer.tsx
    RemediationUnitRenderer.tsx
```

Do not rebuild working components such as KidExplanationFlow, TwoCards, existing question components, feedback, or mini-practice.

## 14. Four Mastery Levels

1. **Understand** — mental model, explanation, visual, simple check.
2. **Guided Application** — worked example, guided problem, hints.
3. **Independent Application** — normal exercises, mixed practice, reduced hints.
4. **Transfer** — word problems, error analysis, unfamiliar situations, reasoning.

Maintain conceptually:

```text
best_score
current_mastery_score
mastery_level
```

Current adaptive mastery must be allowed to decrease when later evidence shows forgetting. Historical best remains separate.

## 15. Continuous Micro-Assessment

Normalize meaningful responses:

```ts
interface LearningAttemptResult {
  studentId: string;
  subjectId: string;
  conceptId: string;
  objectiveId?: string;
  masteryLevel: 1 | 2 | 3 | 4;
  correct: boolean;
  attemptNumber: number;
  hintsUsed: number;
  responseTimeMs?: number;
  difficultyScore?: number;
  source: "learn" | "tutor" | "practice";
}
```

Reuse existing interaction analytics where possible.

Initial mastery v1 should be deterministic and explainable.

## 16. Prerequisite Remediation

```text
Student struggles
      |
Repeated evidence
      |
Check prerequisite graph
      |
Prerequisite weak?
      |
Insert remediation unit
      |
Mini check
      |
Return to original task
```

This must work in Learn, Tutor and Practice.

Prevent loops with maximum depth, recent-remediation history and cooldown rules.

## 17. Reusable Manipulatives

Prioritize reusable interaction components over hundreds of custom animations.

Initial mathematics tools:

1. ObjectCounter
2. NumberLine
3. ArrayBuilder
4. FractionModel
5. PlaceValueBlocks
6. BalanceScale
7. GeometryCanvas

Later cross-subject tools:

- MapCanvas
- Timeline
- CircuitBuilder
- DiagramLabeler
- Process/SequenceBuilder

Use registries, lazy loading and reduced-motion support.

## 18. Math Skills Lab MVP

First games:

1. Times Tables Sprint
2. Division Fact Sprint
3. Mental Math Rush
4. Number Bonds
5. Number Line Challenge
6. Fraction Match

Do not build dozens before validating the shared engine.

### Multiplication fact mastery

Track facts independently, e.g.:

```text
mul:7x6
mul:7x7
mul:7x8
```

A session can sample:

```text
60% weak facts
25% developing facts
15% mastered review
```

Division reuses fact-family relationships.

### Mental math

Teach strategies, not just speed:

- make ten;
- doubles / near doubles;
- compensation;
- split tens and units;
- ×10 / ÷10;
- distributive multiplication;
- halve/double;
- estimation.

Suggested scoring philosophy:

```text
accuracy > independence > consistency > speed
```

Possible default:

```text
Accuracy       60%
Independence   20%
Consistency    10%
Fluency        10%
```

Reduce speed pressure for younger students.

## 19. Spaced Review

Practice should become Tutorly's long-term retention engine.

Initial intervals can start with:

```text
1 day
3 days
7 days
14 days
30 days
```

Later adapt them according to performance.

Conceptually:

```text
Learn → acquire
Tutor → apply to real homework
Practice → retain
```

## 20. AI Responsibilities

Use deterministic code whenever possible.

Deterministic generators are preferred for:

- multiplication/division;
- arithmetic;
- fraction equivalence;
- number-line tasks;
- many conjugation drills;
- deterministic classifications and matching.

Use AI for:

- understanding uploaded homework;
- concept/objective mapping when rules cannot resolve it;
- explaining misconceptions;
- age-appropriate explanations;
- context-sensitive hints;
- remediation;
- personalized coaching;
- contextual/open-ended problems;
- science/history reasoning;
- recommendation summaries.

Structured AI output must be schema-validated and cached when reusable.

## 21. Personalized Recommendation Engine

Create one service such as:

```ts
getNextBestActions(studentId)
```

It should consider:

- unfinished sessions;
- weak prerequisites;
- current curriculum;
- mastery;
- spaced review;
- Tutor/homework history;
- age band;
- learning style.

Example output:

```ts
interface RecommendedAction {
  source: "learn" | "tutor" | "practice";
  subjectId: string;
  conceptId: string;

  reason:
    | "continue"
    | "prerequisite"
    | "weak_skill"
    | "spaced_review"
    | "homework_followup"
    | "curriculum"
    | "enrichment";

  estimatedMinutes: number;
  priority: number;
}
```

Home consumes this service.

## 22. Parent Experience

Parents should see understandable progress, not raw engine values.

Example:

```text
Fractions
Understands visual fractions
Needs guided practice with equivalent fractions

Multiplication
Independent with ×2, ×5 and ×10
Needs reinforcement with ×7 and ×8

Science
Understands circuit components
Needs more practice predicting circuit behavior
```

Useful states:

- Understanding
- Guided practice
- Independent
- Transfer
- Needs prerequisite support

## 23. Existing-App Integration Rule

Before Codex creates a component, service, event type or database table, it must determine whether Tutorly already has something serving that responsibility.

Always prefer:

```text
existing feature
    |
adapter / extension
    |
new architecture
```

over:

```text
duplicate new subsystem
```

Existing foundations to inspect/reuse include:

- Tutor chat;
- homework/question submission;
- image/camera support;
- curriculum/program pages;
- practice pages;
- progressive hints;
- explanation flows;
- KidExplanationFlow;
- ObjectCounter;
- learning interaction analytics;
- objective mastery;
- learning-style adaptation;
- grade/age mapping;
- XP/streak;
- parent reporting.

## 24. Implementation Rules for Codex

For every phase:

1. inspect current implementation;
2. classify `EXISTING / PARTIAL / MISSING / CONFLICTING`;
3. reuse before building;
4. implement only missing pieces;
5. preserve backward compatibility;
6. use non-destructive migrations;
7. respect RLS;
8. keep mobile-first;
9. test;
10. report and STOP.

Required checks where available:

- typecheck;
- lint;
- unit tests;
- integration tests;
- production build.

End each phase with:

```text
STATUS
WHAT ALREADY EXISTED
WHAT WAS REUSED
WHAT WAS IMPLEMENTED
FILES CREATED
FILES MODIFIED
DATABASE CHANGES
TEST RESULTS
MANUAL TEST SCENARIOS
KNOWN ISSUES
NEXT STAGE
```

Never start the next phase automatically.

# 25. Final Implementation Roadmap

## PHASE 0 — Architecture Audit

Audit:

- App routes/navigation;
- Home/dashboard;
- Learn/program pages;
- Tutor/chat;
- homework upload/image/camera flow;
- Practice pages;
- explanation architecture;
- KidExplanationFlow;
- ObjectCounter;
- TrainingSessionPage;
- quizzes/mini-practice;
- curriculum types/tables;
- grade-to-age mapping;
- mastery;
- learning interaction events;
- adaptive teaching;
- XP/streak;
- parent progress;
- AI generation/prompts;
- feature flags;
- Supabase migrations and RLS.

Produce exact maps and gaps. No large implementation.

STOP.

## PHASE 1 — Central Age Configuration

Create `src/config/ageConfig.ts`.

Reuse existing grade mapping.

Preserve current under-11 behavior while introducing four richer pedagogical bands.

Add tests.

STOP.

## PHASE 2 — Unified Types

Create:

- `LearningUnit`
- `SkillActivityDefinition`
- `LearningAttemptResult`
- `RecommendedAction`

Build adapters around current explanations/practice structures.

STOP.

## PHASE 3 — LearningSessionPlayer

Create thin orchestration.

Reuse existing explanation/practice UI.

Support:

- explanation;
- lesson;
- exercise;
- manipulative;
- skill activity;
- remediation.

STOP.

## PHASE 4 — Mastery v2

Audit current mastery semantics.

Introduce current mastery separately from historical best.

Map to mastery levels 1–4.

Preserve existing dashboards.

STOP.

## PHASE 5 — Shared Learning Events

Normalize evidence from Learn, Tutor and Practice.

Reuse existing interaction events.

Update mastery after meaningful interactions.

STOP.

## PHASE 6 — Prerequisite Graph & Remediation

Audit existing curriculum relationships first.

Implement:

```text
failure
→ prerequisite check
→ remediation
→ mini-check
→ resume original task
```

Prevent loops.

STOP.

## PHASE 7 — Tutor Integration

Do NOT rebuild Tutor chat.

Extend existing Tutor flow:

```text
submitted homework
→ extraction
→ subject detection
→ concept/objective mapping
→ mastery lookup
→ tutoring strategy
→ student attempt
→ learning evidence
```

Tutor must be able to request an explanation, manipulative, remediation or practice activity.

Add resumable Tutor context for handoffs.

STOP.

## PHASE 8 — Home / Next Best Action

Create `getNextBestActions(studentId)`.

Update Home to prioritize:

- Continue;
- For You;
- Daily Challenge;
- Program;
- Explore.

STOP.

## PHASE 9 — Cross-Subject Practice Foundation

Create generic Skills Lab architecture, preferably under:

```text
src/features/skills-lab/
```

Suggested components:

```text
SkillsLabPage.tsx
SubjectSkillsPage.tsx
SkillActivityCard.tsx
RecommendedSkills.tsx
DailyChallenge.tsx

engine/
  SkillActivitySession.tsx
  useSkillActivitySession.ts
  skillActivityRegistry.ts
  difficultyAdapter.ts
  scoring.ts
```

Adapt existing Practice infrastructure rather than replacing it blindly.

STOP.

## PHASE 10 — Math Skills Lab MVP

Implement:

1. Times Tables Sprint
2. Division Fact Sprint
3. Mental Math Rush
4. Number Bonds
5. Number Line Challenge
6. Fraction Match

Connect mastery, analytics, XP and age adaptation.

STOP.

## PHASE 11 — Reusable Manipulatives

Implement/reuse:

- ObjectCounter
- NumberLine
- ArrayBuilder
- FractionModel
- PlaceValueBlocks
- BalanceScale
- GeometryCanvas

Make them usable from Learn, Tutor and Practice.

STOP.

## PHASE 12 — Cross-Subject Practice Activities

Add reusable engines progressively:

- MatchPairs
- SortClassify
- TimelineBuilder
- DiagramLabel
- SequenceBuilder
- SentenceBuilder
- ErrorDetective
- MapInteraction
- Simulation shell

Apply them to French, English, Science, History and Geography.

STOP.

## PHASE 13 — Spaced Review

Add review scheduling and due-review recommendations.

Home and Practice surface due reviews.

STOP.

## PHASE 14 — Structured AI Generation

Create structured generation service such as `generateLearningUnit()`.

Use separate templates for:

- explanations;
- lessons;
- exercises;
- remediation;
- open-ended reasoning.

Inputs must include subject, French curriculum, grade, age band, concept, objective, mastery, learning style, language, difficulty and pedagogical constraints.

Validate output and cache reusable content.

STOP.

## PHASE 15 — Personalization Engine

Keep responsibilities separate:

```text
AGE → presentation
LEARNING STYLE → preferred representation
MASTERY → difficulty/scaffolding
ERROR HISTORY → remediation
CURRICULUM → what should be learned
REVIEW HISTORY → what should return
```

Do not permanently lock students into one style.

STOP.

## PHASE 16 — Parent Progress

Unify Learn, Tutor and Practice progress.

Surface strengths, developing concepts, prerequisite gaps, retention and helpful parent actions.

STOP.

## PHASE 17 — Production Hardening

Verify:

- session resume;
- Tutor handoff/resume;
- duplicate attempts;
- mobile performance;
- animation performance;
- AI cost;
- query counts;
- RLS;
- uploaded-homework security;
- accessibility;
- reduced motion;
- analytics;
- XP exploits;
- feature flags.

STOP.

# 26. Final Navigation Target

```text
Home
Learn
Tutor
Practice
Me
```

Do not clutter bottom navigation with subjects.

# 27. Acceptance Scenario — Maths Homework

Student: CM1  
Homework: `864 ÷ 8`

Expected:

1. student photographs homework;
2. Tutor extracts the problem;
3. Tutor maps it to division;
4. Tutor reads current mastery;
5. student attempts;
6. Tutor identifies repeated ×8 hesitation;
7. Tutor detects multiplication facts as the blocker;
8. Tutor offers a 3-minute ×8 practice;
9. Times Tables Sprint targets weak facts;
10. practice updates the same mastery model;
11. student returns to the original Tutor session;
12. student solves the division;
13. Tutor checks understanding;
14. Home schedules future review;
15. Parent sees meaningful progress.

# 28. Acceptance Scenario — French

```text
Tutor homework
→ detect French / futur simple
→ evaluate attempt
→ identify weak endings
→ mini explanation
→ 3-question conjugation activity
→ return to homework
→ mastery update
→ spaced review later
```

# 29. Acceptance Scenario — Science

```text
Tutor worksheet
→ identify circuit concept
→ detect misunderstanding
→ launch circuit/diagram activity
→ mini-check
→ return to worksheet
→ update mastery
```

# 30. Acceptance Scenario — History

```text
Question: Why did the French Revolution begin?
→ curriculum mapping
→ age-appropriate explanation
→ cause/consequence activity
→ student reasoning
→ feedback
→ history mastery evidence
```

# 31. First Codex Instruction — PHASE 0 ONLY

Paste this to Codex:

---

You are working inside the existing Tutorly-Navi repository.

The long-term target architecture is defined in:

`TUTORLY_FINAL_PRODUCT_AND_ADAPTIVE_ARCHITECTURE.md`

Do NOT implement the full architecture now.

Your task is ONLY:

## PHASE 0 — ARCHITECTURE AUDIT

Before changing architecture, inspect the current repository and its Supabase integration.

Audit at minimum:

1. routes/navigation;
2. Home/dashboard;
3. Learn/program pages;
4. Tutor/chat;
5. homework upload/image/camera workflow;
6. Practice pages;
7. explanations;
8. KidExplanationFlow;
9. ObjectCounter;
10. TrainingSessionPage;
11. quizzes/mini-practice;
12. curriculum domain/topic/objective types;
13. grade-to-age mapping;
14. mastery tables/services;
15. learning interaction events;
16. adaptiveTeaching;
17. XP/streak system;
18. parent progress;
19. AI prompt/generation services;
20. feature flags;
21. relevant Supabase migrations/RLS.

For each target-architecture responsibility classify:

```text
EXISTING
PARTIAL
MISSING
CONFLICTING
```

Then produce:

### A. Current architecture map
Show current routes and main data flows.

### B. Reusable components/services
List exact paths.

### C. Missing foundations
List only genuinely missing pieces.

### D. Duplication risks
Identify where naïve implementation would duplicate existing code.

### E. Database impact
Identify likely schema changes, but DO NOT perform migrations.

### F. Proposed integration file map
Classify files/components as:

```text
KEEP
EXTEND
ADAPT
DEPRECATE LATER
CREATE
```

### G. Risk assessment
Especially examine:

- Tutor behavior;
- mastery logic;
- curriculum mapping;
- mobile navigation;
- parent dashboards;
- Practice workflow.

### H. Recommended Phase 1 implementation
Confirm how centralized age configuration should be implemented without disrupting current behavior.

Do not begin Phase 1.
Do not perform broad refactors.

End with:

`PHASE 0 COMPLETE — READY FOR PHASE 1`

or:

`PHASE 0 PARTIAL — BLOCKERS: ...`

---

# 32. Change-Control Rule

This document is the architecture source of truth.

If code reality conflicts with it:

1. preserve working production behavior;
2. document the conflict;
3. choose the least destructive integration;
4. update this document when a deliberate architectural decision changes;
5. never silently create parallel systems.

# 33. Final Definition of Tutorly

> **Tutorly is a French-curriculum-aligned adaptive learning platform that teaches students through structured lessons, helps them work through real homework without replacing their thinking, strengthens and retains skills through personalized practice, repairs prerequisite gaps automatically, and gives parents a meaningful view of progress — all powered by one shared student learning model.**
