# STUWY Lesson Workflow Integration — F.04A

**Status:** Integration candidate validated; production integration remains a separate gate.
**Candidate branch:** `integration/stuwy-interactive-lessons`
**Base:** `main` at `5b5ea1de14c223b28f1838b105b6d82d0385cdf3`
**Interactive source:** `feature/explanation-v2-interactive-math` at `c38af81e32bdd30614d4d4407056e524f655e040`
**Hosted-validated runtime SHA:** `bb112213984b654e1ca39f6af1dbd3c5996a94f8`

## Branch preflight

Verified remote branch heads before editing:

| Branch | Head |
| --- | --- |
| `main` | `5b5ea1de14c223b28f1838b105b6d82d0385cdf3` |
| `feature/guided-practice-lessons` | `a57846c388c904fff15bc374a13afa06f0d9f6db` |
| `feature/explanation-v2-interactive-math` | `c38af81e32bdd30614d4d4407056e524f655e040` |
| `integration/stuwy-explain-v2` | `828413a32af273cb1f2dbc27711f7c86f0574a23` |
| `feature/stuwy-explain-v2` | `cec2b07a802844aacd789bd01e58d8316f73a1c4` |
| `release/v1-stabilization` | `d53af6c49d63fa8bffb9a939e3c5968267c21add` |

The proposed candidate branch was absent remotely. It was created locally from the verified `main` head. The interactive source and current main have no common Git merge base; integration therefore uses reviewed, targeted file changes and new source assets, with no merge, rebase, cherry-pick, or wholesale file replacement. `feature/v2-universal-tutor` was excluded. PR #56 was rechecked: open, draft, base `parent`, and unchanged.

## Integrated contracts and rendering

- `src/features/explanation-v2/activityContract.ts` is the single Zod discriminated activity schema for exactly the seven accepted kinds: `fraction-select`, `fraction-bar`, `coordinate-plane`, `algebra-tiles`, `linear-function`, `line-fit`, and `equation-decomposition`.
- `src/types/lesson-v21-contract.ts` delegates activity validation to that schema and reports nested field paths. Existing main-side staging prerequisites and geometry, decimal, and time validations remain in place.
- `src/types/lesson-generator.ts` normalizes V2.0 outer lesson fields then validates the complete normalized payload; invalid/unknown modern activity blocks are rejected rather than dropped.
- `supabase/functions/generate-lesson-content/lesson-v21-contract.ts` imports the same activity schema. Its existing geometry checks remain. A function-local Deno import map is at `supabase/functions/generate-lesson-content/deno.json`.
- `src/components/learning/LessonContentStudent.tsx` keeps the established legacy fallback for non-versioned lessons and fails closed on malformed versioned V2.1. Valid V2.1 levels continue through `LessonV21Path` and the existing `LessonV2Player`.
- `src/components/learning/LessonV2Player.tsx` renders activities through `InteractiveActivityHost`; activity completion gates continuation but does not masquerade as mastery-check success. Teacher preview passes `readOnly`, so preview interactions do not record learner completion, XP, or progress.
- The shared safe `MathText` / `MathTextTree` rendering is used for lesson text. Existing answer input and grading formats remain unchanged.

The admin preview in `src/components/admin/learning/GeneratedLessonsPage.tsx` uses the existing player for valid V2.1 levels containing interactive activities. Non-interactive V2.1 and legacy previews retain the existing static renderer, including its geometry visual review behavior. Invalid V2.1 content produces actionable contract paths rather than silently switching to legacy rendering. The staging workflow page retains its existing version identity, validation results, filters and guarded actions.

## Preserved workflow and publication safeguards

The main branch remains the workflow owner. These existing files and contracts were retained rather than rebuilt:

- `src/services/lessonVersionWorkflow.ts`: `buildDraftInsertPayload`, `saveDraftVersion`, `validateLessonVersion`, `validateSavedDraft`, and `publishValidatedDraft`.
- `src/components/admin/learning/StagingLessonVersionPanel.tsx` and `src/pages/admin/StagingLessonWorkflowPage.tsx`.
- `src/components/admin/learning/GeneratedLessonsPage.tsx` and its current filters/version list.
- Existing `topic_lesson_versions` migrations and `publish_topic_lesson_version` RPC protections.
- Existing `supabase/functions/generate-lesson-content` draft-only flow and legacy protections.

The workflow migrations are `supabase/migrations/20261014111115_create_topic_lesson_versions.sql`, `supabase/migrations/20261014111455_publish_topic_lesson_version.sql`, and `supabase/migrations/20261014113116_lock_publish_topic_lesson_version_execute.sql`. The Edge handler is `supabase/functions/generate-lesson-content/index.ts`; the lesson payload validator is `supabase/functions/generate-lesson-content/lesson-v21-contract.ts`.

