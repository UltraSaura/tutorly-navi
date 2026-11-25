import { describe, expect, it } from 'vitest';
import { assertDifferentTeachingExample, teachingRepeatsOriginal } from './exampleSafety';
import { containsOriginalExercise, generateDifferentExample, validateExampleOperationType } from '@/utils/operationTypeDetector';

describe('hard no-original-exercise boundary', () => {
  it.each(['66*6', '66 × 6 = 396', '6 × 66', '066 × 6.0', '66 \\times 6', '66 × (6)'])('blocks original arithmetic in generated or cached teaching: %s', text => {
    for (const field of ['concept', 'example', 'method', 'pitfall', 'check', 'practice', 'currentExercise', 'parentHelpHint', 'correctAnswer']) {
      const sections = { [field]: text };
      expect(teachingRepeatsOriginal('66*6', sections)).toBe(true);
      expect(() => assertDifferentTeachingExample('66*6', sections)).toThrow('repeated your exercise');
    }
  });

  it('checks every step, not only the first example', () => {
    expect(() => assertDifferentTeachingExample('66*6', {
      example: '33 × 4 = 132',
      steps: [
        { title: 'Example', body: '33 × 4 = 132', kind: 'strategy', icon: 'checklist' },
        { title: 'Check', body: 'Now calculate 66 × 6.', kind: 'check', icon: 'target' },
      ],
    })).toThrow('repeated your exercise');
  });

  it('allows the original as context metadata without teaching its calculation', () => {
    expect(() => assertDifferentTeachingExample('66*6', { exercise: '66*6', example: '33 × 4 = 132' })).not.toThrow();
  });

  it('does not confuse shared digits or an equal answer with the same exercise', () => {
    expect(containsOriginalExercise('2+3', '12+3=15')).toBe(false);
    expect(containsOriginalExercise('2+3', '1+4=5')).toBe(false);
  });

  it.each([
    ['1,5 × 2', '2 * 1.50'],
    ['84 ÷ 7', '84/7=12'],
    ['1/2 + 1/4', '2/4 + 2/8'],
    ['50% × 20', '0.5 * 20'],
  ])('recognizes equivalent operands: %s', (source, example) => {
    expect(containsOriginalExercise(source, example)).toBe(true);
  });

  it.each(['300 × 4', '33 × 43', '7 + 5', '23 + 45', '52 - 27', '87 - 23', '12 ÷ 4', '122 ÷ 48', '12.5 × 2.0'])('changes colliding fallback templates: %s', source => {
    const example = generateDifferentExample(source);
    expect(containsOriginalExercise(source, example)).toBe(false);
    expect(validateExampleOperationType(source, example).isValid).toBe(true);
  });

  it('fails closed if a comparable different example cannot be produced', () => {
    expect(() => generateDifferentExample('75% ÷ 25%')).toThrow('No different comparable example');
  });
});
