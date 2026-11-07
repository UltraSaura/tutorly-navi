import { describe, expect, it } from 'vitest';
import { buildPlaceValueSolution } from './placeValueGrid';

describe('place-value grid contracts', () => {
  it.each([
    ['58 + 67', '125', 'addition', 'carry'],
    ['52 - 27', '25', 'subtraction', 'borrow'],
    ['403 - 178', '225', 'subtraction', 'regroup'],
    ['247 × 36', '8892', 'multiplication', 'partial-product'],
    ['864 ÷ 8', '108', 'division', 'bring-down'],
    ['125,6 + 8,75', '134,35', 'addition', 'carry'],
  ])('%s has explicit columns, result and semantic events', (expression, result, operation, eventKind) => {
    const solution = buildPlaceValueSolution(expression);
    expect(solution.result).toBe(result);
    expect(solution.operation).toBe(operation);
    expect(solution.columns.every((column) => Number.isInteger(column.exponent))).toBe(true);
    expect(solution.frames.some((frame) => frame.events.some((event) => event.kind === eventKind))).toBe(true);
    expect(solution.frames.filter((frame) => frame.events.some((event) => event.kind === eventKind)).every((frame) => frame.events.filter((event) => event.kind === eventKind).every((event) => event.sourceExponent !== undefined && event.destinationExponent !== undefined))).toBe(true);
    expect(solution.frames.every((frame) => frame.rows.every((row) => row.cells.every((cell) => Number.isInteger(cell.exponent))))).toBe(true);
  });

  it('keeps decimal digits in separate negative-exponent columns', () => {
    const solution = buildPlaceValueSolution('125,6 + 8,75');
    expect(solution.columns.map((column) => column.exponent)).toContain(-1);
    expect(solution.columns.map((column) => column.exponent)).toContain(-2);
  });
});
