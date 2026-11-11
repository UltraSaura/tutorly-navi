# Guided learning implementation plan

Last updated: 2026-11-11. Branch: `feature/guided-practice-lessons`.

## Task ledger

| ID | Phase | Status | Dependencies | Acceptance / verification | Commit |
| --- | --- | --- | --- | --- | --- |
| A1 | A — Reconnaissance | verified | none | Branch checked against `practice`; routes, Practice/Learn/Dashboard, age lookup, progress code/schema, scripts and project source docs inspected. Current test/build baseline recorded in `EVIDENCE.md`. | docs commits `9c42f69d`–`638da6f0` (cherry-picked source package) |
| A2 | A — Reconnaissance | verified | A1 | No Tutorly flashcard page/component found. Recording notes are present; original media is unavailable in this environment. | — |
| B1 | B — UX contract | verified | A1 | One instruction, one dot model, step-specific controls, optional hint/voice, explanation, retry, completion; no timer, score, animation, or mastery claims. See `DECISIONS.md`. | feature commit pending |
| C1 | C — Guided lesson | verified | B1 | Add up to 100 linked from `/practice`; recall path, guided start-over, arithmetic prompts, dot manipulation, hint, wrong-answer retry, completion, mobile and desktop were exercised in Chromium. | feature commit pending |
| D1 | D — Progress | blocked | C1 | Current app has learner-scoped local resume, but no confirmed server record for a standalone guided activity. `user_learning_progress` schema snapshot has video/quiz types and optional topic; current level hook also writes lesson-specific values. Do not write a synthetic topic or production learner row. Prepare schema/model proposal in `DECISIONS.md`; keep local resume only. | — |
| E1 | E — Flashcards | verified | A2, D1 | Separate untimed, one-card-at-a-time arithmetic Practice deck. Browser-verified integer validation, hint, feedback/retry, next, completion and same-device resume. No race, timer, score, reward, or mastery. | feature commit pending |
| F1 | F — Expansion | verified | C1, E1 | Added a small original Numbers after ten lesson from the logged ten-and-ones learning concept; shared the countable-dot model and verified the three configured steps. | feature commit pending |
| G1 | G — Quality | verified with baseline failures | C1, E1, F1 | Full suite and build pass; focused tests and ESLint pass. Repository lint and TypeScript fail on the pre-existing issues listed in `EVIDENCE.md`. Browser flows passed in disposable guest context; no signed-in backend fixture was available. | feature commit pending |

## Current checkpoint

- Verified source baseline: `practice` and the feature branch's original fork point were `cf8d3348072075d70abe9c4caa4ca36283ab6fc6`.
- The remote feature ref had four documentation-only commits after that point. They were cherry-picked individually to preserve local lesson files; local documentation commits currently end at `638da6f0`.
- Source package: `APP_INSPECTION.md`, `README.md`, `references/development-instructions.md` (including all video notes), and `references/UNVERIFIED-synthesis-inspection-report.md` have been read. The inspection report remains unverified. No original recordings were available to watch.
- Local-only progress is scoped with Tutorly's existing `learnerStorageKey` and guarded when learner identity changes; it is not cross-device, not shown on Dashboard, and does not imply mastery in the server model.
- Do not run against production learner data. No database migration, deployment, PR, or push is authorized.

## Resume instructions

1. Keep work on `feature/guided-practice-lessons`; do not edit `main` or `practice`.
2. Inspect `git status` before editing. Preserve the existing local changes.
3. Retain the explicit boundary that server-backed learning progress cannot be recorded until the standalone activity model is resolved.
4. Review the final diff and commit verified feature work on this branch. Do not merge, deploy, push, or open a PR.
