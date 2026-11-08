# Tasks

| ID | Description | Dependencies | Status | Acceptance criteria | Evidence | Commit / PR | Blockers |
|---|---|---|---|---|---|---|---|
| V2-001 | Audit branch heads and divergence | Git remote access | Done | Record requested branch SHAs and differences | `STATUS.md` | [PR #53](https://github.com/UltraSaura/tutorly-navi/pull/53) | None |
| V2-002 | Create V2 branch and project record | V2-001 | Done | Dedicated branch from verified baseline; seven authoritative docs | This directory | `feature/stuwy-explain-v2` | Remote push/PR requires repository credentials |
| V2-003 | Build isolated Explanation Lab | V2-002 | Done (initial slice) | Dev-only route, local inputs, deterministic steps, validation, preview controls | 3 focused tests; build | local commit | Benchmark corpus remains |
| V2-006 | Replace string rows with exponent-based mathematical grid | V2-003 | Done (cycle 3 slice) | Explicit cells for place values, decimal exponents and semantic event positions | 10 grid tests; typecheck; focused lint | `d9998353` + pending cycle commit | Screenshot baselines remain |
| V2-007 | Validate six reference operations in Lab | V2-006 | Done (deterministic contract) | Addition, borrowing, regrouping, multiplication, division and decimal alignment produce verified frames | `placeValueGrid.test.ts`; 10 tests | `d9998353` + pending cycle commit | UI screenshot review remains |
| V2-008 | Add viewport screenshot regression suite | V2-006 | Prepared | Automated mobile and desktop capture plus strict baseline comparison | `scripts/visual-regression/stuwy-explain-v2.py` | pending cycle commit | Capture requires an already-running local server and browser binaries |
| V2-009 | Synchronize V2 with merged development | Git history | Done | Preserve V2 commits while adding merged development ancestry | `d9998353` | `d9998353` | None |
| V2-004 | Build 30-exercise benchmark corpus | V2-003 | Planned | Multiple grades and exercise families with separate correctness/pedagogy results | — | — | Product-owner review |
| V2-005 | Approval gate | V2-004 | Blocked by design | Lab demo, benchmark and cost/performance evidence approved | — | — | Approval not yet requested |
## Cycle 4 completed work

- [x] Explicit regrouping annotations and zero-crossing borrowing model.
- [x] 30-exercise reproducible benchmark and quality-gate report.
- [x] Remainder visual-regression coverage added without replacing existing baseline cases.
- [ ] Manual teacher review of grade-specific wording and screen-reader behavior.
- [ ] Extend renderer to fractions, geometry and word-problem modeling.
## Cycle 5 completed work

- [x] Audit all 30 exercises and preserve corrections in benchmark data.
- [x] Add grade-aware French pedagogical notes and avoid premature guided answers.
- [x] Add product-owner demo presets and reviewed walkthrough links.
- [x] Add keyboard-friendly labels and a polite live explanation region.
- [ ] Manual teacher and screen-reader review of phrasing and announcement cadence.

## Teacher Engine V1

- [x] Audit existing TwoCards, solver, mastery, attempts, curriculum,
  remediation, hints, and V2 capabilities.
- [x] Add typed deterministic pedagogical decision contract.
- [x] Add guided, teaching, and review transitions for regrouping subtraction.
- [x] Add development-only Teacher Lab simulation for six student situations.
- [ ] Connect production callers after explicit product-owner approval.
- [ ] Extend pedagogical strategies beyond written subtraction.

## Cycle T09

- [x] Trace and fix the root cause of the unchanged student-facing screen.
- [x] Render conventional written operations without technical event rows.
- [x] Show direct carry/borrow annotations and natural French guidance.
- [x] Wire assistance level to the visible V2 presentation.
- [x] Add `24 + 32` and `325 - 148` to the visual acceptance cases.
- [x] Re-run reviewed mobile and desktop screenshot coverage.
- [ ] Product-owner approval before any production integration.

## T11

- [x] Centralize typed pedagogical prompts for regrouping subtraction.
- [x] Reduce student cognitive load and preserve meaningful free-text answers.
- [x] Track assistance level, hint history, demonstration use, and transfer
  evidence.
- [x] Keep the existing TwoCards method and narration for under-11 learners.
- [x] Add explicit method-consistency documentation for TwoCards versus V2.
- [ ] Complete manual accessibility and teacher review.

## Architectural correction

- [x] Inventory TwoCards components, callers, animation and speech path.
- [x] Reuse the original `CompactMathStepper` in the Teacher Lab comparison.
- [x] Keep TwoCards as the under-11 default and avoid production migration.
- [x] Keep V2 paper-first presentation separate for older learners.
- [ ] Obtain approval before connecting Teacher Engine enhancements to live
  TwoCards callers.

## T10

- [x] Replace scenario-only student demonstration with a real answer-driven
  tutoring session.
- [x] Diagnose reversal, skipped-units, incorrect-result, and insufficient
  evidence responses without claiming unsupported evidence.
- [x] Implement progressive hints, retry, demonstration, and transfer.
- [x] Preserve existing TwoCards animation and speech for under-11 learners.
- [ ] Product-owner approval before any production integration.
