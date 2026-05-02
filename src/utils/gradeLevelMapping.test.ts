import { describe, expect, it } from 'vitest';
import { getGradeLevelInfo, isUnder11YearsOld } from './gradeLevelMapping';

describe('gradeLevelMapping', () => {
  it.each(['K', '1', '5', 'US:5', 'Y1', 'Y6', 'GB:Y6', 'CP', 'cm2'])(
    'treats %s as under 11',
    (level) => {
      expect(isUnder11YearsOld(level)).toBe(true);
    }
  );

  it.each(['6', 'Y7', '6EME', '6ème', '12', 'High School'])(
    'treats %s as not under 11',
    (level) => {
      expect(isUnder11YearsOld(level)).toBe(false);
    }
  );

  it('does not treat any word containing k as kindergarten', () => {
    expect(getGradeLevelInfo('unknown').isUnder11).toBe(false);
  });
});
