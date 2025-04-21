
import { mathPatterns, questionPatterns, answerPatterns, homeworkKeywords, mathKeywords } from '../utils/patterns/homeworkPatterns';

describe('Homework Patterns', () => {
  describe('mathPatterns', () => {
    test('matches basic arithmetic', () => {
      const pattern = mathPatterns[0];
      expect('2 + 2 = 4').toMatch(pattern);
      expect('5 * 3 = 15').toMatch(pattern);
      expect('hello world').not.toMatch(pattern);
    });

    test('matches algebraic equations', () => {
      const pattern = mathPatterns[1];
      expect('2x + 3 = 7').toMatch(pattern);
      expect('x + y = 2x').toMatch(pattern);
      expect('hello = world').not.toMatch(pattern);
    });
  });

  describe('questionPatterns', () => {
    test('matches question-answer format', () => {
      const pattern = questionPatterns[0];
      expect('problem: what is 2+2? answer: 4').toMatch(pattern);
      expect('question: solve x+1=5 answer: x=4').toMatch(pattern);
    });
  });

  describe('keywords', () => {
    test('contains essential homework keywords', () => {
      expect(homeworkKeywords).toContain('my answer is');
      expect(homeworkKeywords).toContain('homework answer');
    });

    test('contains essential math keywords', () => {
      expect(mathKeywords).toContain('solve');
      expect(mathKeywords).toContain('calculate');
    });
  });
});
