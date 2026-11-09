import { describe, expect, it } from 'vitest';
import { compensationSubtraction } from './compensationSubtraction';

describe('French compensation subtraction', () => {
  it.each([
    [[3, 2, 5], [1, 4, 8], [[15, 8, 7], [12, 5, 7], [3, 2, 1]]],
    [[5, 2], [2, 7], [[12, 7, 5], [5, 3, 2]]],
    [[4, 0, 3], [1, 7, 8], [[13, 8, 5], [10, 8, 2], [4, 2, 2]]],
  ] as const)('produces true equations for %j − %j', (a, b, expected) => {
    expect(compensationSubtraction(a, b).map(({ top, bottom, diff }) => [top, bottom, diff])).toEqual(expected);
  });

  it('places the compensation on the next column to the left', () => {
    const steps = compensationSubtraction([3, 2, 5], [1, 4, 8]);
    expect(steps[0]).toMatchObject({ index: 2, borrowed: true, incoming: 0 });
    expect(steps[1]).toMatchObject({ index: 1, top: 12, bottom: 5, incoming: 1 });
  });
});
