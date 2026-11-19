export function numberLineTickValues(min: number, max: number, step: number, maxTicks = 41): number[] {
  if (![min, max, step].every(Number.isFinite) || step <= 0 || max < min) return [];
  const count = Math.floor((max - min) / step + 1e-9);
  if (count + 1 > maxTicks) return [];
  return Array.from({ length: count + 1 }, (_, index) => Number((min + index * step).toFixed(10)));
}
