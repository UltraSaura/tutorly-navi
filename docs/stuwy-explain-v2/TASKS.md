# Tasks

| ID | Description | Dependencies | Status | Acceptance criteria | Evidence | Commit / PR | Blockers |
|---|---|---|---|---|---|---|---|
| V2-001 | Audit branch heads and divergence | Git remote access | Done | Record requested branch SHAs and differences | `STATUS.md` | [PR #53](https://github.com/UltraSaura/tutorly-navi/pull/53) | Awaiting merge checks/approval |
| V2-002 | Create V2 branch and project record | V2-001 | Done | Dedicated branch from verified baseline; seven authoritative docs | This directory | `feature/stuwy-explain-v2` | Remote push/PR requires repository credentials |
| V2-003 | Build isolated Explanation Lab | V2-002 | Done (initial slice) | Dev-only route, local inputs, deterministic steps, validation, preview controls | 3 focused tests; build | local commit | Benchmark corpus remains |
| V2-006 | Replace string rows with exponent-based mathematical grid | V2-003 | Done (initial slice) | Explicit cells for place values, decimal exponents and semantic event positions | 7 grid tests; typecheck; focused lint | local working tree | Screenshot baselines remain |
| V2-007 | Validate six reference operations in Lab | V2-006 | Done (deterministic contract) | Addition, borrowing, regrouping, multiplication, division and decimal alignment produce verified frames | `placeValueGrid.test.ts` | local working tree | UI screenshot review remains |
| V2-008 | Add viewport screenshot regression suite | V2-006 | Blocked | Automated mobile and desktop image baselines | — | — | No browser screenshot test dependency/harness in repository |
| V2-004 | Build 30-exercise benchmark corpus | V2-003 | Planned | Multiple grades and exercise families with separate correctness/pedagogy results | — | — | Product-owner review |
| V2-005 | Approval gate | V2-004 | Blocked by design | Lab demo, benchmark and cost/performance evidence approved | — | — | Approval not yet requested |
