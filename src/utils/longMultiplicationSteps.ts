// Long-multiplication steps with exact digit-count formula (base 10).
// Works with BigInt and returns UI-ready step objects.

export type StepKind = "partial" | "final";

export interface MultiplicationStep {
  kind: StepKind;
  // column index of the multiplier digit (units = 0)
  index: number;                 // -1 for final
  multiplierDigit: number | null; // null for final
  shift: number;                  // how many zeros appended (i)
  partialUnshifted: string;       // A * b_i  (no zeros added yet)
  partialShifted: string;         // (A * b_i) * 10^i
  digitsCount: number;            // D(A * b_i) + i   or   D(A * B) for final
}

export interface MultiplicationPlan {
  a: string;              // sanitized decimal string
  b: string;              // sanitized decimal string
  steps: MultiplicationStep[];
  totalDigits: number;    // Σ (D(A·b_i)+i) + D(A·B)
}

/** D(x) = number of base-10 digits, with D(0) = 1 */
function digitsCountBase10(n: bigint): number {
  if (n === 0n) return 1;
  // Strip sign
  if (n < 0n) n = -n;
  return n.toString(10).length;
}

/** Sanitize to integer BigInt (no decimals). Throws on invalid. */
function toBigIntStrict(x: string | number | bigint): bigint {
  if (typeof x === "bigint") return x;
  if (typeof x === "number") {
    if (!Number.isFinite(x) || !Number.isInteger(x)) {
      throw new Error("Only finite integers are supported. Use scaling for decimals.");
    }
    return BigInt(x);
  }
  const s = (x || "").trim();
  if (!/^[+-]?\d+$/.test(s)) throw new Error(`Invalid integer: "${x}"`);
  return BigInt(s);
}

/** Split digits of a non-negative BigInt in least-significant-first order. */
function lsfDigits(n: bigint): number[] {
  const s = n.toString(10);
  const arr: number[] = [];
  for (let i = s.length - 1; i >= 0; i--) arr.push(s.charCodeAt(i) - 48);
  return arr;
}

/**
 * Build the long-multiplication steps per the exact formula.
 * NOTE: For decimals, scale both inputs to integers first, or extend this to track decimal places.
 */
export function buildMultiplicationPlan(A: string | number | bigint, B: string | number | bigint): MultiplicationPlan {
  // Keep original text for UI
  const aBI = toBigIntStrict(A);
  const bBI = toBigIntStrict(B);

  const absA = aBI < 0n ? -aBI : aBI;
  const absB = bBI < 0n ? -bBI : bBI;

  // Edge: if either is 0, there's exactly one partial line "0" plus final "0"
  const bDigits = lsfDigits(absB); // b_i (units first)
  const steps: MultiplicationStep[] = [];
  let runningTotalDigits = 0;

  for (let i = 0; i < bDigits.length; i++) {
    const bi = bDigits[i];                // 0..9
    const unshifted = absA * BigInt(bi);  // A * b_i
    const D_unshifted = digitsCountBase10(unshifted);
    const lineDigits = D_unshifted + i;   // D(A*bi) + i
    runningTotalDigits += lineDigits;

    const partialUnshifted = unshifted.toString(10);
    const partialShifted = (unshifted === 0n)
      ? "0"                               // by convention, a single "0" line (even when shifted)
      : partialUnshifted + "0".repeat(i); // shift i

    steps.push({
      kind: "partial",
      index: i,
      multiplierDigit: bi,
      shift: i,
      partialUnshifted,
      partialShifted,
      digitsCount: lineDigits,
    });
  }

  const finalProduct = (absA * absB);
  const D_final = digitsCountBase10(finalProduct);
  runningTotalDigits += D_final;

  steps.push({
    kind: "final",
    index: -1,
    multiplierDigit: null,
    shift: 0,
    partialUnshifted: finalProduct.toString(10),
    partialShifted: finalProduct.toString(10),
    digitsCount: D_final,
  });

  return {
    a: absA.toString(10),
    b: absB.toString(10),
    steps,
    totalDigits: runningTotalDigits,
  };
}

/**
 * Convenience: get only the first `maxSteps` (for UI pagination).
 * If maxSteps >= steps.length, you get all steps.
 */
export function limitedSteps(plan: MultiplicationPlan, maxSteps: number): MultiplicationPlan {
  const capped = Math.max(0, Math.min(maxSteps, plan.steps.length));
  return {
    ...plan,
    steps: plan.steps.slice(0, capped),
  };
}

/** Example pretty-printer (optional). */
export function formatPlan(plan: MultiplicationPlan): string {
  const head = `A=${plan.a}, B=${plan.b}\nTotal digits (formula) = ${plan.totalDigits}\n`;
  const lines = plan.steps.map(s =>
    s.kind === "partial"
      ? `partial i=${s.index} (b_i=${s.multiplierDigit}) -> ${s.partialShifted}  [D=${s.digitsCount}]`
      : `final -> ${s.partialShifted}  [D=${s.digitsCount}]`
  );
  return head + lines.join("\n");
}


