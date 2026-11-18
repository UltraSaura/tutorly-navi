# Number-line independent retry and optional guidance — 18 November 2026

Branch: `feature/guided-practice-lessons`. Clean starting commit `bd92d93fa79d24855f01b591ad15ea33f284ce6e`, fetched and confirmed against origin before editing. Initial focused baseline: 20 existing number-line tests passed.

## Approved Tutorly policy

The user asked for independent effort before escalating help. The resulting policy is a Tutorly adaptation inspired by Brilliant's learning approach, not a claim that Brilliant uses this exact two-failure rule. Official references reviewed in the preceding conversation:

- Brilliant: https://brilliant.org/resources/choosing-brilliant/how-brilliant-teaches-math/
- ASSISTments: https://www.assistments.org/individual-resource/student-supports
- IXL's different explanation-first approach: https://blog.ixl.com/2021/04/20/how-ixl-helps-kids-bounce-back-from-mistakes/

No new reference-video behavior or French curriculum level is inferred by this change. This remains the existing fraction/decimal number-line Practice tool.

## Implemented behavior

1. First submission is independent unless the student requests help.
2. After an unsuccessful submission, whole-answer feedback is neutral. No item-specific colors, partial-success badge, correctness marks, detail list or accepted-item locks reveal which parts were right. During feedback all controls are uniformly disabled; Retry retains every value/position and makes every part editable.
3. After the second unsuccessful submission, an optional “Guide me” action appears. It does not activate guidance automatically. The ordinary Retry remains available.
4. Accepting guidance confirms only correct parts of the currently checked work and supplies a method-only hint. Checked work cannot be edited while the offer is displayed; clearing/resetting feedback invalidates the offer so an old snapshot cannot confirm later edits.
5. Help remains available from the start. Requesting it activates guided mode; closing the hint or resetting work never restores an unaided label. Clearing work retains attempt history. Starting another activity/restarting the four-activity sequence starts a new session.
6. Completion states whether help was used. The existing result adds only an optional TypeScript `supportUsed` field; attempts and item-level correctness keep their existing meaning. There is no new database schema, score policy, analytics write or mastery award.
7. After a guided success, standalone Practice offers a separate fresh example. It shifts the number-line origin and numeric targets, uses a new activity ID, clears previous work/aliases and starts with support off. Only one exercise is displayed at a time. The original completed result is retained; the fresh result is separate. Help remains available, and guided success in the fresh example is not described as unaided. This small transfer variation is not proof of mastery or a full adaptive difficulty policy.

## Compatibility and limits

The shared number-line component applies the retry policy to placement, reading and ordering, including the existing lesson adapter. The optional extra example is attached to standalone Practice only, not silently appended to lesson assessments. The utility still has no point scoring or persisted learner progress; page reload starts over as before. Correctness is computed deterministically with the existing evaluator. No learner test data is sent to production.

## Changed files

- `src/features/practice/numberLine/numberLineSupport.ts` and `.test.ts`: support-stage policy and fresh-example generation.
- `src/features/practice/numberLine/GraduatedNumberLineActivity.tsx`: neutral retry, optional guidance, safe confirmation, help-use labeling.
- `src/features/practice/numberLine/numberLineTypes.ts`: optional help-use result field.
- `src/pages/practice/GraduatedNumberLinePage.tsx`: separate fresh example following guided success; clearer page structure.
- `e2e/number-line-support.pw.ts`: independent retry, opt-in guidance, changed-answer snapshots, reset/history, supported versus unaided completion and fresh example.
- `e2e/number-line-feedback.pw.ts`, `e2e/journeys.pw.ts`: update existing journeys for the approved retry policy.
- Two `e2e/visual-baselines/debian13-chromium154/{desktop,mobile}/practice-wrong-answer.png` baselines: neutral first-error display.
- `README.md` and earlier pilot report: link and distinguish the new approved policy from the superseded behavior.

## Validation

- `npm run test:ci`: **134 files, 1,241 tests passed**.
- Focused number-line tests: **30 passed**, including support-stage boundaries, all four fresh-example modes and stale authored-state cleanup.
- `npm run typecheck`: passed. Final edited browser-test TypeScript check also passed.
- `npm run lint:ci`: passed with zero new/changed violations; existing full-lint debt remains 1,035 errors and 108 warnings. Final targeted ESLint also passed.
- `npm run build`: passed. Existing large-chunk and mixed-import warnings remain.
- Final browser run, without snapshot updates: **12 tests passed** on desktop 1280×900 and mobile 390×844, with reduced motion. Covers the four-activity sequence, first retry editable and unmarked, success without help on the second attempt, voluntary support after two failures, early help, changed-answer snapshot accuracy, reset preserving failure/help history, read/placement/order corrections, fresh supported-to-unaided transition, completion/restart, keyboard and touch, and existing functional/visual Practice journeys.
- Two Debian/Chromium-154 incorrect-answer screenshots were updated for neutral feedback, reviewed visually, and verified in the final run. Initial-state screenshots did not change. Desktop support-offer and mobile fresh-result screens were also inspected.
- Visual review caught an active-label highlight that could look like a correctness cue; submission now clears the selection. The final browser run explicitly checks that no item is selected/confirmed before guidance.
- Read-only final review found no blocking issue. No production learner records were created; browser fixtures block unexpected external traffic.

### Remaining limitations

The earlier pilot's Ubuntu/Chromium-158 download restriction and pending renderer-specific screenshot refresh remain documented in `NUMBER-LINE-FEEDBACK-PILOT.md`; no full Ubuntu CI pass is claimed. Before merging, refresh the Ubuntu Practice visual baseline on a runner able to install that pinned browser. This delivery only publishes the existing feature preview. Live signed-in learner progress, screen-reader speech, scoring integration and persistent sessions remain outside this utility's current contract.
