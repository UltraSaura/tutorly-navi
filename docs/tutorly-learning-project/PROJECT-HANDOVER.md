# Tutorly / Stuwy — project handover and implementation tracker

Last updated: 26 November 2026. This is a working handover for continuing in another chat. Treat it as a snapshot: check the branch, deployments and current code before acting.

## Start here in a new chat

> Please read `docs/tutorly-learning-project/PROJECT-HANDOVER.md` in `UltraSaura/tutorly-navi` before continuing. Work on the existing branch `feature/guided-practice-lessons`. Check Git status and fetch the remote before editing; preserve all existing changes. I am not a coder, so explain what changed in plain language and give me an exact, current preview link so I can test the app. Work on one module at a time and let me test it. Keep this document updated as decisions and work change.

The user's product is referred to as Tutorly and appears as Stuwy in the current app. The user tests visual behavior and cannot review source code. Give clear directions to the relevant screen, avoid claiming an app flow works without testing it, and say when a preview is still building or a link points to an older deployment.

## Current workspace and links

- Repository: `UltraSaura/tutorly-navi`; feature branch: `feature/guided-practice-lessons`. On 26 November the local branch was clean at `92413b7b` before this document was created. Other collaborators may update it: fetch and check the actual remote head.
- Latest confirmed feature preview from this conversation: https://stuwy-nqrvdvmi9-stuwy.vercel.app (commit `92413b7b`, ready). Chat: https://stuwy-nqrvdvmi9-stuwy.vercel.app/chat. Each Vercel deployment URL is fixed to a specific version; verify a new preview is ready and provide the exact link after publishing changes.
- Admin learning content: `/admin/learning`. Student Practice is accessed through **S’entraîner**; choose a subject, topic and available quiz.
- Original Brilliant analysis: https://docs.google.com/document/d/1XCmQzet8PW1KkxUApTdAUxy19e_xPuZsaMwuLQ1LgJY/edit . Its observations cover selected paths, not the whole product.
- The previous task used the Supabase project labeled StudyWiz (`sibprjxhbxahouejygeu`); the preview displays a staging badge. Confirm the target before any writes or deployment. Never create learner test records in production.

## Product decisions that must be preserved

- Build reusable exercise types that can be configured and later generated through AI and the quiz bank. Do not reproduce the reference products' branding, proprietary assets, voice or code.
- Organize authoring by subject, topic, curriculum and school level. Exercise types should appear only for appropriate levels: for example, colour counting is CP; calculation race and number flashcards can serve all levels with suitable difficulty. Learner Practice should follow subject → topic → available generated/assigned exercise, rather than displaying every exercise type as a standalone topic.
- Lesson prerequisite checks assess existing knowledge and are score free; Practice exercises are scored using the existing model. Never equate opening an activity or receiving guidance with mastery.
- Hints explain a method without revealing the answer before the learner chooses. Counting models must not display totals or removed counts that disclose the answer.
- Use child-friendly original objects, colors, accessible keyboard and touch controls, and short, clear instructions. Do not rely on narration. Correct/incorrect states need text or icons in addition to color.
- For multipart tasks, the agreed policy is an independent first retry; after repeated difficulty offer optional focused guidance. Keep guided recovery distinct from independent success.
- When starting a module, tell the user its source video name/link, what it teaches, proposed subject/category and school level, with evidence and uncertainty. Let the user test each module before moving on.
- The user intends Tutorly v2 to share the app's tools; its main anticipated difference is a universal chat. Avoid duplicating tools just for v2.

## Implemented work on this branch

The entries below identify code and prior delivery reports; they are not a claim that all current signed-in flows were re-tested on 26 November.

| Area | Current work and important limits |
| --- | --- |
| Counting and objects | Reusable groups-of-ten counting with plus controls, choices, pencils/other objects; scattered colored objects for subtraction and operation recognition. User requested configurable numbers and optional colour counting rather than fixed “within 10” types. See `DECISIONS.md` and `QUIZ-CATALOGUE-ORGANIZATION.md`. |
| Guided families | Word problems, equal groups and colour grid have reusable components. The project report documents original Tutorly designs and earlier isolated browser checks. |
| Number line | Graduated number line has independent retry, optional guidance after repeated errors and a fresh follow-up in the standalone activity. Its documented standalone state is not persisted to account progress. |
| Coordinates | Initial positive-quadrant read/plot tool, scoped to French 5ème in the recorded delivery; direct input and click/touch options, hints and retry. It is not a full coordinate curriculum. |
| Clock | Analogue clock exercise for reading whole hours and one hour later was added; compare against existing clock lessons before expanding. Source recording: `Screen Recording 2026-11-10 at 23.55.48`. |
| Mental calculation | Calculation race and number flashcards support answer choices and elapsed time, four arithmetic operations and configured difficulty. Quiz authoring has curriculum/custom operation, digit and table settings. The result screen shows all calculations with correct/incorrect labels; correct answers for missed calculations are inside “Voir la méthode”, with a study recommendation based on missed count. |
| Curriculum picker | The quiz generator separates curriculum editions; older and newer CM2 maths records had previously appeared together. The actual topic domain link may be stored in `curriculum_domain_id` instead of `curriculum_domain_id_uuid`. |
| Arithmetic explanations | Existing two-card explanation and math stepper use a different example from the student's problem. Recent changes added local digit-matched examples for simple arithmetic, preview-level handling, and a chat route for standalone division such as `77/9`. The user confirmed the multiplication error was resolved before reporting the division animation problem. |

