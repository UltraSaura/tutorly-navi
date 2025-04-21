
import { matchMathProblem, matchQuestionAnswer, extractSimpleEquation } from '../utils/matchers/homeworkMatchers';

describe('Homework Matchers', () => {
  describe('matchMathProblem', () => {
    test('matches basic arithmetic problems', () => {
      const result = matchMathProblem('2 + 2 = 4');
      expect(result).toEqual({
        question: '2 + 2',
        answer: '4'
      });
    });

    test('matches word problems', () => {
      const result = matchMathProblem('If you have 3 apples and add 2 more, answer: 5');
      expect(result).toEqual({
        question: 'If you have 3 apples and add 2 more',
        answer: '5'
      });
    });

    test('returns null for non-math content', () => {
      const result = matchMathProblem('Hello world');
      expect(result).toBeNull();
    });
  });

  describe('matchQuestionAnswer', () => {
    test('extracts question and answer from formatted text', () => {
      const result = matchQuestionAnswer('Question: What is 5+5? Answer: 10');
      expect(result).toEqual({
        question: 'What is 5+5?',
        answer: '10'
      });
    });

    test('returns null for unmatched format', () => {
      const result = matchQuestionAnswer('Random text without format');
      expect(result).toBeNull();
    });
  });

  describe('extractSimpleEquation', () => {
    test('extracts simple equations', () => {
      const result = extractSimpleEquation('x + 1 = 5');
      expect(result).toEqual({
        question: 'x + 1',
        answer: '5'
      });
    });

    test('returns null for non-equations', () => {
      const result = extractSimpleEquation('Hello world');
      expect(result).toBeNull();
    });
  });
});