No database record or RPC was written during this work. Technical validation remains separate from explicit publication confirmation. Existing admin authorization checks and duplicate active-version safeguards were not changed. The separate Edge function contract now shares the activity schema but has not been deployed.

The guided-practice branch head was `a57846c388c904fff15bc374a13afa06f0d9f6db`. Its `docs/lesson-generation-progress.md` describes staging-draft insertion into `topic_lesson_versions` and no direct publication. No broad merge was attempted. Further provenance review is needed before integrating any additional guided-practice-only files.

## Fixtures and tests

- `src/features/explanation-v2/fixtures/cm2FractionLessonV21.fixture.ts` is a non-persistent four-level CM2 fixture; objective IDs remain explicitly test-only.
- `src/types/interactive-lesson-contract.integration.test.ts` compares browser and Edge validators across the seven activity kinds, staging prerequisite contracts, V2.0 normalization, malformed payload rejection, schema versions, denominators, transfer settings and identity collisions.
- `qa/staging-preview.html`, `qa/staging-preview-entry.tsx`, and `qa/staging-preview-browser.mjs` exercise the existing teacher preview using local fixture data at 320, 375, 390, 447, and 1280px and capture screenshots/report output without database writes.
- `src/components/admin/learning/geometryLesson.fixture.ts` now supplies explicit test-only fields required by the strict V2.1 schema; this preserves the existing geometry preview fixture coverage without weakening validation.

Local full test suite: **1,186/1,186 tests across 123 files passed**. TypeScript (`tsc --noEmit`) passed. Focused ESLint on new/shared activity contract files passed with **0 errors and 4 Fast Refresh warnings**. The hosted unit/build job passed **148/148 focused tests across 16 files**, TypeScript, focused lint, Deno validation of the shared Edge/browser contract, production build, and standalone demo artifact verification.

Hosted browser acceptance: [GitHub Actions run 46097232509](https://github.com/UltraSaura/tutorly-navi/actions/runs/46097232509) passed both jobs at runtime SHA `bb112213984b654e1ca39f6af1dbd3c5996a94f8`. It reports **195/195 standalone browser checks**, **80/80 LessonV2Player checks**, read-only teacher preview success at **320, 375, 390, 447, and 1280px**, and **4/4 production-built demo smoke checks**. The teacher-preview scenarios verified no unintended horizontal overflow, no JavaScript errors, and no Supabase write requests. Screenshots and QA reports: [artifact 15243767587](https://github.com/UltraSaura/tutorly-navi/actions/runs/46097232509/artifacts/15243767587).

The Vercel integration preview is READY for the same runtime SHA. The demo route is [available here](https://stuwy-opw4x6kas-stuwy.vercel.app/demo.html); this is a branch preview, not a production deployment. Hosted teacher-preview screenshots are fixture-based and do not use a live teacher account or Supabase.

The first browser runs exposed that the QA assertion referenced a nonexistent CM2-specific test selector. The player now provides a generic representation test hook; the assertion still requires one aligned KaTeX display and six stacked fractions. The final run passes this unchanged mathematical acceptance requirement. The focused lint step excludes pre-existing `no-explicit-any` debt in legacy main-owned UI files; local baseline comparison showed those errors were present at `main` and none were added by this candidate.

## Remaining limits and decisions

- This is an integration candidate, not production integration. No protected branch was changed and PR #56 remains separate.
- Objective IDs are syntactically validated but are not checked against a live curriculum objective table; the CM2 fixture IDs remain test placeholders.
- Teacher approval, curriculum mapping approval, and real signed-in learner acceptance remain outstanding.
- Browser screenshots and Deno/browser validation parity are confirmed by the hosted run above; no signed-in teacher workflow or live learner persistence was exercised.
- Actual persistence across refresh depends on the existing student workflow; preview mode is read-only. Local activity state should not be described as persistent evidence.
- No staging workflow ownership migration is proposed. A later integration onto the workflow-owning production line must preserve the version table, guarded RPC, admin authorization, and draft-only import contract.

## F.04B recommendation

Limit F.04B to externally authored ChatGPT JSON draft import into the existing staging version workflow. Reuse `validateLessonVersion` and the shared activity allow-list, validate objective bindings against the selected curriculum topic, save only as a new `draft`, preserve existing drafts, show the teacher a read-only preview and actionable validation paths, and require the existing explicit validation and publication actions. Do not regenerate existing lessons, call a paid AI API from the app, or write directly to `topics.lesson_content`.
