import { describe, expect, it } from 'vitest';
import { buildPlaceValueSolution } from './placeValueGrid';

describe('place-value grid contracts', () => {
  it.each([
    ['58 + 67', '125', 'addition', 'carry'],
    ['52 - 27', '25', 'subtraction', 'borrow'],
    ['403 - 178', '225', 'subtraction', 'regroup'],
    ['247 × 36', '8892', 'multiplication', 'partial-product'],
    ['864 ÷ 8', '108', 'division', 'bring-down'],
    ['907 ÷ 4', '226 reste 3', 'division', 'partial-subtraction'],
    ['1005 ÷ 5', '201', 'division', 'quotient-digit'],
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

  it('keeps a French division potence and quotient zeros across frames', () => {
    const solution = buildPlaceValueSolution('1005 ÷ 5');
    expect(solution.layout).toBe('long-division');
    expect(solution.frames.every((frame) => frame.layout === 'long-division')).toBe(true);
    expect(solution.frames.some((frame) => frame.events.some((event) => event.kind === 'quotient-digit' && event.value === '0'))).toBe(true);
    expect(solution.frames.some((frame) => frame.rows.some((row) => row.id.startsWith('subtraction-')))).toBe(true);
  });

  it('shows the exchanged ten directly for 52 − 27', () => {
    const solution = buildPlaceValueSolution('52 - 27');
    const regroup = solution.frames.find((frame) => frame.id === 'column-0');
    expect(regroup).toBeDefined();
    const annotations = regroup!.rows.flatMap((row) => row.cells.filter((cell) => cell.kind === 'annotation'));
    expect(annotations).toEqual(expect.arrayContaining([
      expect.objectContaining({ exponent: 1, text: '5', annotationType: 'crossed-out' }),
      expect.objectContaining({ exponent: 1, text: '4', annotationType: 'replacement' }),
      expect.objectContaining({ exponent: 0, text: '2', annotationType: 'crossed-out' }),
      expect.objectContaining({ exponent: 0, text: '12', annotationType: 'replacement' }),
    ]));
  });

  it('shows the zero-crossing regrouping chain for 403 − 178', () => {
    const solution = buildPlaceValueSolution('403 - 178');
    const regroup = solution.frames.find((frame) => frame.id === 'column-0');
    const annotations = regroup!.rows.flatMap((row) => row.cells.filter((cell) => cell.kind === 'annotation'));
    expect(annotations).toEqual(expect.arrayContaining([
      expect.objectContaining({ exponent: 2, text: '4', annotationType: 'crossed-out' }),
      expect.objectContaining({ exponent: 2, text: '3', annotationType: 'replacement' }),
      expect.objectContaining({ exponent: 1, text: '0', annotationType: 'crossed-out' }),
      expect.objectContaining({ exponent: 1, text: '9', annotationType: 'replacement' }),
      expect.objectContaining({ exponent: 0, text: '3', annotationType: 'crossed-out' }),
      expect.objectContaining({ exponent: 0, text: '13', annotationType: 'replacement' }),
    ]));
  });

  it('renders a carry as a positioned annotation for 58 + 67', () => {
    const solution = buildPlaceValueSolution('58 + 67');
    const carry = solution.frames.flatMap((frame) => frame.rows.flatMap((row) => row.cells)).find((cell) => cell.annotationType === 'carry');
    expect(carry).toMatchObject({ exponent: 1, text: '1', kind: 'annotation' });
  });
});
