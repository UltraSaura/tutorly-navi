
import { extractHomeworkFromMessage, extractExerciseFromMessage } from '../utils/homeworkExtraction';

describe('Homework Extraction', () => {
  describe('extractHomeworkFromMessage', () => {
    test('extracts math problems', () => {
      const result = extractHomeworkFromMessage('2 + 2 = 4');
      expect(result).toEqual({
        question: '2 + 2',
        answer: '4'
      });
    });

    test('extracts formatted questions', () => {
      const result = extractHomeworkFromMessage('Question: What is 5+5? Answer: 10');
      expect(result).toEqual({
        question: 'What is 5+5?',
        answer: '10'
      });
    });

    test('handles unstructured content', () => {
      const result = extractHomeworkFromMessage('Some text\n\nMore text');
      expect(result).toHaveProperty('question');
      expect(result).toHaveProperty('answer');
    });
  });

  describe('extractExerciseFromMessage', () => {
    test('extracts problem and guidance', () => {
      const content = '**Problem:** Find x\n\n**Guidance:** Use algebra';
      const result = extractExerciseFromMessage(content);
      expect(result).toEqual({
        question: 'Find x',
        explanation: '**Problem:**Find x\n\n**Guidance:**Use algebra'
      });
    });

    test('handles content without specific format', () => {
      const result = extractExerciseFromMessage('Simple text');
      expect(result).toEqual({
        question: 'Simple text',
        explanation: ''
      });
    });
  });
});
