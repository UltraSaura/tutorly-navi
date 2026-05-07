# Practice Experience

## UX Philosophy

The `Practice` destination is the new training hub for students.

Core principles:
- **Start instantly**: one tap to begin an exercise.
- **Minimal cognitive load**: large cards, short labels, clear CTA.
- **Mobile-first**: vertical flow, compact sections, thumb-friendly controls.
- **One unified surface**: quiz, AI practice placeholders, official exams, and targeted drills in one place.
- **No internal data exposure**: learners never see parsing internals, raw metadata, or admin terminology.
- **Clean-academic tone**: calm panels, generous whitespace, readable line length.

## Naming (FR/EN)

- **French**: we use **“S’entraîner”** because it is direct, encouraging, and study-first (no jargon, no gamification).
- **English**: we keep **“Practice”** because it’s the most standard label for short, repeatable training sessions in learning apps.

## Product Inspiration

The design direction borrows from:
- **Khan Academy**: clear learning pathways and progress orientation
- **Brilliant**: focused one-problem-at-a-time interaction
- **Quizlet**: lightweight cards and low-friction repetition
- **Photomath**: hint/correction reveal on demand

### Why not Duolingo-like (for now)

Duolingo-like UI patterns (dense gamification, streak cues, “path” metaphors, high-saturation reward loops) can be great, but they are not the right default for this phase:
- the app is still building its core practice surface (exams + skills + future AI)
- we want a **study-first** feeling: calm, credible, low distraction
- we keep the UX simple so future AI features can land without reworking the entire visual language

## Current Architecture

### Routes
- ` /practice` → student practice hub
- ` /practice/session/:paperId` → immersive exam session (one exercise at a time)

### Main UI Blocks (hub)
- Continue Learning
- Practice by Skill
- Exam Practice
- AI Practice (placeholder actions)
- Quick Challenges

### Reusable Components
- `PracticeCard`
- `SkillCard`
- `ExamCard`
- `ExerciseViewer`
- `SessionProgress`
- `CorrectionReveal`
- `HintBox`

## Exam Integration

The student practice experience reuses imported annales data through existing exam hooks/services:
- `exam_papers` (cards and session entry points)
- `exam_exercises` (exercise-by-exercise session viewer)

Important UX constraint: the learner UI only surfaces student-friendly information:
- exam title/year/subject
- exercise statement
- optional hint and correction

It intentionally hides:
- `parsing_status`
- `raw_text` labels/internals
- source metadata internals
- technical import pipeline details

## Exam Session UX

The exam session is intentionally immersive and simple:
- one exercise at a time
- clear but discreet progress bar
- previous/next navigation
- hidden correction by default
- explicit `Show hint` and `Show correction` actions

This keeps challenge-first behavior while still supporting guided help.

### Focus session mode

The session supports a distraction-free mode via query param:
- ` /practice/session/:paperId?focus=1`

In focus mode:
- minimal header (no global navigation, no mobile bottom tabs)
- sticky bottom controls on mobile for hint/correction + prev/next
- calmer hint/correction panels to keep attention on the exercise

## Curriculum Integration Direction

`Practice by Skill` is currently a curated set of skill cards.
Next step is to map these cards to curriculum entities (topics/objectives/success criteria) and generate dynamic recommendations from student mastery data.

## AI Integration Roadmap

The hub is prepared for future AI actions via placeholder cards and consistent card API:
- Generate similar exercise
- Train weak skills
- Generate full mock exam

Next evolutions:
- enable “Generate similar exercises” from the current exercise context
- “Train weak skills” from mastery signals (curriculum mapping + student history)
- “Create mock exam” assembled from skills/objectives with pacing and difficulty rules

Future implementation should plug these actions into existing service boundaries without changing the student navigation model.

## Non-Goals (current phase)

Not implemented in this phase:
- advanced scoring model
- advanced persistence/session resume logic
- real AI generation
- automatic exam generation pipelines

This phase focuses on UX unification and extensible structure while preserving existing learning/quiz flows.
