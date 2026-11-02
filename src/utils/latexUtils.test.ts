import { describe, expect, it } from 'vitest';
import { latexToPlainText } from './latexUtils';

describe('latex display fallback', () => {
  it('keeps fraction inequalities readable when math rendering is unavailable', () => {
    expect(latexToPlainText('\\frac{6}{3} < \\frac{7}{3} < \\frac{9}{3}'))
      .toBe('6/3 < 7/3 < 9/3');
  });
});
