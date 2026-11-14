export type ArithmeticFlashcard = {
  id: string;
  prompt: string;
  answer: number;
  hint: string;
  explanation: string;
  retryFeedback: string;
};

// Original Tutorly practice deck built from observed arithmetic forms.
export const ARITHMETIC_FLASHCARDS: ArithmeticFlashcard[] = [
  { id: 'subtract-3-1', prompt: '3 − 1 = ?', answer: 2, hint: 'Count back one from 3.', explanation: 'One less than 3 is 2.', retryFeedback: 'Subtracting 1 means one fewer than 3. Try again.' },
  { id: 'make-ten-2', prompt: '2 + ___ = 10', answer: 8, hint: 'How many more does 2 need to reach 10?', explanation: '2 and 8 make 10.', retryFeedback: 'Think about the distance from 2 to 10.' },
  { id: 'subtract-5-2', prompt: '5 − 2 = ?', answer: 3, hint: 'Count back two steps from 5.', explanation: 'Counting back two from 5 lands on 3.', retryFeedback: 'Take away two, one step at a time.' },
  { id: 'make-ten-1', prompt: '1 + ___ = 10', answer: 9, hint: 'How many more does 1 need to reach 10?', explanation: '1 and 9 make 10.', retryFeedback: 'Think about the distance from 1 to 10.' },
  { id: 'make-ten-4', prompt: '4 + ___ = 10', answer: 6, hint: 'How many more does 4 need to reach 10?', explanation: '4 and 6 make 10.', retryFeedback: 'Think about the distance from 4 to 10.' },
  { id: 'subtract-3-2', prompt: '3 − 2 = ?', answer: 1, hint: 'Count back two steps from 3.', explanation: 'Counting back two from 3 lands on 1.', retryFeedback: 'Take away two, one step at a time.' },
  { id: 'make-ten-7', prompt: '7 + ___ = 10', answer: 3, hint: 'How many more does 7 need to reach 10?', explanation: '7 and 3 make 10.', retryFeedback: 'Think about the distance from 7 to 10.' },
  { id: 'subtract-5-4', prompt: '5 − 4 = ?', answer: 1, hint: 'Count back four steps from 5.', explanation: 'Counting back four from 5 lands on 1.', retryFeedback: 'Take away four, one step at a time.' },
  { id: 'add-1-4', prompt: '1 + 4 = ?', answer: 5, hint: 'Start at 1 and count on four.', explanation: 'Four more than 1 is 5.', retryFeedback: 'Start at 1, then count on four more.' },
  { id: 'add-2-2', prompt: '2 + 2 = ?', answer: 4, hint: 'Start at 2 and count on two.', explanation: 'Two more than 2 is 4.', retryFeedback: 'Start at 2, then count on two more.' },
];

export function isCorrectFlashcardAnswer(card: ArithmeticFlashcard, response: string): boolean {
  const normalized = response.trim();
  if (!normalized || !/^[+-]?\d+$/.test(normalized)) return false;
  return Number(normalized) === card.answer;
}
