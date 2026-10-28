import { describe, expect, it } from 'vitest';
import { equivalentNumberLineValues, initialNumberLinePositions, normalizedNumberLinePosition, numberLineValidPositions, parseNumberLineValue, snapNumberLinePosition, sortNumberLineValues, validateNumberLinePlacement } from './numberLineUtils';

describe('graduated number line values', () => {
  it('parses fractions and French decimals', () => {
    expect(parseNumberLineValue('1/2')).toBe(0.5);
    expect(parseNumberLineValue('5/4')).toBe(1.25);
    expect(parseNumberLineValue('0,5')).toBe(0.5);
    expect(parseNumberLineValue('1.25')).toBe(1.25);
  });
  it('accepts equivalent fraction and decimal answers', () => {
    expect(equivalentNumberLineValues('1/2', '0,5')).toBe(true);
    expect(equivalentNumberLineValues('3/4', '0.75')).toBe(true);
    expect(equivalentNumberLineValues('5/4', '1,25')).toBe(true);
  });
  it('computes normalized positions and placement tolerance', () => {
    expect(normalizedNumberLinePosition('1/2', 0, 1)).toBe(0.5);
    expect(normalizedNumberLinePosition('1/4', 0, 1)).toBe(0.25);
    expect(normalizedNumberLinePosition(1, 0, 2)).toBe(0.5);
    expect(normalizedNumberLinePosition('5/4', 0, 2)).toBe(0.625);
    expect(validateNumberLinePlacement('3/4', 0.76, 0, 1)).toBe(true);
  });
  it('sorts mixed representations numerically', () => {
    const values = sortNumberLineValues(['1/2', '0,25', '3/4', '1'], (value) => value);
    expect(values).toEqual(['0,25', '1/2', '3/4', '1']);
  });
  it('snaps to the nearest tick without accepting a neighboring tick as correct', () => {
    const positions = numberLineValidPositions(0, 1, 4);
    expect(snapNumberLinePosition(0.74, positions)).toBe(0.75);
    expect(validateNumberLinePlacement('1/2', 0.75, 0, 1, 0.08)).toBe(false);
  });
  it('creates a deterministic wrong starting order for reorder activities', () => {
    const positions = initialNumberLinePositions([
      { id: 'quarter', value: '1/4' },
      { id: 'half', value: '1/2' },
      { id: 'three-quarter', value: '3/4' },
    ], numberLineValidPositions(0, 1, 4));
    expect(positions).toEqual({ quarter: 0.5, half: 0.25, 'three-quarter': 0 });
    expect(positions.quarter).not.toBe(0.25);
  });
});
