
import { detectHomeworkInMessage } from '../utils/detectors/homeworkDetector';

describe('Homework Detector', () => {
  test('detects math expressions', () => {
    expect(detectHomeworkInMessage('2 + 2 = 4')).toBe(true);
    expect(detectHomeworkInMessage('solve x + 5 = 10')).toBe(true);
  });

  test('detects word problems', () => {
    expect(detectHomeworkInMessage('If you have 3 apples and need to find the total after adding 2 more')).toBe(true);
    expect(detectHomeworkInMessage('Calculate the sum of 5 and 3')).toBe(true);
  });

  test('detects homework keywords', () => {
    expect(detectHomeworkInMessage('my answer is 42')).toBe(true);
    expect(detectHomeworkInMessage('homework: solve this equation')).toBe(true);
  });

  test('returns false for non-homework content', () => {
    expect(detectHomeworkInMessage('Hello world')).toBe(false);
    expect(detectHomeworkInMessage('What a beautiful day')).toBe(false);
  });
});
