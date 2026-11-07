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
