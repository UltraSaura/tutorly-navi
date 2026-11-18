import { COUNTABLE_OBJECTS, type CountableObject } from '@/types/counting-exercise';

export const GRID_COLOURS = ['red', 'blue', 'yellow', 'green'] as const;
export type GridColour = typeof GRID_COLOURS[number];
export type GuidedFamilyKind = 'guided-word-problem' | 'equal-groups' | 'colour-grid';
type Base = { id: string; prompt: string; hint?: string; points?: number };
export type GuidedWordProblem = Base & { kind: 'guided-word-problem'; operation: 'addition' | 'subtraction'; initial: number; change: number; object: CountableObject };
export type EqualGroupsExercise = Base & { kind: 'equal-groups'; groups: number; perGroup: number; object: CountableObject };
export type ColourGridExercise = Base & { kind: 'colour-grid'; rows: number; columns: number; cells: GridColour[]; targetColor: GridColour };
export type GuidedFamilyExercise = GuidedWordProblem | EqualGroupsExercise | ColourGridExercise;
export type GuidedFamilyState = {
  selectedAnswer: number | null;
  selectedOperation?: 'addition' | 'subtraction';
  builtGroups?: number;
  modelComplete: boolean;
  modelActions?: number;
  attempts: number;
  supported: boolean;
  complete: boolean;
};
export type GuidedFamilyResult = GuidedFamilyState & { selectedAnswer: number; correct: true };

const boundedInteger = (value: unknown, min: number, max: number): value is number => typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
const isObject = (value: unknown): value is CountableObject => COUNTABLE_OBJECTS.includes(value as CountableObject);
const isColour = (value: unknown): value is GridColour => GRID_COLOURS.includes(value as GridColour);

/** These are conservative Tutorly authoring bounds, not inferred reference-product rules. */
export function validateGuidedFamilyExercise(value: unknown): string[] {
  if (!value || typeof value !== 'object') return ['An exercise object is required.'];
  const exercise = value as Record<string, unknown>;
  const errors: string[] = [];
  if (typeof exercise.id !== 'string' || !exercise.id.trim()) errors.push('A non-empty exercise ID is required.');
  if (typeof exercise.prompt !== 'string' || !exercise.prompt.trim()) errors.push('A non-empty prompt is required.');
  if (exercise.hint !== undefined && typeof exercise.hint !== 'string') errors.push('Hint must be text.');
  if (exercise.points !== undefined && !boundedInteger(exercise.points, 0, 100)) errors.push('Points must be a whole number from 0 to 100.');
  if (exercise.kind === 'guided-word-problem') {
    if (!['addition', 'subtraction'].includes(String(exercise.operation))) errors.push('Choose addition or subtraction.');
    if (!isObject(exercise.object)) errors.push('Choose a supported countable object.');
    if (!boundedInteger(exercise.initial, 0, 100) || !boundedInteger(exercise.change, 1, 100)) errors.push('Use a starting amount from 0 to 100 and a change from 1 to 100.');
    else if (exercise.operation === 'addition' && exercise.initial + exercise.change > 100) errors.push('Keep the resulting quantity at or below 100.');
    else if (exercise.operation === 'subtraction' && exercise.change > exercise.initial) errors.push('Cannot take away more objects than the starting quantity.');
  } else if (exercise.kind === 'equal-groups') {
    if (!isObject(exercise.object)) errors.push('Choose a supported countable object.');
    if (!boundedInteger(exercise.groups, 1, 10) || !boundedInteger(exercise.perGroup, 1, 10)) errors.push('Use 1 to 10 groups, each containing 1 to 10 objects.');
  } else if (exercise.kind === 'colour-grid') {
    if (!boundedInteger(exercise.rows, 1, 8) || !boundedInteger(exercise.columns, 1, 8)) errors.push('Use 1 to 8 rows and columns.');
    if (!isColour(exercise.targetColor)) errors.push('Choose a supported target colour.');
    if (!Array.isArray(exercise.cells) || exercise.cells.length !== Number(exercise.rows) * Number(exercise.columns) || !exercise.cells.every(isColour)) errors.push('Supply exactly one supported colour per grid cell.');
  } else errors.push('Unsupported guided exercise kind.');
  return errors;
}

export function isGuidedFamilyExercise(value: unknown): value is GuidedFamilyExercise {
  return validateGuidedFamilyExercise(value).length === 0;
}

export function guidedFamilyAnswer(exercise: GuidedFamilyExercise): number {
  if (exercise.kind === 'guided-word-problem') return exercise.operation === 'addition' ? exercise.initial + exercise.change : exercise.initial - exercise.change;
  if (exercise.kind === 'equal-groups') return exercise.groups * exercise.perGroup;
  return exercise.cells.filter(colour => colour === exercise.targetColor).length;
}

