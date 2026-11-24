# Explanation V2 — Interactive math MVP / QA runbook

**Implementation branch:** `feature/explanation-v2-interactive-math`
**Base:** `parent` at `55f30eccc725a832463373dc85f0ce78cb0b229f`.
**Excluded:** all commits after that base on `feature/v2-universal-tutor`; no merge or cherry-pick from that branch.

## What's implemented
- Zod-validated `interactive_activity` lesson block (V2.0 only).
- Deterministic exact-rational addition, strict integer answer grading, Cartesian transforms.
- Fraction bars: convert right fraction to common denominator, then add numerators; contextual retries and three hints.
- Coordinate plane: pointer/touch drag and equivalent accessible arrow buttons, snap to integer grid, sign-specific feedback.
- State retained when navigating between steps **while the same LessonV2Player remains mounted**; completion gates the Continue button.
- Developer-only route `/dev/explanation-v2-math` under `import.meta.env.DEV`; simulated state only, no Supabase writes.
- Unit tests for math, schema validation and lesson parser.

## Opt-in V2.0 lesson block example
```json
{
  "id": "fraction-activity-01",
  "type": "interactive_activity",
  "activity": {
    "schemaVersion": 1,
    "id": "cm2-fractions-001",
    "kind": "fraction-bar",
    "title": "Additionner des fractions",
    "prompt": "Transforme les moitiés en quarts puis additionne.",
    "left": { "n": 3, "d": 4 },
    "right": { "n": 1, "d": 2 },
    "targetDenominator": 4
  }
}
```
Other activity:
```json
{
  "id": "coordinate-activity-01",
  "type": "interactive_activity",
  "activity": {
    "schemaVersion": 1,
    "id": "4e-coordinates-001",
    "kind": "coordinate-plane",
    "title": "Placer un point",
    "prompt": "Place A(2 ; 3) sur le repère.",
    "target": { "x": 2, "y": 3 }
  }
}
```

## Required verification — NOT YET EXECUTED
```bash
npm ci
npm test -- --run src/features/explanation-v2/math.test.ts src/features/explanation-v2/lessonIntegration.test.ts
npm run build
npx tsc --noEmit
npm run lint
npm run dev
```
Then open `http://localhost:8080/dev/explanation-v2-math` (confirm Vite port; default may be 5173). Check fraction first correct (2,5), wrong first, all three hints, and retry. Check coordinate A(2;3), pointer/touch/keyboard controls, negative quadrants, reset, reduced motion and screen-reader announcements. Repeat at widths 375px and 447px. Test actual `LessonV2Player` with an opt-in lesson fixture, navigation forward/back and preservation of progress.

## Release blockers / explicit limitations
- No actual browser, device, Vitest, TypeScript typecheck or lint execution performed in this task; passing source checks or Vercel preview build alone are insufficient.
- V2.1 lesson contract is not yet extended; no automatic lesson generator emits these blocks.
- State is not persisted across player unmount, refresh or device change; no new DB writes/migrations.
- No video handoff or full adaptive mastery integration yet.
- Current work is on an older safe branch. Integrating into newer Explanation V2 requires a selective, provenance-reviewed port, **not a merge from the Universal Tutor descendant**.
- No changes to TwoCards, CompactMathStepper, or production Supabase.
- The repo's Git integration may automatically create Vercel preview deployments on pushes; this is not a production promotion.

**Status:** draft MVP, not release-ready. Do not merge without tests and user approval.
