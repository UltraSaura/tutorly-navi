export type AddUpStep = {
  id: string;
  prompt: string;
  start: number;
  target: number;
  mode: 'tens' | 'ones' | 'both' | 'answer' | 'choice';
  choices?: number[];
  hint: string;
  explanation: string;
};

export const ADD_UP_TO_100_STEPS: AddUpStep[] = [
  { id: 'count-groups', prompt: 'Tap + three times to add three groups of ten.', start: 0, target: 30, mode: 'tens', hint: 'Each tap adds one group of 10.', explanation: 'Three groups of ten make 30 dots.' },
  { id: 'name-30', prompt: 'What number is that?', start: 30, target: 30, mode: 'choice', choices: [30, 40, 50, 300], hint: 'Count the groups by tens: 10, 20, 30.', explanation: 'Three groups of ten make 30.' },
  { id: 'add-30', prompt: 'What is 30 + 30?', start: 30, target: 60, mode: 'choice', choices: [33, 50, 60, 70], hint: 'Three tens plus three tens make six tens.', explanation: '30 + 30 = 60.' },
  { id: 'name-67', prompt: 'What number is 60 + 7?', start: 67, target: 67, mode: 'choice', choices: [57, 67, 77, 607], hint: 'Keep the six tens, then count seven ones.', explanation: '60 and 7 ones make 67.' },
  { id: 'make-100', prompt: 'What do you add to 67 to make 100?', start: 67, target: 33, mode: 'choice', choices: [3, 23, 33, 43], hint: '67 + 3 reaches 70. How much more to 100?', explanation: '67 + 33 = 100.' },
  { id: 'symbolic', prompt: 'Solve 45 + 7.', start: 45, target: 52, mode: 'choice', choices: [42, 51, 52, 53], hint: 'Add 5 to reach 50. How many of the 7 are left?', explanation: '45 + 7 = 52.' },
];

export function isCorrectAddUpAnswer(step: AddUpStep, value: number): boolean {
  return Number.isFinite(value) && value === step.target;
}

export function nextAddUpValue(current: number, increment: 1 | 10, target: number): number {
  return Math.min(target, current + increment);
}
