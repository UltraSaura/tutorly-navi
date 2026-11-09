/** Equal additions preserve a difference: +10 here, +1 below to the left. */
export function compensationSubtraction(a: readonly number[], b: readonly number[]) {
  if (a.length !== b.length || !a.length || [...a, ...b].some(n => !Number.isInteger(n) || n < 0 || n > 9)) {
    throw new Error('Expected aligned decimal digits');
  }
  if (BigInt(a.join('')) < BigInt(b.join(''))) throw new Error('Expected nonnegative magnitude');
  const steps: { index: number; top: number; bottom: number; borrowed: boolean; diff: number; incoming: number }[] = [];
  let incoming = 0;
  for (let index = a.length - 1; index >= 0; index--) {
    const bottom = b[index] + incoming;
    const borrowed = a[index] < bottom;
    const top = a[index] + (borrowed ? 10 : 0);
    steps.push({ index, top, bottom, borrowed, diff: top - bottom, incoming });
    incoming = borrowed ? 1 : 0;
  }
  return steps;
}
