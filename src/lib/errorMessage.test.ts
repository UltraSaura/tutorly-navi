import { describe, expect, it } from 'vitest';
import { errorMessage } from './errorMessage';

describe('errorMessage', () => {
  it('preserves Error and structured service messages', () => {
    expect(errorMessage(new Error('Network failure'), 'Fallback')).toBe('Network failure');
    expect(errorMessage({ message: 'Access denied' }, 'Fallback')).toBe('Access denied');
  });

  it.each([null, undefined, 'failure', 42, {}, { message: 42 }, { message: '' }])('uses the fallback for %j', (error) => {
    expect(errorMessage(error, 'Fallback')).toBe('Fallback');
  });
});
