# Browser and visual QA — Phase 2

Implemented on `feature/guided-practice-lessons` after verified baseline `c48e2cbf5bc833a8d190f3d27fdc6f3e00d58799`. Continue reviewing in draft PR #54. No main-branch edits, merges, production operations or lesson-content changes.

## Reproduce

Use Node 22.23.5 from `.nvmrc` and the committed npm lockfile.

```sh
npm ci
npm run browser:install -- --with-deps
npm run typecheck
npm run lint:ci
npm run test:tooling
npm run test:ci
npm run build
npm run browser:test
```

`browser:test` serves the existing production `dist` build on loopback, not a fabricated UI or development-only route. Build first; port 4173 must be available. It stops its preview server afterwards. `PW_PORT` selects another loopback port. Use `PLAYWRIGHT_BROWSERS_PATH` to choose a writable browser cache where the home directory is read-only.

Playwright is pinned to 1.65.0. CI uses its bundled Chromium on Ubuntu 24.04, not an unpinned system Chrome. Local CDN access was blocked by HTTP 403 `Domain forbidden` from `cdn.playwright.dev`; local executions used the installed Chromium 154.0.8037.57 explicitly:

```sh
PW_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run browser:test
```

That override is an infrastructure fallback, not a claim that every browser version produces identical pixels. To install the canonical browser locally, allow `cdn.playwright.dev` and any official redirect hosts in environment settings. Hosted verification is reported separately in PR #54.

## Scenarios actually exercised

Eight tests run in each viewport: desktop 1280×900 and mobile 390×844 with touch/mobile emulation and scale 1. Sixteen test executions include ten screenshot comparisons.

| Journey | Actual assertions / interactions |
|---|---|
| Startup/navigation | Real home heading; usable sign-in link; click to `/auth`; input visible; browser back |
| Authentication form | Submit empty form; both existing required-field errors; navigate to password reset; email input visible; no credentials submitted |
| Language | Use existing dropdown to switch English → French; translated sign-in link; document language/local storage; preference survives reload |
| Practice | Real `/practice/number-line?focus=1`; visible line and progress `1 / 4`; place all three fractions on wrong ticks; submit; incorrect feedback/hint; no premature next button; retry; correct each placement; success; next activity and progress `2 / 4` |
| Lesson | Real `/learning/mathematiques` with synthetic REST catalogue; only published theme shown; theme route → existing legacy lesson player; prerequisite input; actual rectangle SVG and measurements; finish lesson |
| Visual home | Full-page screenshot; explicit badge/language rectangle non-overlap and control hit test |
| Visual auth | Full-page screenshot; visible/usable input |
| Visual practice | Full-page screenshot; visible/usable answer control |

The practice and lesson journeys additionally compare wrong-answer and diagram screenshots. Assertions check horizontal overflow, visibility, enabled controls, viewport clipping and center-point obstruction for representative controls. Every test checks uncaught page errors, console errors, font decode warnings, HTTP failures, unexpected request failures and broken `<img>` resources. The known cancellation of allowlisted, synthetic GET queries with `net::ERR_ABORTED` during route changes is recorded separately; HTTP errors and other failures are not ignored.

## Synthetic data boundary

This is browser functional/component integration against a production web bundle, **not a live Supabase integration test**. Only explicitly allowlisted staging REST GET requests are fulfilled in the browser with synthetic catalogue or empty bootstrap data. No request reaches the hosted backend. Unknown external requests, auth requests and writes are blocked and fail the test. Service workers are blocked. Tests use fresh anonymous contexts and create no accounts or sessions.

`e2e/catalogue.ts` contains a clearly synthetic, schema-typed legacy lesson and diagram; it is never imported by application code or deployed. Existing static practice content is used unchanged. The report attaches a synthetic-network/health record to every test.

## Determinism and review policy

- Fixed locale `en-US`, timezone UTC, initial English preference, date, light theme, reduced motion, viewports and device scale.
- Existing intended Poppins faces are pinned and self-hosted in the application; MathLive fonts use its existing local assets. All five Poppins weights must actually load. Tests do not replace font failures with synthetic successes.
- Snapshot animations disabled, carets hidden, zero permitted differing pixels at a 0.15 color threshold; no broad screenshot masks.
- `updateSnapshots: 'none'`, no retries, and `forbidOnly` in CI. CI never approves changed screenshots.
- Twenty expectations (ten per renderer profile) were inspected visually with image tools. See [review metadata and hashes](../../e2e/visual-baselines/review.json) and [baseline images](../../e2e/visual-baselines). Initial fallback-font candidates were discarded after detecting a fixture font URL error; final baselines use actual pinned fonts.
- For a future change, inspect expected/actual/diff images and the underlying behavior first. Obtain explicit review of the change before updating named expectations. Never resolve a regression merely by replacing its expected image.

## Defects found and corrected

1. **Badge overlap:** the staging badge overlapped the mobile language selector. The rectangle-intersection assertion failed. Compact top-edge placement removes the overlap while retaining the environment indicator.
2. **Missing font resources:** four `@font-face` rules referenced SF Pro files absent from the repository. Browser font decoding checks detected the SPA HTML fallback being returned as a font. Removed those invalid faces; existing fallback families remain. Self-hosted Poppins and MathLive replace external font CDN requests without changing intended fonts.
3. **Retry hit testing:** a decorative marker stem intercepted desktop clicks on a target graduation after a wrong placement. Trace recorded the intercepting element. Marker wrappers/stems now pass pointer events through, while the draggable marker button keeps pointer events. The same real retry journey now passes; no forced clicks or synthetic success callbacks are used.

