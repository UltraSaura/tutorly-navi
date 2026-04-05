

## Plan: Add French-Style Animated Long Division to CompactMathStepper

### What exists today
The `CompactMathStepper` component (used in the explanation panel for primary-level students) already has rich step-by-step animations for addition, subtraction, and multiplication. However, division (lines 859-910) is a bare-bones implementation that just reveals quotient digits progressively — no working numbers, no bracket, no French layout.

### What changes

**1 file modified**: `src/components/math/CompactMathStepper.tsx`

Replace the current `divisionData` rendering block (lines 859-910) and enhance the `divisionData` useMemo (lines 214-254) with a proper French long-division animation.

### French long division layout

```text
  618  │ 4
       │────
  -4   │ 154
   21  │
  -20  │
    18 │
   -16 │
     2 │  ← reste
```

Dividend on the left, divisor + bracket on the right, quotient appears progressively below the divisor line. Working numbers (subtract, remainder, bring-down) appear step by step on the left.

### Step generation changes (`divisionData` useMemo)

Replace the current decimal-focused division logic with integer long division that generates granular steps:

```typescript
interface DivisionPhase {
  type: 'inspect' | 'writeQuotient' | 'writeProduct' | 'writeRemainder' | 'bringDown';
  partialDividend: number;
  quotientDigit?: number;
  product?: number;
  remainder?: number;
  bringDownDigit?: string;
  quotientSoFar: string;
  workRows: Array<{ value: string; indent: number; type: 'subtract' | 'remainder' | 'partial' }>;
  explanationShort: string;
  explanationTeacher: string;
}
```

For 618 ÷ 4, this generates ~15 phases:
1. inspect "6" → 2. quotient "1" → 3. product "-4" → 4. remainder "2" → 5. bringDown "21" → 6. inspect "21" → 7. quotient "5" → 8. product "-20" → 9. remainder "1" → 10. bringDown "18" → 11. inspect "18" → 12. quotient "4" → 13. product "-16" → 14. remainder "2" → 15. complete

### Rendering changes (division block)

Replace lines 859-910 with a proper grid layout:
- **Right side**: vertical bar + divisor on top, horizontal line, quotient digits appearing progressively below
- **Left side**: dividend digits on top row, then working rows (products with minus sign, remainders, brought-down digits) appearing step by step with Framer Motion animations
- **Column highlight**: blue ring around the active digit being processed (same style as addition/subtraction)
- **Explanation line**: French text at the bottom, synchronized with the current phase

### Explanation panel (French, two modes)

Each phase includes both explanation strings:
- **Short**: "6 ÷ 4 = 1, reste 2"
- **Teacher**: "On regarde le chiffre 6. Combien de fois 4 entre dans 6 ? 1 fois car 4 × 1 = 4."

A small toggle (short/enseignant) below the grid switches between modes. Default: short.

### Animation details

- Working rows appear with `motion.div` fade-in + slide-down (same spring config as other operations)
- Quotient digits pop in with scale spring (matching multiplication style)
- Bring-down digit slides diagonally from dividend position
- Subtraction lines draw with opacity transition
- Active partial dividend highlighted with blue ring (same as column highlights in addition)

### Controls

No changes needed — the existing Prev/Next/Play/Reset controls already work generically via `currentStep` and `getMaxStep()`. The `divisionData.totalPhases` already feeds into `getMaxStep()` (line 91-93).

### Validation

- Divisor = 0: show error (already handled line 221)
- Non-integer inputs: round to integers for the animation, show decimal result at end
- Single-digit dividends: handled naturally (1 iteration)

### What stays the same
- The `shouldShowInteractiveStepper` gate in TwoCards.tsx (primary levels only)
- All addition/subtraction/multiplication animations
- Control buttons, auto-play logic, step counter display
- The overall component structure and props

