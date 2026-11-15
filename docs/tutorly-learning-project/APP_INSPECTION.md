# Tutorly app inspection snapshot

**Inspected ref:** `UltraSaura/tutorly-navi` branch `practice` (the parent ref used for `feature/guided-practice-lessons`).  
**Inspection type:** read-only inspection of repository source files via GitHub. This is a snapshot of the inspected code, not a guarantee that every route is reachable for every account or deployment.

## Stack and project commands

The repository README identifies the app as Stuwy and describes a Vite, TypeScript, React, shadcn/ui, and Tailwind CSS application. The inspected `package.json` includes:

- React 18, React Router 6, TanStack Query 5, Supabase JS 2, Framer Motion 12, i18next/react-i18next, Tailwind CSS, shadcn-style UI primitives, and Vitest 1.
- `npm run dev`: Vite development server.
- `npm run build`: `vite build`.
- `npm run lint`: `eslint .`.
- `npm run test`: `vitest`.
- There is no explicit `typecheck` script in the inspected package manifest.
- `postinstall` runs `copy:mathlive`, which copies MathLive assets from `node_modules`.

Before implementation, recheck the branch's current scripts and installation instructions; do not assume this snapshot is unchanged.

## App composition and routes

`src/App.tsx` uses React Router, lazy-loaded page components, React Query, Framer Motion, and shared providers including authentication, family profile, overlays, language, and error boundaries. User-facing pages are generally nested under `MainLayout`.

Observed routes:

- `/dashboard`: `UnifiedDashboard`.
- `/learning`: `LearningPage`; nested routes for a subject, subject/topic lesson, and lesson theme; `/learning/video/:videoId` opens the video player.
- `/practice`: `PracticePage`; child routes include `number-line`, `session`, `exam/:paperId`, `:subject/annales`, `:subject/topics`, and `:subject`.
- `/game` loads `GamePreview` only when `import.meta.env.DEV` is true.

The new guided lessons should be integrated into the existing Practice information architecture. Confirm current route and navigation patterns on the feature branch before selecting the final route.

## Practice surface and existing practice infrastructure

`src/pages/practice/PracticePage.tsx` builds a subject-selection page from learning-subject and practice-button data, current school level, exam papers, and training-item counts. The inspected page has a prominent number-line entry and subject cards, and uses the app's translation hooks. The layout is mobile-oriented (content width around 430–520 CSS px in the inspected source).

`src/pages/practice/TrainingSessionPage.tsx` uses existing hooks/services and guidance helpers, including:

- `useTrainingItems` and `saveTrainingItemAnswer`
- `evaluateTrainingAnswer`, `applyCheckFeedback`, `revealNextHint`, and question-state helpers from `src/lib/trainingGuidance`
- Existing answer controls for multiple choice and free response, plus the app's button, input, radio, badge, progress, card, and label components.

These are candidate patterns to reuse or learn from. They do not prove that an interactive lesson state-machine or Synthesis-style manipulative already exists; search the entire branch before creating new abstractions.

## Dashboard and progress

`src/components/user/UnifiedDashboard.tsx` contains three tabs: **roadmap**, **grades**, and **skills**. The roadmap tab renders `LearningRoadmap`; the other tabs render `GradeDashboard` and `SkillMastery`. It also renders `SubjectMasteryCard`.

The inspected overall-progress query:

1. Fetches active subjects.
2. Loads active learning categories and their topics.
3. Loads active videos for those topics.
4. Reads `user_learning_progress` entries with `progress_type = 'video_completed'`.
5. Counts a topic complete when all of that topic's videos are complete, then calculates a percentage.

This is evidence of video-based dashboard progress in this file. It does **not** establish that the existing schema records guided-lesson attempts, hints, or lesson mastery. Inspect the schema, services, and access policies before deciding how new interactive lesson progress should be persisted. Never infer mastery from opening or finishing one screen alone.

## Gamification preview

`src/pages/GamePreview.tsx` is mounted at the development-only `/game` route. It previews XP, a streak, coins, badges, and toast components. The inspected page initializes demo values and changes them locally; its XP reward amount is randomized. Treat this as a component preview, **not evidence of a production reward system or persisted student rewards**. Do not wire real lesson completion to demo values without locating the actual production reward and persistence logic.

## Integration guidance derived from this inspection

These are recommendations, not observed product requirements:

- Add guided lessons where students already go to Practice; use the Dashboard roadmap to surface a next activity only after the progress model is understood.
- Prefer existing translation, layout, UI primitives, and answer/guidance helpers where they fit.
- Keep the new experience comfortable at the current mobile-oriented Practice widths and also inspect desktop.
- Keep learner-facing copy concise and visible; narration is optional and tied to the same instructional step.
- Reuse the existing progress model only if it semantically supports the event being recorded. Distinguish an attempt, a completed activity, and demonstrated skill mastery.
- Keep reward preview components separate from real progress and rewards.
- Do not add a route or a second lesson engine before checking for existing lesson, exercise, curriculum, and content-authoring abstractions across the branch.

## Source files checked

- `README.md`
- `package.json`
- `src/App.tsx`
- `src/pages/practice/PracticePage.tsx`
- `src/pages/practice/TrainingSessionPage.tsx`
- `src/components/user/UnifiedDashboard.tsx`
- `src/pages/GamePreview.tsx`

This is not a complete repository audit. Codex Cloud should re-open these files and search for related curriculum, content, progress, interaction, and test code before implementing.
