export type NumbersAfterTenStep = {
  id: string;
  prompt: string;
  target: number;
  hint: string;
  explanation: string;
};

/** An original Tutorly progression from one ten to ten-and-ones numbers. */
export const NUMBERS_AFTER_TEN_STEPS: NumbersAfterTenStep[] = [
  { id: 'eleven', prompt: 'There is one full group of ten. Add 1 one. What number do you have?', target: 11, hint: 'Keep all ten dots together and count one extra dot.', explanation: 'One group of ten and 1 one make 11.' },
  { id: 'twelve', prompt: 'Keep the group of ten. Add 2 ones.', target: 12, hint: 'Start at ten and count two more dots.', explanation: 'One group of ten and 2 ones make 12.' },
  { id: 'fifteen', prompt: 'One ten and 5 ones make which number?', target: 15, hint: 'Count five extra dots after the full group of ten.', explanation: 'One group of ten and 5 ones make 15.' },
];

export function isCorrectNumberAfterTen(target: number, value: number): boolean {
  return Number.isInteger(value) && value === target;
}