## Open issues and follow-up

1. **Division animation:** `77/9` in chat previously showed text only. Commit `92413b7b` routes standalone chat slash calculations to the division path; 67 focused tests and TypeScript passed at that time. The signed-in browser animation was not verified by the assistant, and the user has not confirmed the final preview works. Check on the exact current preview, including remainder calculations and explicit fraction tasks.
2. **Quiz AI generation:** the user reported “The provider returned no valid quiz questions for this batch” when generating a calculation race. Supabase logs showed DeepSeek was called and the returned batch failed validation; they did not identify the specific failed rule. It later appeared the user could generate a series, but reliability and the underlying cause have not been established. Reproduce with actual grade, topic, chosen operations/tables and count; inspect validation and provide actionable errors. Do not claim the issue is fixed without a real successful generation.
3. **Explanation examples:** the user wants reliable reusable worked examples matched to operation and digit count, with a different example when one collides with the student's problem. Current code uses local templates for straightforward addition/subtraction/multiplication and cached/provider flows elsewhere; it does not implement an admin-managed database of examples or guarantee a fresh example every visit. The user also proposed a database of examples and AI fallback. Inspect existing schema and propose any necessary schema change before implementing it.
4. **Photomath decomposition:** the user stated this was the last implemented feature, but the assistant could not identify it from the checked branch history or notes. The user was asked for a screen or calculation; await that evidence and locate the correct branch or feature before making claims.
5. **Images, charts and functions:** the user wants Practice and Lesson pages to support varied images and graphs, including functions, and asked for an architecture evaluation. This was interrupted by arithmetic display bugs. Inspect current lesson/question visual contracts, authoring and asset handling; propose a reusable approach before implementing. Tutorly v2 is expected to reuse these tools.
6. **Curriculum and catalogue review:** the user wants a clean quiz bank, properly named types versus curriculum topics, and school-level restrictions. Verify mappings against authoritative curriculum for each type and school year, rather than treating existing historical notes as final.
7. **Brilliant follow-up:** the referenced document proposes a broader learning loop, not a complete inventory of Brilliant. Existing work includes number line, equal groups and an introductory coordinate plane. Potential future tools include reusable place value, fraction models, balance scales, geometry, variables and graphs. Review existing implementations with the user, then select one topic at a time. Do not claim all planned tools or mastery/recommendation architecture are implemented.
8. **Progress and mastery:** audit the current deployed model and RLS before changing persistence. Prior documents note standalone number-line sessions are not persisted and coordinate standalone progress was in memory; earlier initial guided lessons used local resume. Preserve existing scoring and distinguish supported versus independent work.

## Reference videos

The supplied recording inventory and detailed behavior notes are in `README.md` and `EVIDENCE.md` beside this file. The original uploaded recordings may not be accessible in a future environment; ask for the relevant video again if needed rather than inventing details. Key examples: `00.59.44` add up to 100; `23.32.52` and `23.34.34` flashcards/race; `23.39.25` word problems; `00.01.04` equal groups; `23.55.48` analogue clock. Observed behavior is evidence for Tutorly's original implementations, not a requirement to copy.

## How to continue safely

- Read `AGENTS.md`, check Git status and branch, fetch the remote, and inspect the relevant code and existing changes before editing. Never overwrite or discard another person's work.
- The earlier instruction was to keep work on the existing feature branch; do not merge, deploy to production or open a PR unless the user explicitly requests it. The user has authorized publishing feature previews in this conversation; verify the exact current target and deployment status.
- Run focused tests, appropriate typecheck/build and accessible desktop/mobile checks for the actual change. State exactly what ran, what failed, and what could not be verified. Prior test results in dated reports are historical, not proof of the current branch.
- After completing a feature, update this tracker with the date, commit, preview link, test results, user feedback and outstanding items. Keep sensitive data and credentials out of this file.

## Detailed project records

- `README.md`: evidence hierarchy and recording inventory.
- `DECISIONS.md`, `EVIDENCE.md`, `PLAN.md`: earlier guided-learning decisions, evidence and initial task ledger; some early assumptions were superseded by later user decisions above.
- `QUIZ-CATALOGUE-ORGANIZATION.md`: authoring, curriculum bands and Practice organization.
- `BRILLIANT-IMPLEMENTATION-PLAN.md`: proposed adaptation and architecture, not proof that every phase was implemented.
- `NUMBER-LINE-RETRY-POLICY.md`, `EQUAL-GROUPS-FEEDBACK-PILOT.md`, `COORDINATE-PLANE-DELIVERY.md`: scoped delivery decisions and historical verification.
- `IMPLEMENTATION-REPORT-2026-11-18.md`: earlier guided-family report and limits.
