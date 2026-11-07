import { describe, expect, it } from 'vitest';
import { buildLabSolution } from './stuwyExplainLab';
import { STUWY_EXPLAIN_BENCHMARK } from './stuwyExplainBenchmark';

describe('Stuwy Explanation Lab reproducible benchmark', () => {
  it('contains exactly 30 exercises across the requested grades and domains', () => {
    expect(STUWY_EXPLAIN_BENCHMARK).toHaveLength(30);
    expect(new Set(STUWY_EXPLAIN_BENCHMARK.map((item) => item.grade))).toEqual(new Set(['CE2', 'CM1', 'CM2', '6e']));
    expect(new Set(STUWY_EXPLAIN_BENCHMARK.map((item) => item.category))).toEqual(new Set(['arithmetic', 'decimals', 'fractions', 'geometry', 'word-problem']));
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
