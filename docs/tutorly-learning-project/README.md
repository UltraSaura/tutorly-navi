# Tutorly learning project: source index

This folder is the working source package for the guided lessons and flashcards project on branch `feature/guided-practice-lessons`, created from `practice`.

## Read these first

1. [APP_INSPECTION.md](./APP_INSPECTION.md) — read-only snapshot of the Tutorly app routes, existing Practice and Dashboard patterns, progress behavior, and build commands checked on the `practice` branch.
2. [references/development-instructions.md](./references/development-instructions.md) — full copied video evidence log and reconstruction principles from the Tutoring App project mirror. Preserve as reference; continue to append new evidence without silently merging contradictions.
3. [references/UNVERIFIED-synthesis-inspection-report.md](./references/UNVERIFIED-synthesis-inspection-report.md) — complete user-supplied report, preserved for completeness and marked unverified. Do not treat its code, markup, styling, route names, tRPC event, or integration instructions as authenticated app internals.

## Evidence hierarchy

- The current Tutorly code is the source of truth for what exists in Tutorly. Reinspect it on this branch because the snapshot can become stale.
- The supplied screen recordings and the per-video **Observed** sections in `development-instructions.md` are the evidence for observed Synthesis Tutor behavior.
- Inferences and proposed implementation patterns must be labeled as such.
- The supplied inspection report is secondary and unverified. Do not implement its sample code or claims as facts.
- If two sources disagree or evidence is incomplete, preserve both observations and record an open question rather than choosing silently.

## Video inventory

The copied evidence log contains notes for these 12 recordings:

| Recording | Duration | Main activity observed |
| --- | ---: | --- |
| Screen Recording 2026-11-10 at 21.07.52.mov | 2:38 | Subtract Within 10; counter model; completion and reward |
| Screen Recording 2026-11-10 at 21.43.15.mov | 11:29 | Color Count; grid activities and completion |
| Screen Recording 2026-11-10 at 23.28.25.mov | 4:11 | The Next 10; ten-and-ones tile model |
| Screen Recording 2026-11-10 at 23.32.52.mov | 1:17 | Flashcards 1 timed mastery assessment |
| Screen Recording 2026-11-10 at 23.34.34.mov | 1:08 | Flashcards 1 race and reward |
| Screen Recording 2026-11-10 at 23.35.52.mov | 0:56 | Subtract to 10 assessment/practice |
| Screen Recording 2026-11-10 at 23.37.03.mov | 1:56 | Add Across 10 tile manipulation |
| Screen Recording 2026-11-10 at 23.39.25.mov | 8:24 | Word Problems and scaffolded support |
| Screen Recording 2026-11-10 at 23.48.31.mov | 6:47 | The Counting Clock / digital time |
| Screen Recording 2026-11-10 at 23.55.48.mov | 4:53 | Analog clock, hands, and hour/minute concepts |
| Screen Recording 2026-11-11 at 00.01.04.mov | 6:30 | Multiplication as equal groups and repeated addition |
| Screen Recording 2026-11-11 at 00.59.44.mov | 2:02 | Add up to 100; dot groups, tens/ones, recall and guided path |

The recordings themselves are not stored in this repository by these documents. Codex Cloud cannot read a path on Hiroshi's Mac just because it appears in a note. If exact frame/audio verification is needed, attach or otherwise make the relevant recording available to the cloud task. The notes include technical metadata where available and mark incomplete observations.

## Continuity rules for the project lead

- Maintain `PLAN.md`, `EVIDENCE.md`, and `DECISIONS.md` under this folder as the build progresses.
- Keep phase status and next action current; reference actual commits/files/check output, not promises.
- Keep user-provided source files under the ChatGPT project mirror read-only. These repo copies are references.
- Never claim to have recorded or captured more than the evidence logs establish.
