import { normalizeSchoolLevel } from '@/domain/schoolLevels';

export type CoordinatePlaneExercise = {
  id: string;
  kind: 'coordinate-plane';
  mode: 'read' | 'plot';
  maxX: number;
  maxY: number;
  target: { x: number; y: number };
  prompt: string;
  points?: number;
  curriculumCountry: 'fr';
  schoolLevels: string[];
};

export type CoordinateAnswer = {
  x: number | null;
  y: number | null;
  attempts: number;
  supported: boolean;
  complete: boolean;
};

const integerWithin = (value: unknown, min: number, max: number): value is number => typeof value === 'number' && Number.isInteger(value) && Number.isFinite(value) && value >= min && value <= max;

/** The positive-quadrant pilot is explicitly scoped to French cinquième content. */
export function validateCoordinateExercise(value: unknown): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ['An exercise object is required.'];
  const exercise = value as Record<string, unknown>;
  const errors: string[] = [];
  if (exercise.kind !== 'coordinate-plane') errors.push('Choose the coordinate-plane exercise kind.');
  if (typeof exercise.id !== 'string' || !exercise.id.trim()) errors.push('A non-empty exercise ID is required.');
  if (typeof exercise.prompt !== 'string' || !exercise.prompt.trim()) errors.push('A non-empty prompt is required.');
  if (exercise.mode !== 'read' && exercise.mode !== 'plot') errors.push('Choose read or plot mode.');
  if (!integerWithin(exercise.maxX, 1, 8) || !integerWithin(exercise.maxY, 1, 8)) errors.push('Use whole-number axis limits from 1 to 8.');
  const target = exercise.target;
  if (!target || typeof target !== 'object' || Array.isArray(target)) errors.push('A target point is required.');
  else {
    const point = target as Record<string, unknown>;
    const maxX = integerWithin(exercise.maxX, 1, 8) ? exercise.maxX : -1;
    const maxY = integerWithin(exercise.maxY, 1, 8) ? exercise.maxY : -1;
    if (!integerWithin(point.x, 0, maxX) || !integerWithin(point.y, 0, maxY)) errors.push('Target coordinates must be whole numbers within the displayed axes.');
  }
  if (exercise.points !== undefined && !integerWithin(exercise.points, 0, 100)) errors.push('Points must be a whole number from 0 to 100.');
  if (exercise.curriculumCountry !== 'fr') errors.push('This pilot requires the French curriculum.');
  if (!Array.isArray(exercise.schoolLevels) || exercise.schoolLevels.length === 0
    || !exercise.schoolLevels.every(level => typeof level === 'string' && normalizeSchoolLevel(level) === '5eme')) {
    errors.push('This pilot requires a non-empty list containing only cinquième school levels.');
  }
  return errors;
}

export function isCoordinateExercise(value: unknown): value is CoordinatePlaneExercise {
  return validateCoordinateExercise(value).length === 0;
}

/** Each axis is checked separately so feedback can keep the correct coordinate intact. */
export function coordinateParts(exercise: CoordinatePlaneExercise, answer: { x?: unknown; y?: unknown }): { x: boolean; y: boolean } {
  return {
    x: integerWithin(answer.x, 0, exercise.maxX) && answer.x === exercise.target.x,
    y: integerWithin(answer.y, 0, exercise.maxY) && answer.y === exercise.target.y,
  };
}

/** Opening a task, selecting a point, or coercing blank input is never a completed solve. */
export function isCoordinateAnswerCorrect(exercise: CoordinatePlaneExercise, state: unknown): boolean {
  if (!state || typeof state !== 'object' || Array.isArray(state)) return false;
  const answer = state as Record<string, unknown>;
  if (answer.complete !== true || !Number.isSafeInteger(answer.attempts) || Number(answer.attempts) < 1 || typeof answer.supported !== 'boolean') return false;
  const parts = coordinateParts(exercise, answer);
  return parts.x && parts.y;
}

let generatedId = 0;
const randomInteger = (max: number, random: () => number) => {
  const value = random();
  return Math.floor(Math.max(0, Math.min(0.999999999, Number.isFinite(value) ? value : 0)) * (max + 1));
};
function coordinatePrompt(mode: 'read' | 'plot', target: { x: number; y: number }): string {
  return mode === 'read' ? 'Lis les coordonnées du point marqué dans le repère.' : `Place le point de coordonnées (${target.x} ; ${target.y}) dans le repère.`;
}

export function createCoordinateExercise(mode: 'read' | 'plot' = 'read', random: () => number = Math.random): CoordinatePlaneExercise {
  if (mode !== 'read' && mode !== 'plot') throw new Error('Unsupported coordinate exercise mode.');
  const maxX = 6, maxY = 6;
  const x = randomInteger(maxX, random);
  let y = randomInteger(maxY, random);
  if (y === x) y = (y + 1) % (maxY + 1);
  const target = { x, y };
  return {
    id: `coordinate-${mode}-${Date.now().toString(36)}-${++generatedId}`,
    kind: 'coordinate-plane', mode, maxX, maxY, target,
    prompt: coordinatePrompt(mode, target), points: 1,
    curriculumCountry: 'fr', schoolLevels: ['5eme'],
  };
}

/** A fresh point changes both coordinates while keeping the same bounded axes and mode. */
export function createCoordinateTransfer(source: CoordinatePlaneExercise): CoordinatePlaneExercise {
  if (!isCoordinateExercise(source)) throw new Error('A coordinate transfer requires a valid source exercise.');
  const target = { x: (source.target.x + 1) % (source.maxX + 1), y: (source.target.y + 1) % (source.maxY + 1) };
  return {
    ...source,
    id: `${source.id}:transfer:${target.x},${target.y}`,
    target,
    schoolLevels: [...source.schoolLevels],
    prompt: coordinatePrompt(source.mode, target),
  };
}