/** Four neutral choices, stable for an authored exercise and distinct at both bounds. */
export function makeGuidedFamilyChoices(exercise: GuidedFamilyExercise): number[] {
  const answer = guidedFamilyAnswer(exercise);
  const candidates = [answer, answer - 1, answer + 1, answer - 2, answer + 2, answer + 3, answer + 4]
    .filter(value => value >= 0 && value <= 100);
  const values = [...new Set(candidates)].slice(0, 4);
  for (let offset = 3; values.length < 4; offset++) {
    for (const candidate of [answer - offset, answer + offset]) {
      if (candidate >= 0 && candidate <= 100 && !values.includes(candidate) && values.length < 4) values.push(candidate);
    }
  }
  let seed = [...exercise.id].reduce((value, letter) => (value * 31 + letter.charCodeAt(0)) >>> 0, 17);
  for (let i = values.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}

export function isGuidedFamilyAnswerCorrect(exercise: GuidedFamilyExercise, state: unknown): boolean {
  if (!state || typeof state !== 'object') return false;
  const value = state as Partial<GuidedFamilyState>;
  if (value.selectedAnswer !== guidedFamilyAnswer(exercise)) return false;
  if (exercise.kind === 'guided-word-problem') return value.selectedOperation === exercise.operation && value.modelComplete === true && value.modelActions === exercise.change;
  if (exercise.kind === 'equal-groups') return value.builtGroups === exercise.groups;
  return true;
}

const integer = (min: number, max: number, random: () => number) => min + Math.floor(Math.max(0, Math.min(0.999999, random())) * (max - min + 1));
export function createGuidedFamilyExercise(kind: GuidedFamilyKind, random: () => number = Math.random): GuidedFamilyExercise {
  const id = `${kind}-${integer(0, 1_000_000, random)}`;
  const object = COUNTABLE_OBJECTS[integer(0, COUNTABLE_OBJECTS.length - 1, random)];
  if (kind === 'guided-word-problem') {
    const initial = integer(3, 9, random);
    const operation = random() < 0.5 ? 'addition' : 'subtraction';
    const change = integer(1, operation === 'subtraction' ? initial : 6, random);
    return { id, kind, object, initial, change, operation, prompt: 'Choose the operation, build the picture, then solve the story.' };
  }
  if (kind === 'equal-groups') return { id, kind, object, groups: integer(2, 5, random), perGroup: integer(2, 5, random), prompt: 'Build equal groups and find how many objects there are altogether.' };
  const rows = integer(3, 5, random), columns = integer(3, 5, random);
  return { id, kind, rows, columns, cells: Array.from({ length: rows * columns }, () => GRID_COLOURS[integer(0, 3, random)]), targetColor: GRID_COLOURS[integer(0, 3, random)], prompt: 'Count only the tiles in the requested colour.' };
}

/** Fresh narrative comes from the validated quantities, never stale generated copy. */
export function guidedFamilyPrompt(exercise: GuidedFamilyExercise, language = 'fr'): string {
  const fr = language.startsWith('fr');
  const objectName = (object: CountableObject, quantity: number) => {
    const words: Record<CountableObject, [string, string, string, string]> = {
      apple: ['pomme', 'pommes', 'apple', 'apples'], book: ['livre', 'livres', 'book', 'books'],
      pencil: ['crayon', 'crayons', 'pencil', 'pencils'], star: ['étoile', 'étoiles', 'star', 'stars'],
    };
    return words[object][(fr ? 0 : 2) + (quantity === 1 ? 0 : 1)];
  };
  if (exercise.kind === 'guided-word-problem') return fr
    ? `Il y a ${exercise.initial} ${objectName(exercise.object, exercise.initial)}. ${exercise.operation === 'addition' ? `On ajoute ${exercise.change} ${objectName(exercise.object, exercise.change)}. Combien y en a-t-il en tout ?` : `On enlève ${exercise.change} ${objectName(exercise.object, exercise.change)}. Combien en reste-t-il ?`}`
    : `There ${exercise.initial === 1 ? 'is' : 'are'} ${exercise.initial} ${objectName(exercise.object, exercise.initial)}. ${exercise.operation === 'addition' ? `${exercise.change} more ${exercise.change === 1 ? 'is' : 'are'} added. How many are there altogether?` : `${exercise.change} ${exercise.change === 1 ? 'is' : 'are'} taken away. How many are left?`}`;
  if (exercise.kind === 'equal-groups') return fr
    ? `Construis ${exercise.groups} ${exercise.groups === 1 ? 'groupe' : 'groupes'} de ${exercise.perGroup} ${objectName(exercise.object, exercise.perGroup)}. Combien y en a-t-il en tout ?`
    : `Build ${exercise.groups} ${exercise.groups === 1 ? 'group' : 'groups'} of ${exercise.perGroup} ${objectName(exercise.object, exercise.perGroup)}. How many are there altogether?`;
  const colourNames: Record<GridColour, [string, string]> = { red: ['rouge', 'red'], blue: ['bleu', 'blue'], yellow: ['jaune', 'yellow'], green: ['vert', 'green'] };
  return fr ? `Compte uniquement les cases de couleur ${colourNames[exercise.targetColor][0]}.` : `Count only the ${colourNames[exercise.targetColor][1]} tiles.`;
}
