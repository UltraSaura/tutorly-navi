import { describe, expect, it } from 'vitest';
import { evaluateNumberLineItems, numberLineMethodHint } from './numberLineFeedback';
import type { GraduatedNumberLineConfiguration } from './numberLineTypes';

const base: GraduatedNumberLineConfiguration = {
  id: 'line', mode: 'place_value', title: 'Place a value', instruction: 'Place the label.',
  line: { start: 0, end: 1, subdivisions: 4 }, items: [{ id: 'a', label: 'A', value: '1/2' }], skillTags: [],
};
const results = (config: GraduatedNumberLineConfiguration, placements: Record<string, number> = {}, answers: Record<string, string> = {}) => evaluateNumberLineItems(config, answers, placements).map(item => item.correct);

describe('number-line reading evaluation', () => {
  const read = { ...base, mode: 'read_point_value' as const, items: [{ id: 'a', label: 'A', value: 0 }] };
  it('rejects a missing, empty or whitespace answer even when the target is zero', () => {
    expect(results(read)).toEqual([false]);
    expect(results(read, {}, { a: '' })).toEqual([false]);
    expect(results(read, {}, { a: '   ' })).toEqual([false]);
    expect(results(read, {}, { a: '0' })).toEqual([true]);
    expect(results({ ...read, items: [{ id: 'a', label: 'A', value: '' }] }, {}, { a: '0' })).toEqual([false]);
  });
  it('accepts equivalent numeric forms and explicitly authored aliases', () => {
    const half = { ...read, items: [{ id: 'a', label: 'A', value: '1/2', acceptedAnswers: ['un demi'] }] };
    for (const answer of ['2/4', '0,5', '0.5', ' Un Demi ']) expect(results(half, {}, { a: answer })).toEqual([true]);
    for (const answer of ['0.6', 'demi', '1/0']) expect(results(half, {}, { a: answer })).toEqual([false]);
  });
});

describe('number-line exact placement', () => {
  it('rejects missing, nonfinite and out-of-range placements', () => {
    for (const placement of [{}, { a: NaN }, { a: Infinity }, { a: -0.1 }, { a: 1.1 }]) expect(results(base, placement)).toEqual([false]);
  });
  it('accepts both boundaries and preserves the ordinary default tolerance', () => {
    expect(results({ ...base, items: [{ id: 'a', label: 'A', value: 0 }] }, { a: 0 })).toEqual([true]);
    expect(results({ ...base, items: [{ id: 'a', label: 'A', value: 1 }] }, { a: 1 })).toEqual([true]);
    expect(results(base, { a: 0.57 })).toEqual([true]);
    expect(results(base, { a: 0.59 })).toEqual([false]);
  });
  it('does not accept a neighboring snapped tick on a dense scale', () => {
    const dense = { ...base, line: { start: 0, end: 1, subdivisions: 100 }, snapMode: 'tick' as const };
    expect(results(dense, { a: 0.5 })).toEqual([true]);
    expect(results(dense, { a: 0.51 })).toEqual([false]);
    expect(results(dense, { a: 0.49 })).toEqual([false]);
    expect(results({ ...dense, snapMode: 'free' }, { a: 0.51 })).toEqual([true]);
  });
  it('uses explicit valid positions to cap default tolerance and honors authored tolerance', () => {
    const custom = { ...base, validPositions: [0, 0.49, 0.5, 0.51, 1] };
    expect(results(custom, { a: 0.51 })).toEqual([false]);
    expect(results({ ...custom, items: [{ ...base.items[0], tolerance: 0.02 }] }, { a: 0.51 })).toEqual([true]);
    expect(results({ ...custom, items: [{ ...base.items[0], tolerance: 0 }] }, { a: 0.5 })).toEqual([true]);
    expect(results({ ...custom, items: [{ ...base.items[0], tolerance: 0 }] }, { a: 0.5001 })).toEqual([false]);
  });
  it('rejects invalid line geometry and expected values outside the line', () => {
    expect(results({ ...base, line: { start: 1, end: 1, subdivisions: 4 } }, { a: 0.5 })).toEqual([false]);
    expect(results({ ...base, items: [{ ...base.items[0], value: 2 }] }, { a: 1 })).toEqual([false]);
    expect(results({ ...base, items: [{ ...base.items[0], value: '' }] }, { a: 0 })).toEqual([false]);
  });
});

describe('relative ordering', () => {
  const order: GraduatedNumberLineConfiguration = { ...base, mode: 'order_values', validationMode: 'relative_order', items: [
    { id: 'a', label: 'A', value: '1/4' }, { id: 'b', label: 'B', value: '1/2' }, { id: 'c', label: 'C', value: '3/4' },
  ] };
  it('checks value ordering independently of exact positions and input array order', () => {
    expect(results(order, { a: 0.1, b: 0.3, c: 0.9 })).toEqual([true, true, true]);
    expect(results(order, { a: 0.1, b: 0.9, c: 0.3 })).toEqual([true, false, false]);
    expect(results({ ...order, items: [...order.items].reverse() }, { a: 0.1, b: 0.3, c: 0.9 })).toEqual([true, true, true]);
  });
  it('cannot manufacture a correct ordering from missing, tied or invalid positions', () => {
    for (const placements of [{}, { a: 0.1, b: 0.3 }, { a: 0.1, b: 0.3, c: NaN }, { a: 0.1, b: 0.3, c: Infinity }, { a: -0.1, b: 0.3, c: 0.9 }, { a: 0.1, b: 0.3, c: 1.1 }, { a: 0.1, b: 0.1, c: 0.9 }]) {
      expect(results(order, placements)).toEqual([false, false, false]);
    }
  });
  it('accepts equivalent numeric values in either order while rejecting tied physical positions', () => {
    const equal = { ...order, items: [{ id: 'a', label: 'A', value: '1/2' }, { id: 'b', label: 'B', value: '0,5' }, { id: 'c', label: 'C', value: 1 }] };
    expect(results(equal, { a: 0.1, b: 0.3, c: 0.9 })).toEqual([true, true, true]);
    expect(results(equal, { a: 0.3, b: 0.1, c: 0.9 })).toEqual([true, true, true]);
    expect(results(equal, { a: 0.1, b: 0.1, c: 0.9 })).toEqual([false, false, false]);
  });
});

describe('method-only number-line hints', () => {
  it.each(['read_point_value', 'place_value', 'order_values'] as const)('explains %s without target values or computed destinations', mode => {
    const config = { ...base, mode, items: [{ id: 'target-47', label: 'Secret label', value: '47/89' }] };
    const french = numberLineMethodHint(config);
    const english = numberLineMethodHint(config, 'en');
    for (const hint of [french, english]) {
      expect(hint).not.toMatch(/\d/);
      expect(hint).not.toContain('Secret label');
      expect(hint).not.toContain('target-47');
    }
    expect(french).toContain('intervalles');
    expect(french).toContain('dénominateur');
    expect(english).toContain('intervals');
    expect(english).toContain('denominator');
  });
});
