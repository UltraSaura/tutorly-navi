import { createMentalCalculation, MENTAL_OPERATIONS, type MentalCalculation, type MentalOperation } from './mentalCalculationRace';

export type ArithmeticQuizKind = 'calculation-race' | 'number-flashcards';
export type ArithmeticQuizProblem = {
  id: string;
  operation: MentalOperation;
  left: number;
  right: number;
  choices: number[];
  lessonHref?: string;
};
export type ArithmeticQuizExercise = {
  id: string;
  kind: ArithmeticQuizKind;
  prompt: string;
  operations: MentalOperation[];
  leftDigits: number;
  rightDigits: number;
  problems: ArithmeticQuizProblem[];
  points?: number;
};
export type ArithmeticQuizAnswer = {
  responses: Record<string, number>;
  correctCount: number;
  total: number;
  complete: boolean;
  /** One attempt is a complete deck run; card errors are accounted for by the fraction. */
  attempts: number;
  elapsedSeconds: number;
  supported: boolean;
};
export type ArithmeticQuizEvaluation = {
  correctCount: number;
  total: number;
  results: Array<{ id: string; selected: number | null; correct: boolean }>;
};

const isOperation = (value: unknown): value is MentalOperation => MENTAL_OPERATIONS.includes(value as MentalOperation);
const digits = (value: number) => String(Math.abs(value)).length;
const whole = (value: unknown, min: number, max: number): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
export const isArithmeticLessonHref = (value: unknown): value is string => typeof value === 'string' && /^\/learning\/[a-zA-Z0-9_\-/%]+$/.test(value) && !value.includes('..') && !/%(?:2f|5c)/i.test(value);

export function arithmeticProblemAnswer(problem: Pick<ArithmeticQuizProblem, 'operation' | 'left' | 'right'>): number {
  if (problem.operation === 'addition') return problem.left + problem.right;
  if (problem.operation === 'subtraction') return problem.left - problem.right;
  if (problem.operation === 'multiplication') return problem.left * problem.right;
  return problem.right === 0 ? NaN : problem.left / problem.right;
}

/** Authored cards are checked as stored. No learner-session generation or stored-answer trust. */
export function validateArithmeticQuizExercise(value: unknown): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ['Une série de calculs est requise.'];
  const exercise = value as Record<string, unknown>;
  const errors: string[] = [];
  if (exercise.kind !== 'calculation-race' && exercise.kind !== 'number-flashcards') errors.push('Choisissez une course de calcul ou des cartes de calcul.');
  if (typeof exercise.id !== 'string' || !exercise.id.trim()) errors.push('Un identifiant est requis.');
  if (typeof exercise.prompt !== 'string' || !exercise.prompt.trim()) errors.push('Une consigne est requise.');
  const leftDigits = exercise.leftDigits, rightDigits = exercise.rightDigits;
  if (!whole(leftDigits, 1, 7) || !whole(rightDigits, 1, 7)) errors.push('Le nombre de chiffres doit être compris entre un et sept.');
  const operations = Array.isArray(exercise.operations) ? exercise.operations : [];
  if (operations.length === 0 || operations.length > 4 || !operations.every(isOperation) || new Set(operations).size !== operations.length) errors.push('Choisissez des opérations distinctes parmi les quatre opérations.');
  if (exercise.points !== undefined && !whole(exercise.points, 0, 100)) errors.push('Les points doivent être un entier entre zéro et cent.');
  if (!Array.isArray(exercise.problems) || exercise.problems.length < 1 || exercise.problems.length > 20) return [...errors, 'La série doit contenir entre un et vingt calculs.'];
  const ids = new Set<string>();
  exercise.problems.forEach((raw, index) => {
    const prefix = `Calcul ${index + 1} : `;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) { errors.push(prefix + 'configuration manquante.'); return; }
    const problem = raw as Record<string, unknown>;
    if (typeof problem.id !== 'string' || !problem.id.trim() || ids.has(problem.id)) errors.push(prefix + 'identifiant manquant ou dupliqué.');
    else ids.add(problem.id);
    if (!isOperation(problem.operation) || !operations.includes(problem.operation)) errors.push(prefix + 'opération absente de la configuration de la série.');
    const validOperands = whole(problem.left, 0, 9_999_999) && whole(problem.right, 0, 9_999_999);
    if (!validOperands) errors.push(prefix + 'les opérandes doivent être des entiers positifs ou nuls de sept chiffres au maximum.');
    else {
      if ((whole(leftDigits, 1, 7) && digits(problem.left as number) > leftDigits) || (whole(rightDigits, 1, 7) && digits(problem.right as number) > rightDigits)) errors.push(prefix + 'les opérandes dépassent la difficulté configurée.');
      const answer = arithmeticProblemAnswer(problem as unknown as ArithmeticQuizProblem);
      if (!Number.isSafeInteger(answer)) errors.push(prefix + 'le calcul doit avoir un résultat entier exact ; la division par zéro est interdite.');
      if (!Array.isArray(problem.choices) || problem.choices.length !== 4 || !problem.choices.every(choice => typeof choice === 'number' && Number.isSafeInteger(choice)) || new Set(problem.choices).size !== 4 || problem.choices.filter(choice => choice === answer).length !== 1) errors.push(prefix + 'quatre choix distincts doivent contenir exactement une fois le résultat correct.');
    }
    if (problem.lessonHref !== undefined && !isArithmeticLessonHref(problem.lessonHref)) errors.push(prefix + 'le lien doit mener à une leçon Tutorly dans /learning/.');
  });
  return errors;
}

export function isArithmeticQuizExercise(value: unknown): value is ArithmeticQuizExercise { return validateArithmeticQuizExercise(value).length === 0; }

