export function parseNumberLineValue(input: unknown): number | null {
  if (typeof input === 'number') return Number.isFinite(input) ? input : null;
  if (typeof input !== 'string') return null;
  const value = input.trim().replace(',', '.');
  const fraction = value.match(/^([+-]?\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (fraction) { const denominator = Number(fraction[2]); return denominator === 0 ? null : Number(fraction[1]) / denominator; }
  const mixed = value.match(/^([+-]?\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) { const whole = Number(mixed[1]); const denominator = Number(mixed[3]); return denominator === 0 ? null : whole + (whole < 0 ? -1 : 1) * Number(mixed[2]) / denominator; }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
export function equivalentNumberLineValues(left: unknown, right: unknown, tolerance = 1e-9): boolean { const a = parseNumberLineValue(left); const b = parseNumberLineValue(right); return a !== null && b !== null && Math.abs(a - b) <= tolerance; }
export function normalizedNumberLinePosition(value: unknown, start: number, end: number): number | null { const numeric = parseNumberLineValue(value); return numeric === null || end <= start ? null : (numeric - start) / (end - start); }
export function validateNumberLinePlacement(value: unknown, position: number, start: number, end: number, tolerance = 0.08): boolean { const expected = normalizedNumberLinePosition(value, start, end); return expected !== null && Math.abs(expected - position) <= tolerance; }
export function sortNumberLineValues<T>(items: T[], valueOf: (item: T) => unknown): T[] { return [...items].sort((a, b) => (parseNumberLineValue(valueOf(a)) ?? Infinity) - (parseNumberLineValue(valueOf(b)) ?? Infinity)); }
export function numberLineTickValues(start: number, end: number, subdivisions: number): number[] { const count = Math.max(1, Math.round(subdivisions)); return Array.from({ length: count + 1 }, (_, index) => start + ((end - start) * index) / count); }
export function numberLineValidPositions(start: number, end: number, subdivisions: number, validPositions?: number[]): number[] {
  if (validPositions?.length) return validPositions.filter((position) => position >= 0 && position <= 1).sort((a, b) => a - b);
  return numberLineTickValues(start, end, subdivisions).map((value) => normalizedNumberLinePosition(value, start, end) ?? 0);
}
export function snapNumberLinePosition(position: number, validPositions: number[]): number {
  if (!validPositions.length) return Math.max(0, Math.min(1, position));
  return validPositions.reduce((closest, candidate) => Math.abs(candidate - position) < Math.abs(closest - position) ? candidate : closest, validPositions[0]);
}
export function formatNumberLineValue(value: number): string { return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6))).replace('.', ','); }
