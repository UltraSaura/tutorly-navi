import { COUNTABLE_OBJECTS, type CountableObject } from '@/types/counting-exercise';

export const SUBTRACTION_OBJECTS = ['bubble', ...COUNTABLE_OBJECTS] as const;
export type SubtractionObject = typeof SUBTRACTION_OBJECTS[number];

export const SUBTRACTION_COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'] as const;
export type SubtractionColor = typeof SUBTRACTION_COLORS[number];

export const SUBTRACTION_COLOR_STYLES: Record<SubtractionColor, { fill: string; stroke: string; label: string }> = {
  red: { fill: '#F87171', stroke: '#BE3434', label: 'red' },
  orange: { fill: '#FDBA74', stroke: '#C65D16', label: 'orange' },
  yellow: { fill: '#FDE047', stroke: '#A16207', label: 'yellow' },
  green: { fill: '#86EFAC', stroke: '#25834B', label: 'green' },
  blue: { fill: '#7DD3FC', stroke: '#2563A6', label: 'blue' },
  purple: { fill: '#C4B5FD', stroke: '#6542B7', label: 'purple' },
};

function stableHash(value: string) {
  let hash = 2166136261;
  for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return hash >>> 0;
}

/** Stable color assignment keeps the same objects consistent across every lesson phase. */
export function subtractionObjectColor(index: number, seed: string): SubtractionColor {
  const start = stableHash(seed) % SUBTRACTION_COLORS.length;
  const step = stableHash(`${seed}:step`) % 2 === 0 ? 1 : SUBTRACTION_COLORS.length - 1;
  return SUBTRACTION_COLORS[(start + Math.max(0, Math.floor(index)) * step) % SUBTRACTION_COLORS.length];
}

export function subtractionColorToCount(seed: string, remainingCount = 10): SubtractionColor {
  const safeCount = Math.max(1, Math.min(10, Math.floor(remainingCount)));
  const selectedIndex = stableHash(`${seed}:target`) % safeCount;
  return subtractionObjectColor(selectedIndex, seed);
}

export function countSubtractionObjectsByColor(count: number, seed: string, color: SubtractionColor) {
  return Array.from({ length: Math.max(0, Math.min(10, Math.floor(count))) }, (_, index) => subtractionObjectColor(index, seed))
    .filter((itemColor) => itemColor === color).length;
}

const objectNames: Record<SubtractionObject, { singular: string; plural: string }> = {
  bubble: { singular: 'bubble', plural: 'bubbles' },
  pencil: { singular: 'pencil', plural: 'pencils' },
  apple: { singular: 'apple', plural: 'apples' },
  book: { singular: 'book', plural: 'books' },
  star: { singular: 'star', plural: 'stars' },
};

export function subtractionObjectName(object: SubtractionObject | undefined, count: number) {
  const names = objectNames[object ?? 'bubble'];
  return count === 1 ? names.singular : names.plural;
}

export function normalizeSubtractionObject(value: unknown): SubtractionObject {
  return SUBTRACTION_OBJECTS.includes(value as SubtractionObject) ? value as SubtractionObject : 'bubble';
}

export type SubtractionWithDotsExercise = {
  id: string;
  /** Optional for compatibility with locally saved v1 bubble exercises. */
  object?: SubtractionObject;
  targetCount: number;
  takeAway: number;
  answerChoices: number[];
};

export type SubtractionWithDotsPhase = 'building' | 'removing' | 'equation' | 'answering' | 'complete';

export function subtractionWithDotsTotal(exercise: Pick<SubtractionWithDotsExercise, 'targetCount' | 'takeAway'>) {
  return exercise.targetCount - exercise.takeAway;
}

/** Stable, well-spaced positions that look scattered rather than like a row. */
export function makeScatteredObjectPositions(count: number, seed: string) {
  let state = 2166136261;
  for (const character of seed) state = Math.imul(state ^ character.charCodeAt(0), 16777619);
  const random = () => {
    state = (Math.imul(state ^ (state >>> 15), 1 | state) + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 7), 61 | state) ^ state;
    value = (value ^ (value >>> 14)) >>> 0;
    return value / 4294967296;
  };

  const positions: Array<{ left: number; top: number }> = [];
  const safeCount = Math.max(0, Math.min(10, Math.floor(count)));
  for (let index = 0; index < safeCount; index += 1) {
    let candidate = { left: 10, top: 15 };
    let bestDistance = -1;
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const next = { left: 10 + random() * 80, top: 15 + random() * 70 };
      const nearest = positions.length
        ? Math.min(...positions.map((position) => Math.hypot((next.left - position.left) * 1.65, next.top - position.top)))
        : Infinity;
      if (nearest > bestDistance) {
        candidate = next;
        bestDistance = nearest;
      }
      if (nearest >= 19) break;
    }
    positions.push(candidate);
  }
  return positions;
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
    object: SUBTRACTION_OBJECTS[Math.floor(random() * SUBTRACTION_OBJECTS.length)],
    targetCount,
    takeAway,
    answerChoices: makeSubtractionWithDotsChoices(targetCount - takeAway, random),
  };
}

export function isValidSubtractionWithDotsExercise(value: unknown): value is SubtractionWithDotsExercise {
  if (!value || typeof value !== 'object') return false;
  const exercise = value as Partial<SubtractionWithDotsExercise>;
  if (typeof exercise.id !== 'string' || !exercise.id.trim()) return false;
  if (exercise.object !== undefined && !SUBTRACTION_OBJECTS.includes(exercise.object as SubtractionObject)) return false;
  if (!Number.isInteger(exercise.targetCount) || (exercise.targetCount ?? 0) < 2 || (exercise.targetCount ?? 11) > 10) return false;
  if (!Number.isInteger(exercise.takeAway) || (exercise.takeAway ?? 0) < 1 || (exercise.takeAway ?? 11) >= (exercise.targetCount ?? 0)) return false;
  const answer = subtractionWithDotsTotal(exercise as SubtractionWithDotsExercise);
  return Array.isArray(exercise.answerChoices)
    && exercise.answerChoices.length === 4
    && exercise.answerChoices.every((choice) => Number.isInteger(choice) && choice >= 0 && choice <= 10)
    && new Set(exercise.answerChoices).size === 4
    && exercise.answerChoices.includes(answer);
}
