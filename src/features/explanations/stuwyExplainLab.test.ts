import { describe, expect, it } from 'vitest';
import { buildLabSolution } from './stuwyExplainLab';

const request = { expression: '325 - 148', grade: 'CM2', objective: 'Poser et effectuer une soustraction', method: 'Calcul posé français', depth: 'guided' as const };

describe('Stuwy Explain Lab solver contract', () => {
  it('returns verified steps without a provider call', () => {
    const solution = buildLabSolution(request);
    expect(solution.result).toBe(177);
    expect(solution.steps.length).toBeGreaterThan(1);
    expect(solution.checks.every((check) => check.passed)).toBe(true);
  });
  it('keeps remediation guidance separate from correctness', () => {
    const solution = buildLabSolution({ ...request, depth: 'remediation' });
    expect(solution.checks.every((check) => check.passed)).toBe(true);
    expect(solution.pedagogicalNotes.at(-1)).toContain('prérequis');
  });
  it('separates the French operation, explanation and visual animation guidance', () => {
    const solution = buildLabSolution(request);
    expect(solution.pedagogicalNotes).toEqual(expect.arrayContaining([
      expect.stringContaining('Opération : soustraction'),
      expect.stringContaining('Explication :'),
      expect.stringContaining('Animation visuelle :'),
    ]));
    expect(solution.grid.frames.find((frame) => frame.id === 'column-0')?.explanation).toContain('échange');
  });
  it('rejects unsupported input instead of fabricating steps', () => {
    expect(() => buildLabSolution({ ...request, expression: 'bonjour' })).toThrow();
  });
});
