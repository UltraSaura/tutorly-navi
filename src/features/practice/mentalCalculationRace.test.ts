import { describe, expect, it } from 'vitest';
import {
  createMentalCalculation,
  createMentalCalculationRace,
  findMentalOperationLesson,
  formatMentalCalculation,
  getCalculationExplanation,
  getCalculationHint,
  getRelatedMultiplicationFacts,
  isCorrectMentalCalculation,
  MENTAL_OPERATIONS,
} from './mentalCalculationRace';

describe('mental calculation race', () => {
  it('generates valid calculations for each operation within the selected answer range', () => {
    for (const operation of MENTAL_OPERATIONS) {
      const calculation = createMentalCalculation(operation, 100);
      expect(Number.isInteger(calculation.answer)).toBe(true);
      expect(calculation.answer).toBeGreaterThanOrEqual(0);
      expect(calculation.answer).toBeLessThanOrEqual(100);
      expect(calculation.operation).toBe(operation);
    }
  });

  it('creates a ten-question race using only the chosen operations', () => {
    const race = createMentalCalculationRace(['multiplication', 'division'], 100, () => 0.7);
    expect(race).toHaveLength(10);
    expect(new Set(race.map((calculation) => calculation.id)).size).toBe(10);
    expect(race.every((calculation) => ['multiplication', 'division'].includes(calculation.operation))).toBe(true);
    expect(race.some((calculation) => calculation.operation === 'multiplication')).toBe(true);
    expect(race.some((calculation) => calculation.operation === 'division')).toBe(true);
  });

  it('does not create a race when no operation is selected', () => {
    expect(createMentalCalculationRace([], 10)).toEqual([]);
  });

  it('checks whole-number answers and formats operation prompts', () => {
    const calculation = { id: 'add-4-6', operation: 'addition' as const, left: 4, right: 6, answer: 10 };
    expect(isCorrectMentalCalculation(calculation, '10')).toBe(true);
    expect(isCorrectMentalCalculation(calculation, ' 10 ')).toBe(true);
    expect(isCorrectMentalCalculation(calculation, '10.0')).toBe(false);
    expect(formatMentalCalculation(calculation)).toBe('4 + 6 = ?');
  });

  it('provides learning hints and explanations for multiplication and division', () => {
    const multiplication = { id: 'mul-4-3', operation: 'multiplication' as const, left: 4, right: 3, answer: 12 };
    const division = { id: 'div-12-3', operation: 'division' as const, left: 12, right: 3, answer: 4 };
    expect(getCalculationHint(multiplication)).toContain('3 times table');
    expect(getCalculationExplanation(multiplication)).toContain('3 + 3 + 3 + 3');
    expect(getCalculationHint(division)).toContain('3 times table');
    expect(getCalculationExplanation(division)).toContain('3 × 4 = 12');
  });

  it('includes a required table fact even when a larger division quotient is above ten', () => {
    const division = { id: 'div-100-2', operation: 'division' as const, left: 100, right: 2, answer: 50 };
    expect(getRelatedMultiplicationFacts(division)).toContainEqual({ multiplier: 50, product: 100, isRelevant: true });
  });

  it('finds an available lesson for the operation, with a general calculation lesson as fallback', () => {
    const topics = [
      { topicLabel: 'Les tables de multiplication', topicSlug: 'tables-multiplication', subjectSlug: 'mathematiques', hasLesson: true },
      { topicLabel: 'Le calcul mental', topicSlug: 'calcul-mental', subjectSlug: 'mathematiques', hasLesson: true },
    ];
    expect(findMentalOperationLesson('multiplication', topics)?.topicSlug).toBe('tables-multiplication');
    expect(findMentalOperationLesson('division', topics)?.topicSlug).toBe('calcul-mental');
    expect(findMentalOperationLesson('division', [{ ...topics[0], hasLesson: false }])).toBeNull();
  });
});
