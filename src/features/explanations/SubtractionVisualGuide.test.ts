import { describe, expect, it } from 'vitest';
import { buildSubtractionVisual } from './subtractionVisualModel';

describe('SubtractionVisualGuide', () => {
  it('shows the active units and compensation before the response without revealing the result', () => {
    const visual = buildSubtractionVisual({ step: 9, completedSteps: [] });
    expect(visual).toMatchObject({ operation: '326 − 157', upper: ['3', '2', '16'], lower: ['1', '5', '7'], result: ['', '', ''], activeColumn: 'units' });
    expect(visual.compensation).toContain('+10 en haut');
  });
  it('reveals completed digits while highlighting the next column', () => {
    const visual = buildSubtractionVisual({ step: 10, completedSteps: [9] });
    expect(visual.upper).toEqual(['3', '12', '16']);
    expect(visual.lower).toEqual(['1', '6', '7']);
    expect(visual.result).toEqual(['', '', '9']);
    expect(visual.activeColumn).toBe('tens');
  });
  it('keeps the first worked operation aligned and reveals only completed column results', () => {
    const visual = buildSubtractionVisual({ step: 5, completedSteps: [3] });
    expect(visual.upper).toEqual(['3', '12', '15']);
    expect(visual.lower).toEqual(['1', '5', '8']);
    expect(visual.result).toEqual(['', '', '7']);
    expect(visual.activeColumn).toBe('tens');
  });
});
