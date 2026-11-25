import { describe, expect, it } from 'vitest';
import { equationSteps, type EquationCoefficients } from './equationSolver';
import { equationTermVisual } from './equationTermVisual';

describe('IM-D02.1 term-by-term cancellation storyboard', () => {
  it('shows +5 and −5 disappearing from the left of 3x + 5 = 20', () => {
    const [subtract, divide, verify] = equationSteps({ a: 3, b: 5, c: 20 });
    const visual = equationTermVisual(subtract);
    expect(visual.cancellationSide).toBe('left');
    expect(visual.cancellationValues).toEqual([5, -5]);
    expect(visual.left.filter(t => t.role === 'cancel').map(t => t.text)).toEqual(['+ 5', '− 5']);
    expect(visual.left.find(t => t.key === 'left-x')?.text).toBe('3x');
    expect(visual.right.filter(t => t.role === 'combine').map(t => t.text)).toEqual(['20', '− 5']);
    expect(visual.caption).toContain('font 0 à gauche');
    const division = equationTermVisual(divide);
    expect(division.left.filter(t => t.role === 'cancel').map(t => t.text)).toEqual(['3', '÷ (3)']);
    expect(division.caption).toContain('15 ÷ (3) = 5');
    expect(equationTermVisual(verify).cancellationSide).toBe('none');
    expect(equationTermVisual(verify).left[0].text).toContain('3 × (5)');
  });

  it('shows opposite variable terms disappearing on the right of 5x − 4 = 2x + 8', () => {
    const [subtract] = equationSteps({ a: 5, b: -4, d: 2, c: 8 });
    const visual = equationTermVisual(subtract);
    expect(visual.cancellationSide).toBe('right');
    expect(visual.cancellationValues).toEqual([2, -2]);
    expect(visual.right.filter(t => t.role === 'cancel').map(t => t.text)).toEqual(['2x', '− 2x']);
    expect(visual.left.filter(t => t.role === 'combine').map(t => t.text)).toEqual(['5x', '− 2x']);
    expect(visual.left.find(t => t.key === 'left-constant')?.text).toBe('− 4');
  });

  it('handles negative coefficients and constants without inventing sign flips', () => {
    const [subtract, divide] = equationSteps({ a: -2, b: 3, c: 8 });
    expect(equationTermVisual(subtract).cancellationValues).toEqual([3, -3]);
    expect(equationTermVisual(divide).left.filter(t => t.role === 'cancel').map(t => t.text)).toEqual(['-2', '÷ (-2)']);
    expect(equationTermVisual(divide).caption).toContain('-5/2');
    const variableStep = equationSteps({ a: 2, b: -5, d: -1, c: 1 })[0];
    const variableVisual = equationTermVisual(variableStep);
    expect(variableVisual.cancellationValues).toEqual([-1, 1]);
    expect(variableVisual.right.filter(t => t.role === 'cancel').map(t => t.text)).toEqual(['−x', '+ x']);
  });

  it('does not invent a zero-x term when the left member is a constant', () => {
    const [step] = equationSteps({ a: 0, b: 5, d: 2, c: 9 });
    const visual = equationTermVisual(step);
    expect(visual.left.map(t => t.text)).toEqual(['5', '− 2x']);
    expect(visual.left.some(t => t.text === '0x')).toBe(false);
  });

  it('displays exact substitution on both sides for a fractional answer', () => {
    const steps = equationSteps({ a: -2, b: 3, c: 8 });
    const verification = equationTermVisual(steps[steps.length - 1]);
    expect(verification.left[0].text).toBe('-2 × (-5/2)');
    expect(verification.right[0].text).toBe('8');
    expect(verification.caption).toContain('-5/2');
  });

  it('never invents a non-inverse cancellation across a broad bounded grid', () => {
    let checked = 0;
    for (let a = -8; a <= 8; a += 2) for (let d = -8; d <= 8; d += 3) {
      if (a === d) continue;
      for (let b = -20; b <= 20; b += 7) for (let c = -20; c <= 20; c += 9) {
        const input: EquationCoefficients = { a, b, c, d };
        for (const step of equationSteps(input)) {
          const visual = equationTermVisual(step);
          if (step.id === 'subtract-constant' || step.id === 'subtract-variable') {
            expect(visual.cancellationValues).not.toBeNull();
            expect(visual.cancellationValues![0] + visual.cancellationValues![1]).toBe(0);
            const canceled = (visual.cancellationSide === 'left' ? visual.left : visual.right).filter(t => t.role === 'cancel');
            expect(canceled).toHaveLength(2);
          } else expect(visual.cancellationValues).toBeNull();
          if (step.id === 'verify') expect(visual.cancellationSide).toBe('none');
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(2500);
  });
});
