import { describe, expect, it } from 'vitest';
import { GRADUATED_NUMBER_LINE_ACTIVITIES } from './numberLineActivities';
import { createNumberLineTransfer, numberLineSupportStage } from './numberLineSupport';
import { formatNumberLineValue, initialNumberLinePositions, normalizedNumberLinePosition, numberLineValidPositions, parseNumberLineValue } from './numberLineUtils';
import type { GraduatedNumberLineConfiguration } from './numberLineTypes';

describe('number-line help escalation', () => {
  it('lets the first unsuccessful attempt remain independent and offers help after the second', () => {
    for (const attempts of [-1, 0, 1]) expect(numberLineSupportStage(attempts, false)).toBe('independent');
    for (const attempts of [2, 3, 20]) expect(numberLineSupportStage(attempts, false)).toBe('offer');
  });

  it('opens guided support only when explicitly requested, even before a mistake', () => {
    for (const attempts of [0, 1, 2, 20]) expect(numberLineSupportStage(attempts, true)).toBe('guided');
    expect(numberLineSupportStage(20, false)).not.toBe('guided');
  });
});

describe('fresh independent number-line task', () => {
  it.each(GRADUATED_NUMBER_LINE_ACTIVITIES)('changes targets while preserving scale geometry for $id', config => {
    const before = JSON.stringify(config);
    const transfer = createNumberLineTransfer(config);
    expect(transfer.id).toBe(`${config.id}:transfer`);
    expect(transfer.mode).toBe(config.mode);
    expect(transfer.validationMode).toBe(config.validationMode);
    expect(transfer.snapMode).toBe(config.snapMode);
    expect(transfer.line.end - transfer.line.start).toBe(config.line.end - config.line.start);
    expect(transfer.line.subdivisions).toBe(config.line.subdivisions);
    expect(transfer.line.start).toBeGreaterThan(config.line.start);
    transfer.items.forEach((item, index) => {
      const original = config.items[index];
      expect(item.id).toBe(`${original.id}:transfer`);
      expect(parseNumberLineValue(item.value)).not.toBe(parseNumberLineValue(original.value));
      expect(normalizedNumberLinePosition(item.value, transfer.line.start, transfer.line.end))
        .toBeCloseTo(normalizedNumberLinePosition(original.value, config.line.start, config.line.end)!);
      expect(item.tolerance).toBe(original.tolerance);
      expect(item.correctPosition).toBe(original.correctPosition);
      expect(item).not.toHaveProperty('acceptedAnswers');
      expect(item).not.toHaveProperty('initialPosition');
      expect(item).not.toHaveProperty('placed');
      if (config.mode === 'read_point_value') {
        expect(item.label).toBe(original.label);
        expect(item).not.toHaveProperty('displayValue');
      } else {
        expect(item.label).toBe(formatNumberLineValue(Number(item.value)));
        expect(item.displayValue).toBe(item.label);
      }
    });
    expect(createNumberLineTransfer(config)).toEqual(transfer);
    expect(JSON.stringify(config)).toBe(before);
    expect(transfer.skillTags).toEqual(config.skillTags);
    expect(transfer.skillTags).not.toBe(config.skillTags);
  });

  it('translates visible labels and uses fresh instructions without the old range', () => {
    const config: GraduatedNumberLineConfiguration = {
      ...GRADUATED_NUMBER_LINE_ACTIVITIES[1],
      instruction: 'Place labels from 0 to 2.',
      line: { start: 0, end: 2, subdivisions: 8, visibleLabels: [0, 1, 2] },
      items: [{ id: 'x', label: '5/4', displayValue: '5/4', value: '5/4', tolerance: 0.01, acceptedAnswers: ['1.25'], initialPosition: 0.75, placed: true }],
      validPositions: [0, 0.25, 0.5, 0.75, 1],
    };
    const transfer = createNumberLineTransfer(config);
    expect(transfer.line.visibleLabels).toEqual([2, 3, 4]);
    expect(transfer.items[0].value).toBe(3.25);
    expect(transfer.items[0].displayValue).toBe('3,25');
    expect(transfer.items[0].tolerance).toBe(0.01);
    expect(transfer.instruction).not.toContain('0 to 2');
    expect(transfer.validPositions).toEqual(config.validPositions);
    expect(transfer.validPositions).not.toBe(config.validPositions);
  });

  it('clears authored ordering placements so the ordinary shuffled initialization runs', () => {
    const source = GRADUATED_NUMBER_LINE_ACTIVITIES[3];
    const transfer = createNumberLineTransfer(source);
    const positions = initialNumberLinePositions(transfer.items, numberLineValidPositions(transfer.line.start, transfer.line.end, transfer.line.subdivisions));
    const numericOrder = [...transfer.items].sort((a, b) => Number(a.value) - Number(b.value));
    expect(positions[numericOrder[0].id]).toBeGreaterThan(positions[numericOrder[numericOrder.length - 1].id]);
    expect(transfer.items.every(item => item.initialPosition === undefined && item.placed === undefined)).toBe(true);
  });

  it('uses a positive whole offset for a fractional span and preserves its intervals', () => {
    const source: GraduatedNumberLineConfiguration = { ...GRADUATED_NUMBER_LINE_ACTIVITIES[0], line: { start: 0, end: 0.5, subdivisions: 4 }, items: [{ id: 'a', label: 'A', value: 0.25 }] };
    const transfer = createNumberLineTransfer(source);
    expect(transfer.line.start).toBe(1);
    expect(transfer.line.end).toBe(1.5);
    expect(transfer.items[0].value).toBe(1.25);
  });

  it('rejects an invalid scale or target rather than silently reusing a broken exercise', () => {
    const source = GRADUATED_NUMBER_LINE_ACTIVITIES[0];
    expect(() => createNumberLineTransfer({ ...source, line: { start: 1, end: 1, subdivisions: 4 } })).toThrow();
    expect(() => createNumberLineTransfer({ ...source, items: [{ id: 'x', label: 'X', value: '' }] })).toThrow();
  });
});