export function evaluateArithmeticQuiz(exercise: ArithmeticQuizExercise, responses: Record<string, number>): ArithmeticQuizEvaluation {
  const results = exercise.problems.map(problem => {
    const response = responses[problem.id];
    const selected = typeof response === 'number' && Number.isSafeInteger(response) && problem.choices.includes(response) ? response : null;
    return { id: problem.id, selected, correct: selected !== null && selected === arithmeticProblemAnswer(problem) };
  });
  return { results, total: results.length, correctCount: results.filter(result => result.correct).length };
}

export function isArithmeticQuizComplete(exercise: ArithmeticQuizExercise, value: unknown): value is ArithmeticQuizAnswer {
  if (!isArithmeticQuizExercise(exercise) || !value || typeof value !== 'object' || Array.isArray(value)) return false;
  const state = value as Record<string, unknown>;
  if (state.complete !== true || !whole(state.attempts, 1, Number.MAX_SAFE_INTEGER) || typeof state.supported !== 'boolean' || typeof state.elapsedSeconds !== 'number' || !Number.isFinite(state.elapsedSeconds) || state.elapsedSeconds < 0 || !state.responses || typeof state.responses !== 'object' || Array.isArray(state.responses)) return false;
  const responses = state.responses as Record<string, number>;
  return Object.keys(responses).length === exercise.problems.length && evaluateArithmeticQuiz(exercise, responses).results.every(result => result.selected !== null);
}

/** Partial credit is based on every authored card, never self-reported correctCount or points. */
export function arithmeticQuizFraction(exercise: ArithmeticQuizExercise, state: unknown): number {
  if (!isArithmeticQuizComplete(exercise, state)) return 0;
  const result = evaluateArithmeticQuiz(exercise, state.responses);
  return result.correctCount / result.total;
}

export function arithmeticQuizPrompt(exercise: Pick<ArithmeticQuizExercise, 'kind'>, language = 'fr'): string {
  const fr = language.startsWith('fr');
  return exercise.kind === 'calculation-race'
    ? (fr ? 'Choisis une réponse pour chaque calcul. Tu pourras revoir les méthodes à la fin de la course.' : 'Choose an answer for each calculation. You can review methods after the race.')
    : (fr ? 'Lis chaque carte de calcul, puis choisis une réponse.' : 'Read each calculation card, then choose an answer.');
}

/** Deterministic authoring helper. Choices are persisted with the authored card. */
export function makeArithmeticQuizChoices(answer: number): number[] {
  if (!Number.isSafeInteger(answer)) return [];
  const candidates = [...new Set([answer - 1, answer + 1, answer, answer + 2].filter(value => answer < 0 || value >= 0))];
  for (let offset = 3; candidates.length < 4; offset++) candidates.push(answer + offset);
  if (!candidates.every(Number.isSafeInteger)) return [];
  const shift = Math.abs(answer) % candidates.length;
  return [...candidates.slice(shift), ...candidates.slice(0, shift)];
}

let nextAuthorId = 0;
const authorId = () => `arithmetic-${Date.now().toString(36)}-${++nextAuthorId}`;
export function createArithmeticQuizExercise(kind: ArithmeticQuizKind): ArithmeticQuizExercise {
  const id = authorId();
  const exercise: ArithmeticQuizExercise = { id, kind, prompt: '', operations: ['addition', 'subtraction'], leftDigits: 1, rightDigits: 1, points: 1, problems: [
    { id: `${id}-card-1`, operation: 'addition', left: 3, right: 4, choices: [6, 8, 7, 5] },
    { id: `${id}-card-2`, operation: 'subtraction', left: 9, right: 2, choices: [8, 6, 7, 5] },
    { id: `${id}-card-3`, operation: 'addition', left: 2, right: 6, choices: [9, 7, 8, 6] },
  ] };
  exercise.prompt = arithmeticQuizPrompt(exercise);
  return exercise;
}

/** ADMIN ONLY: materializes a draft now. The learner renderer never calls this function. */
export function createArithmeticQuizDraft(kind: ArithmeticQuizKind, operations: MentalOperation[], leftDigits: number, rightDigits: number, count: number, random: () => number = Math.random, allowNegative = true): ArithmeticQuizExercise {
  if (!operations.length || !operations.every(isOperation) || !whole(leftDigits, 1, 7) || !whole(rightDigits, 1, 7) || !whole(count, 1, 20)) throw new Error('Vérifiez les opérations, le nombre de chiffres et la longueur de la série.');
  const id = authorId();
  const problems = Array.from({ length: count }, (_, index) => {
    const calculation = createMentalCalculation(operations[index % operations.length], leftDigits, rightDigits, random);
    if (!allowNegative && calculation.operation === 'subtraction' && calculation.left < calculation.right) {
      const maxRight = Math.min(calculation.left, 10 ** rightDigits - 1);
      calculation.right = Math.floor(Math.max(0, Math.min(0.999999999, random())) * (maxRight + 1));
      calculation.answer = calculation.left - calculation.right;
    }
    return { id: `${id}-card-${index + 1}`, operation: calculation.operation, left: calculation.left, right: calculation.right, choices: makeArithmeticQuizChoices(calculation.answer) };
  });
  const exercise: ArithmeticQuizExercise = { id, kind, prompt: arithmeticQuizPrompt({ kind }), operations: [...operations], leftDigits, rightDigits, problems, points: 1 };
  if (!isArithmeticQuizExercise(exercise)) throw new Error('Le brouillon contient un calcul invalide. Vérifiez notamment la difficulté des divisions.');
  return exercise;
}

export function asMentalCalculation(problem: ArithmeticQuizProblem): MentalCalculation { return { ...problem, answer: arithmeticProblemAnswer(problem) }; }
