export type ClockExercise = {
  schemaVersion: 1;
  id: string;
  startHour: number;
  choices: number[];
};

const randomInteger = (min: number, max: number, random: () => number) => min + Math.floor(random() * (max - min + 1));
const wrapHour = (hour: number) => ((hour - 1 + 12) % 12) + 1;

export function oneHourLater(hour: number) {
  return wrapHour(hour + 1);
}

export function clockHourChoices(startHour: number, random: () => number = Math.random) {
  const answer = oneHourLater(startHour);
  const choices = [answer, startHour, wrapHour(startHour + 2), wrapHour(startHour - 1)];
  for (let index = choices.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [choices[index], choices[swap]] = [choices[swap], choices[index]];
  }
  return choices;
}

export function createClockExercise(random: () => number = Math.random): ClockExercise {
  const startHour = randomInteger(1, 12, random);
  return {
    schemaVersion: 1,
    id: `clock-${Math.floor(random() * 1_000_000_000)}`,
    startHour,
    choices: clockHourChoices(startHour, random),
  };
}

export function isClockExercise(value: unknown): value is ClockExercise {
  if (!value || typeof value !== 'object') return false;
  const exercise = value as Partial<ClockExercise>;
  return exercise.schemaVersion === 1
    && typeof exercise.id === 'string'
    && exercise.id.trim().length > 0
    && Number.isInteger(exercise.startHour)
    && (exercise.startHour ?? 0) >= 1
    && (exercise.startHour ?? 13) <= 12
    && Array.isArray(exercise.choices)
    && exercise.choices.length === 4
    && exercise.choices.every((hour) => Number.isInteger(hour) && hour >= 1 && hour <= 12)
    && new Set(exercise.choices).size === 4
    && exercise.choices.includes(oneHourLater(exercise.startHour!));
}