## Controlled defect/repair pilot

```sh
# Builds only temporary copies; requires installed Chromium and local port 4280.
npm run browser:pilot
```

The script copies reviewable source into a unique directory under ignored artifacts, excluding `.git`, `.env*` and dependency copies; it reuses installed `node_modules` through a symlink. It deliberately changes only the home sign-in link to `/qa-intentional-broken-auth`, builds that copy and runs the unchanged desktop navigation test. Detection must both fail and mention that exact bad destination; an infrastructure failure is not accepted as detection.

It restores that link's original source, rebuilds, and reruns the same test once. No tests or baselines change. The temporary copy is removed in `finally`; the actual working source is checked unchanged. This is one bounded deterministic correction pilot, not an operational autonomous coding service.

Executed outcome: defect exit **1**, repair exit **0**, **one** repair attempt, matching original/restored source hashes. See [machine-readable result](pilot-result.json) and [detection screenshot](pilot-detected.png). Full local logs, screenshot and trace are retained under `artifacts/browser/pilot/`. An initial harness run found no tests because an anchored grep did not match Playwright's full title; it was rejected as evidence and corrected before the successful pilot.

## Executed verification and CI

Local commands actually executed: real app/config/e2e TypeScript checks; lint regression gate (zero new violations, existing 1,040 errors / 108 warnings still visible); tooling tests; 1,124 existing Vitest tests; production builds; Playwright interactions and comparisons. Final command results and the hosted run are linked from PR #54; local execution is not substituted for hosted success.

The existing reusable web workflow now installs pinned Chromium and runs the browser suite after its existing successful build. No second build/unit pipeline is added. Existing Android candidate steps remain behind the shared verification. Repository permission stays `contents: read`; no deployment secrets are introduced. Job timeout is 20 minutes.

Always-uploaded artifacts include HTML report, browser JUnit, screenshots for every executed test, synthetic network/health records, expected/actual/diff images on comparison failures, and failure traces, alongside Phase 1 logs. Retention: 14 days. Tests never update snapshots in CI. Use `npx playwright show-report artifacts/browser/report` or `npx playwright show-trace <trace.zip>` after downloading evidence.

## Limits and costs

- Anonymous paths and synthetic lesson reads only. Live authentication, email/reset delivery, account/profile isolation, database persistence, actual published data and paid AI responses are unverified.
- Tap/click placement and retry are covered; full pointer-drag gestures, every question type, every lesson, offline recovery and durable mastery are not.
- Chromium desktop and mobile emulation only: no Firefox/WebKit, real mobile device, Android emulator or complete accessibility certification.
- The unresolved Phase 1 dependency advisories remain separate security work. Browser tests are not a production security certification.
- No AI API calls or API billing are needed for this suite/pilot. GitHub runner minutes and artifact storage use the account's existing quotas; exact billing is not verified. No paid service was provisioned.

## Implemented files

| File(s) | Purpose |
|---|---|
| `playwright.config.ts` | Desktop/mobile runner, deterministic settings, production preview, strict comparisons, reports and failure traces |
| `tsconfig.e2e.json`, `package.json`, `package-lock.json` | Type-check tests and pin Playwright/font dependencies; reproducible commands |
| `e2e/catalogue.ts` | Typed synthetic transport data |
| `e2e/fixtures.ts` | Strict network isolation, health evidence, font readiness and layout/control assertions |
| `e2e/journeys.pw.ts` | Real browser journeys and visual comparisons |
| `e2e/visual-baselines/**` | Reviewed image expectations and review metadata |
| `scripts/ci/browser-pilot.mjs` | Isolated negative-control detection and one targeted repair |
| `.github/workflows/verify-web.yml` | Extend existing CI after build; preserve artifact capture on failure |
| `src/App.tsx` | Correct environment badge overlap |
| `src/index.css`, `index.html` | Self-host intended fonts and remove missing-resource declarations |
| `src/features/practice/numberLine/GraduatedNumberLineActivity.tsx` | Correct decorative marker hit testing while retaining dragging |
| `docs/browser-qa/**` | Coverage, limitations, review policy and pilot evidence |

## Renderer baseline review

The first hosted run [43275138227](https://github.com/UltraSaura/tutorly-navi/actions/runs/43275138227) passed six journeys and failed ten screenshot checkpoints against Debian Chromium 154 expectations. The hosted PR merge tree was identical to branch commit `38870e8c`; Chromium 158 / Ubuntu 24.04 rendered fonts differently. All ten hosted actual images were inspected, including controls, diagrams and mobile wrapping. Separate reviewed profiles preserve both renderers without increasing tolerance or masking pixels. `PW_CHROMIUM_EXECUTABLE` selects the Debian profile; the default is canonical Ubuntu CI. The fixture requires the exact reviewed browser version and fails unsupported versions. OS/profile matching is the operator's responsibility. Human visual approval remains pending in draft PR #54. Baseline changes are explicit reviewed source changes, never automatic CI approval.
