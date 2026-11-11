import { describe, expect, it } from 'vitest';
import { ARITHMETIC_FLASHCARDS, isCorrectFlashcardAnswer } from './flashcardPractice';

describe('arithmetic flashcard practice', () => {
  it('uses a single ordered deck of ten within-ten addition and subtraction cards', () => {
    expect(ARITHMETIC_FLASHCARDS).toHaveLength(10);
    expect(new Set(ARITHMETIC_FLASHCARDS.map((card) => card.id)).size).toBe(10);
    expect(ARITHMETIC_FLASHCARDS.every((card) => card.answer >= 0 && card.answer <= 10)).toBe(true);
  });

  it('accepts only an exact integer answer', () => {
    const card = ARITHMETIC_FLASHCARDS[1];
    expect(isCorrectFlashcardAnswer(card, ' 8 ')).toBe(true);
    expect(isCorrectFlashcardAnswer(card, '7')).toBe(false);
    expect(isCorrectFlashcardAnswer(card, '')).toBe(false);
    expect(isCorrectFlashcardAnswer(card, '8.0')).toBe(false);
  });
});
