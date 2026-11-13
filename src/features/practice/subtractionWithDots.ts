export type SubtractionWithDotsExercise = {
  id: string;
  targetCount: number;
  takeAway: number;
  answerChoices: number[];
};

export type SubtractionWithDotsPhase = 'building' | 'removing' | 'equation' | 'answering' | 'complete';

export function subtractionWithDotsTotal(exercise: Pick<SubtractionWithDotsExercise, 'targetCount' | 'takeAway'>) {
  return exercise.targetCount - exercise.takeAway;
}

export function makeSubtractionWithDotsEquationChoices(targetCount: number, takeAway: number) {
  return [
    `${targetCount} − ${takeAway}`,
    `${targetCount} − ${takeAway === 1 ? 2 : takeAway - 1}`,
    `${targetCount} + ${takeAway}`,
    `${takeAway} − ${targetCount}`,
  ];
}

export function makeSubtractionWithDotsChoices(answer: number, random: () => number = Math.random) {
  const candidates = [answer - 1, answer + 1, answer + 2, answer + 3, answer + 4, answer + 5]
    .filter((value) => value >= 0 && value <= 10 && value !== answer);
  const choices = [...new Set(candidates)].slice(0, 3);
  for (let value = 0; choices.length < 3 && value <= 10; value += 1) {
    if (value !== answer && !choices.includes(value)) choices.push(value);
  }
  const all = [answer, ...choices];
  for (let index = all.length - 1; index > 0; index -= 1) {
    const next = Math.floor(random() * (index + 1));
    [all[index], all[next]] = [all[next], all[index]];
  }
  return all;
}

export function createSubtractionWithDotsExercise(random: () => number = Math.random): SubtractionWithDotsExercise {
  const targetCount = 6 + Math.floor(random() * 5);
  const takeAway = 1 + Math.floor(random() * (targetCount - 1));
  return {
    id: `subtract-dots-${Math.floor(random() * 1_000_000)}`,
    targetCount,
    takeAway,
    answerChoices: makeSubtractionWithDotsChoices(targetCount - takeAway, random),
  };
}

export function isValidSubtractionWithDotsExercise(value: unknown): value is SubtractionWithDotsExercise {
  if (!value || typeof value !== 'object') return false;
  const exercise = value as Partial<SubtractionWithDotsExercise>;
  if (typeof exercise.id !== 'string' || !exercise.id.trim()) return false;
  if (!Number.isInteger(exercise.targetCount) || (exercise.targetCount ?? 0) < 2 || (exercise.targetCount ?? 11) > 10) return false;
  if (!Number.isInteger(exercise.takeAway) || (exercise.takeAway ?? 0) < 1 || (exercise.takeAway ?? 11) >= (exercise.targetCount ?? 0)) return false;
  const answer = subtractionWithDotsTotal(exercise as SubtractionWithDotsExercise);
  return Array.isArray(exercise.answerChoices)
    && exercise.answerChoices.length === 4
    && exercise.answerChoices.every((choice) => Number.isInteger(choice) && choice >= 0 && choice <= 10)
    && new Set(exercise.answerChoices).size === 4
    && exercise.answerChoices.includes(answer);
}
