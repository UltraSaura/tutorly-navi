import { COUNTABLE_OBJECTS, CountableObject } from '@/types/counting-exercise';
export { COUNTABLE_OBJECTS } from '@/types/counting-exercise';
export type { CountableObject } from '@/types/counting-exercise';

/** Data contract for one instance of Tutorly's reusable count-in-groups exercise. */
export type CountingExercise = {
  schemaVersion: 1;
  id: string;
  object: CountableObject;
  startingGroups: number;
  startingOnes: number;
  groupsToAdd: number;
  answerChoices: number[];
};

export type CountingExercisePhase = 'adding' | 'choosing' | 'complete';

const OBJECT_NAMES: Record<CountableObject, { singular: string; plural: string }> = {
  pencil: { singular: 'pencil', plural: 'pencils' },
  apple: { singular: 'apple', plural: 'apples' },
  book: { singular: 'book', plural: 'books' },
  star: { singular: 'star', plural: 'stars' },
};

export function countableObjectName(object: CountableObject, value: number) {
  const names = OBJECT_NAMES[object];
  return value === 1 ? names.singular : names.plural;
}

const randomInteger = (min: number, max: number, random: () => number) => min + Math.floor(random() * (max - min + 1));

function shuffle(values: number[], random: () => number) {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function countingExerciseStart(exercise: Pick<CountingExercise, 'startingGroups' | 'startingOnes'>) {
  return exercise.startingGroups * 10 + exercise.startingOnes;
}

export function countingExerciseTotal(exercise: Pick<CountingExercise, 'startingGroups' | 'startingOnes' | 'groupsToAdd'>) {
  return countingExerciseStart(exercise) + exercise.groupsToAdd * 10;
}

export function makeCountingAnswerChoices(total: number, random: () => number = Math.random) {
  const candidates = [total - 10, total + 10, total - 1, total + 1, total - 9, total + 9]
    .filter((n) => n >= 0 && n <= 100 && n !== total);
  const distractors = [...new Set(candidates)];
  for (let offset = 2; distractors.length < 3; offset += 1) {
    const candidate = (total + offset) % 101;
    if (candidate !== total && !distractors.includes(candidate)) distractors.push(candidate);
  }
  return shuffle([total, ...distractors.slice(0, 3)], random);
}

/** Creates a small, readable example. Authored or generated instances use the same contract. */
export function createCountingExercise(random: () => number = Math.random): CountingExercise {
  const object = COUNTABLE_OBJECTS[randomInteger(0, COUNTABLE_OBJECTS.length - 1, random)];
  const startingGroups = randomInteger(1, 2, random);
  const startingOnes = randomInteger(0, 9, random);
  const maxAdded = Math.min(2, Math.floor((50 - startingGroups * 10 - startingOnes) / 10));
  const groupsToAdd = randomInteger(1, Math.max(1, maxAdded), random);
  const total = startingGroups * 10 + startingOnes + groupsToAdd * 10;
  return {
    schemaVersion: 1,
    id: `count-${Math.floor(random() * 1_000_000)}`,
    object,
    startingGroups,
    startingOnes,
    groupsToAdd,
    answerChoices: makeCountingAnswerChoices(total, random),
  };
}

export function isValidCountingExercise(value: unknown): value is CountingExercise {
  if (!value || typeof value !== 'object') return false;
  const exercise = value as Partial<CountingExercise>;
  if (exercise.schemaVersion !== 1 || typeof exercise.id !== 'string' || !exercise.id.trim()) return false;
  if (!COUNTABLE_OBJECTS.includes(exercise.object as CountableObject)) return false;
  if (!Number.isInteger(exercise.startingGroups) || (exercise.startingGroups ?? -1) < 0 || (exercise.startingGroups ?? 11) > 10) return false;
  if (!Number.isInteger(exercise.startingOnes) || (exercise.startingOnes ?? -1) < 0 || (exercise.startingOnes ?? 10) > 9) return false;
  if (!Number.isInteger(exercise.groupsToAdd) || (exercise.groupsToAdd ?? -1) < 0 || (exercise.groupsToAdd ?? 11) > 10) return false;
  const total = countingExerciseTotal(exercise as CountingExercise);
  return total <= 100
    && Array.isArray(exercise.answerChoices)
    && exercise.answerChoices.length === 4
    && exercise.answerChoices.every((choice) => Number.isInteger(choice) && choice >= 0 && choice <= 100)
    && new Set(exercise.answerChoices).size === 4
    && exercise.answerChoices.includes(total);
}

export function createDifferentCountingExercise(previous: CountingExercise, random: () => number = Math.random) {
  let next = createCountingExercise(random);
  for (let attempt = 0; attempt < 8 && countingExerciseTotal(next) === countingExerciseTotal(previous); attempt += 1) {
    next = createCountingExercise(random);
  }
  if (countingExerciseTotal(next) !== countingExerciseTotal(previous)) return next;
  const startingOnes = (previous.startingOnes + 1) % 10;
  const total = previous.startingGroups * 10 + startingOnes + previous.groupsToAdd * 10;
  return { ...previous, id: `count-${Math.floor(random() * 1_000_000)}`, startingOnes, answerChoices: makeCountingAnswerChoices(total, random) };
}

/** Shared bounded counter increment used by the separate Numbers after ten activity. */
export function nextAddUpValue(current: number, increment: 1 | 10, target: number): number {
  return Math.min(target, current + increment);
}
