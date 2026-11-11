export type AddUpStep = {
  id: string;
  prompt: string;
  start: number;
  target: number;
  mode: 'tens' | 'ones' | 'both' | 'answer';
  hint: string;
  explanation: string;
};

export const ADD_UP_TO_100_STEPS: AddUpStep[] = [
  { id: 'count', prompt: 'How many dots are there? Count the groups of ten.', start: 30, target: 30, mode: 'answer', hint: 'Each complete row has 10 dots.', explanation: 'Three groups of ten make 30.' },
  { id: 'tens', prompt: 'Start at 30. Add 3 groups of ten. What number do you make?', start: 30, target: 60, mode: 'tens', hint: 'Each group adds 10: 30, 40, 50, 60.', explanation: 'Three more tens make 60.' },
  { id: 'ones', prompt: 'Start at 60. Add 7 ones to make the next number.', start: 60, target: 67, mode: 'ones', hint: 'Keep the 6 tens and count 7 single dots.', explanation: '60 and 7 ones make 67.' },
  { id: 'make-100', prompt: 'You have 67. Add tens and ones to reach 100.', start: 67, target: 100, mode: 'both', hint: 'From 67, add 3 tens to reach 97, then count on 3 ones.', explanation: '67 + 30 = 97, then 3 more makes 100.' },
  { id: 'symbolic', prompt: 'Solve 45 + 7. Use the dots to help you think.', start: 45, target: 52, mode: 'answer', hint: 'Add 5 ones to reach 50. How many of the 7 are left?', explanation: '45 + 5 = 50, then 2 more makes 52.' },
];

export function isCorrectAddUpAnswer(step: AddUpStep, value: number): boolean {
  return Number.isFinite(value) && value === step.target;
}

export function nextAddUpValue(current: number, increment: 1 | 10, target: number): number {
  return Math.min(target, current + increment);
}
