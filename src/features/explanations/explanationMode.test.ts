import { describe, expect, it } from 'vitest';
import { selectExplanationExperience } from './explanationMode';

describe('selectExplanationExperience', () => {
  it.each(['CE2', 'CM1', 'CM2'])('keeps %s on TwoCards in automatic mode', (gradeLevel) => {
    expect(selectExplanationExperience({ gradeLevel })).toBe('two-cards');
  });

  it('keeps an existing lesson on TwoCards even for an older learner', () => {
    expect(selectExplanationExperience({ gradeLevel: '6e', legacyLesson: true })).toBe('two-cards');
  });

  it('selects V2 automatically for a new older-learner experience', () => {
    expect(selectExplanationExperience({ gradeLevel: '6e' })).toBe('explain-v2');
  });

  it('does not allow an under-11 explicit V2 request without an exception', () => {
    expect(selectExplanationExperience({ gradeLevel: 'CM2', request: 'explain-v2' })).toBe('two-cards');
  });

  it('allows the documented conventional-notation exception', () => {
    expect(selectExplanationExperience({
      gradeLevel: 'CM2',
      request: 'explain-v2',
      needsConventionalNotation: true,
    })).toBe('explain-v2');
  });

  it('honours an explicit TwoCards request for any level', () => {
    expect(selectExplanationExperience({ gradeLevel: '6e', request: 'two-cards' })).toBe('two-cards');
  });
});
