export type AdditionAcrossTenExercise = {
  id: string;
  startNumber: number;
  addend: number;
  answerChoices: number[];
};

export type AdditionAcrossTenPhase = 'bridging' | 'answering' | 'complete';

export function getUnitsDigit(value: number) {
  return ((value % 10) + 10) % 10;
}

export function countersToNextTen(startNumber: number) {
  return 10 - getUnitsDigit(startNumber);
}

export function additionAcrossTenTotal(exercise: Pick<AdditionAcrossTenExercise, 'startNumber' | 'addend'>) {
  return exercise.startNumber + exercise.addend;
}

const shuffle = <T,>(values: T[], random: () => number) => {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const next = Math.floor(random() * (index + 1));
    [result[index], result[next]] = [result[next], result[index]];
  }
  return result;
};

export function makeAdditionAcrossTenChoices(total: number, random: () => number = Math.random) {
  const candidates = [total - 1, total + 1, total - 10, total + 10, total - 9, total + 9]
    .filter((value) => value >= 0 && value <= 1000 && value !== total);
  const distractors = [...new Set(candidates)];
  for (let offset = 2; distractors.length < 3; offset += 1) {
    const candidate = (total + offset) % 1001;
    if (candidate !== total && !distractors.includes(candidate)) distractors.push(candidate);
  }
  return shuffle([total, ...distractors.slice(0, 3)], random);
}

export function createAdditionAcrossTenExercise(random: () => number = Math.random): AdditionAcrossTenExercise {
  const prefix = 1 + Math.floor(random() * 98);
  const units = 2 + Math.floor(random() * 7);
  const startNumber = prefix * 10 + units;
  const neededToTen = 10 - units;
  const addend = neededToTen + 1 + Math.floor(random() * (9 - neededToTen));
  const total = startNumber + addend;
  return {
    id: `across-ten-${Math.floor(random() * 1_000_000)}`,
    startNumber,
    addend,
    answerChoices: makeAdditionAcrossTenChoices(total, random),
  };
}

export function isValidAdditionAcrossTenExercise(value: unknown): value is AdditionAcrossTenExercise {
  if (!value || typeof value !== 'object') return false;
  const exercise = value as Partial<AdditionAcrossTenExercise>;
  if (typeof exercise.id !== 'string' || !exercise.id.trim()) return false;
  if (!Number.isInteger(exercise.startNumber) || (exercise.startNumber ?? -1) < 10 || (exercise.startNumber ?? 1001) > 999) return false;
  if (!Number.isInteger(exercise.addend) || (exercise.addend ?? -1) < 1 || (exercise.addend ?? 10) > 9) return false;
  const total = additionAcrossTenTotal(exercise as AdditionAcrossTenExercise);
  if (total > 1000 || getUnitsDigit(exercise.startNumber!) + exercise.addend <= 10) return false;
  return Array.isArray(exercise.answerChoices)
    && exercise.answerChoices.length === 4
    && exercise.answerChoices.every((choice) => Number.isInteger(choice) && choice >= 0 && choice <= 1000)
    && new Set(exercise.answerChoices).size === 4
    && exercise.answerChoices.includes(total);
}
