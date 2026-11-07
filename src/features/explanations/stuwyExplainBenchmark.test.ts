import { describe, expect, it } from 'vitest';
import { buildLabSolution } from './stuwyExplainLab';
import { STUWY_EXPLAIN_BENCHMARK } from './stuwyExplainBenchmark';

describe('Stuwy Explanation Lab reproducible benchmark', () => {
  it('contains exactly 30 exercises across the requested grades and domains', () => {
    expect(STUWY_EXPLAIN_BENCHMARK).toHaveLength(30);
    expect(new Set(STUWY_EXPLAIN_BENCHMARK.map((item) => item.grade))).toEqual(new Set(['CE2', 'CM1', 'CM2', '6e']));
    expect(new Set(STUWY_EXPLAIN_BENCHMARK.map((item) => item.category))).toEqual(new Set(['arithmetic', 'decimals', 'fractions', 'geometry', 'word-problem']));
    expect(STUWY_EXPLAIN_BENCHMARK.every((item) => item.auditTrail.length > 0)).toBe(true);
  });

  it('keeps the Cycle 5 corrections explicit and mathematically checkable', () => {
    const perimeter = STUWY_EXPLAIN_BENCHMARK.find((item) => item.id === 'CE2-G01')!;
    const proportion = STUWY_EXPLAIN_BENCHMARK.find((item) => item.id === 'CM2-W01')!;
    expect(perimeter.problem).toContain('longueur et 4 cm de largeur');
    expect(perimeter.auditTrail[0]).toContain('Cycle 5 correction');
    expect(proportion.problem).toContain('cahiers identiques');
    expect(proportion.expectedResult).toBe('21 €');
    expect(proportion.auditTrail[1]).toContain('12 ÷ 4 × 7 = 21');
  });

  it('verifies every supported generated result and rejects unsupported types explicitly', () => {
    for (const exercise of STUWY_EXPLAIN_BENCHMARK) {
      if (exercise.supportedStatus === 'unsupported') {
        expect(exercise.expression).toBeUndefined();
        expect(exercise.mathematicalVerification).toContain('NOT APPLICABLE');
        continue;
      }
      const solution = buildLabSolution({ expression: exercise.expression!, grade: exercise.grade, objective: exercise.objective, method: exercise.expectedMethod });
      if (exercise.expectedResult.includes('reste')) {
        expect(solution.grid.result).toBe(exercise.expectedResult);
      } else {
        expect(Number(String(solution.result).replace(',', '.'))).toBe(Number(exercise.expectedResult.replace(',', '.')));
      }
      expect(solution.steps.length).toBeGreaterThan(0);
      expect(solution.grid.frames.length).toBeGreaterThan(1);
      expect(exercise.mathematicalVerification).toContain('PASS');
    }
  });
});
