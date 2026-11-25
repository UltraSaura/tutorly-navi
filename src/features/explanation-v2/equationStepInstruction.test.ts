import { describe, expect, it } from 'vitest';
import { equationSteps } from './equationSolver';
import { equationStepInstruction } from './equationStepInstruction';

describe('IM-D02.3 visible step instructions', () => {
  it('explains what to do, what is happening and the result without opening Why', () => {
    const steps = equationSteps({ a: 3, b: 5, c: 20 });
    expect(steps.map(s => s.id)).toEqual(['subtract-constant', 'divide', 'verify']);
    const [subtract, divide, verify] = steps;
    expect(equationStepInstruction(subtract, 0).text).toBe('Pour isoler le terme en x, on va soustraire 5 aux deux membres.');
    expect(equationStepInstruction(subtract, 1).text).toBe('On soustrait 5 à gauche ET à droite pour conserver l’égalité.');
    expect(equationStepInstruction(subtract, 2).text).toBe('Les nombres opposés s’annulent à gauche. À droite, 20 − 5 = 15.');
    expect(equationStepInstruction(divide, 1).text).toContain('par 3');
    expect(equationStepInstruction(divide, 2).text).toContain('x = 5');
    expect(equationStepInstruction(verify, 0).text).toContain('remplacer x par 5');
    expect(equationStepInstruction(verify, 1).text).toContain('On remplace chaque x par 5');
    expect(equationStepInstruction(verify, 2).text).toContain('20 = 20');
  });

  it('uses adding rather than subtracting for a negative constant', () => {
    const steps = equationSteps({ a: 2, b: -4, c: 10 });
    expect(equationStepInstruction(steps[0], 0).text).toContain('ajouter 4 aux deux membres');
    expect(equationStepInstruction(steps[0], 1).text).toContain('On ajoute 4');
    expect(equationStepInstruction(steps[0], 2).text).toContain('10 + 4 = 14');
  });

  it('shows inverse variable operation for both signs and never tells students to move x', () => {
    const positive = equationSteps({ a: 5, b: -4, d: 2, c: 8 })[0];
    const negative = equationSteps({ a: 2, b: 3, d: -1, c: 7 })[0];
    expect(equationStepInstruction(positive, 0).text).toContain('soustraire 2x');
    expect(equationStepInstruction(positive, 1).text).toContain('On soustrait 2x');
    expect(equationStepInstruction(negative, 0).text).toContain('ajouter x');
    expect(equationStepInstruction(negative, 1).text).toContain('On ajoute x');
    expect(equationStepInstruction(positive, 2).text).toContain('s’annulent');
  });

  it('explains negative division and exact fractional verification', () => {
    const steps = equationSteps({ a: -2, b: 3, c: 8 });
    const divide = steps.find(s => s.id === 'divide')!;
    const verify = steps.find(s => s.id === 'verify')!;
    expect(equationStepInstruction(divide, 0).text).toContain('par (-2)');
    expect(equationStepInstruction(divide, 2).text).toContain('x = -5/2');
    expect(equationStepInstruction(verify, 1).text).toContain('-5/2');
    expect(equationStepInstruction(verify, 2).text).toContain('8 = 8');
  });

  it('keeps all three labels distinct and never shows a mathematical instruction empty', () => {
    const cases = [
      { a: 3, b: 5, c: 20 },
      { a: 5, b: -4, c: 8, d: 2 },
      { a: -2, b: 3, c: 8 },
      { a: 0, b: 5, c: 9, d: 2 },
      { a: 1, b: 0, c: 4 },
    ];
    for (const input of cases) for (const step of equationSteps(input)) {
      const stages = [0, 1, 2] as const;
      const labels = stages.map(stage => equationStepInstruction(step, stage).label);
      expect(new Set(labels).size).toBe(3);
      for (const stage of stages) {
        const text = equationStepInstruction(step, stage).text;
        expect(text.length).toBeGreaterThan(24);
        expect(text).not.toContain('undefined');
        expect(text).not.toContain('NaN');
      }
    }
  });
});
