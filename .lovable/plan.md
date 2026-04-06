

## Plan: Fix Read Aloud Button — Ensure Compact Inline Layout

### Problem
The screenshot shows the old "Read Again" button with visible text and "Auto-read" toggle still rendering in a centered block layout. The current code in `MathExplanationReader.tsx` is already the compact inline version, but the preview may be stale. To ensure the fix takes effect, I'll verify and clean up both files.

### Changes

**`src/components/math/MathExplanationReader.tsx`** — Already correct (inline `<span>` with icon-only buttons). No changes needed here.

**`src/components/math/CompactMathStepper.tsx`** — At each of the 5 explanation panels, the `MathExplanationReader` sits inside a `flex items-start justify-center` container alongside a `<span>`. This is correct. However, the wrapping `<div className="mt-3">` adds unnecessary vertical separation. I'll tighten the integration:

1. Remove the extra wrapper `<div className="mt-3">` around explanation panels — merge the margin into the `motion.div` directly
2. Ensure all 5 insertion points use consistent `inline` wrapping so the small icon sits right after the text, not on its own line
3. Force a clean rebuild by touching the file

### Files affected
| File | Change |
|------|--------|
| `src/components/math/CompactMathStepper.tsx` | Tighten explanation wrapper divs at all 5 insertion points |

