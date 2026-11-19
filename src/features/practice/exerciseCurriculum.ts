import { normalizeSchoolLevel, SCHOOL_LEVELS } from '@/domain/schoolLevels';
import { isCoordinateExercise } from './coordinatePlane';
import { isGuidedFamilyExercise } from './guidedFamilies';
import { isArithmeticQuizExercise } from './arithmeticQuiz';
import { isVisualQuizExercise } from './visualQuiz';

/** Enacted BO 5 March 2026; v1 is a deliberately narrow subset of the 5e objective. */
export const COORDINATE_CURRICULUM = {
  country: 'fr', levels: ['5eme'] as const,
  category: 'Maths → Espace et géométrie → Repérage dans le plan',
  label: 'France · 5ème',
  source: 'https://www.education.gouv.fr/bo/2026/Hebdo10/MENE2602912A',
};

export function isCoordinateCurriculumAllowed(country: unknown, level: unknown): boolean {
  return typeof country === 'string' && country.trim().toLowerCase() === 'fr'
    && typeof level === 'string' && normalizeSchoolLevel(level) === '5eme';
}

export type CoordinateAuthoringContext = {
  schoolLevels?: string[];
  subject?: string | null;
  topics: Array<{ countryCode?: string | null; levelCode?: string | null; subject?: string | null; category?: string | null }>;
};

const normal = (value?: string | null) => (value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const maths = (value?: string | null) => /^math/.test(normal(value));

/** Missing or contradictory metadata is not a permission to expose a new type everywhere. */
export function canAuthorCoordinates(context?: CoordinateAuthoringContext): boolean {
  if (!context?.topics.length || (context.subject && !maths(context.subject))) return false;
  if (!context.topics.every(topic => isCoordinateCurriculumAllowed(topic.countryCode, topic.levelCode)
    && maths(topic.subject) && /geometr|espace|reperage|repere/.test(normal(topic.category)))) return false;
  return !context.schoolLevels?.length || context.schoolLevels.every(level => isCoordinateCurriculumAllowed('fr', level));
}

/** Tutorly catalogue policy. These are conservative authoring bands, not claims of mastery. */
export const EXERCISE_TYPE_LEVELS: Record<string, readonly string[]> = {
  'colour-grid': ['cp'],
  'guided-word-problem': ['cp', 'ce1'],
  'equal-groups': ['ce1', 'ce2'],
  counting: ['cp', 'ce1'],
  'addition-across-ten': ['cp', 'ce1', 'ce2'],
  'subtraction-with-dots': ['cp', 'ce1'],
  'analogue-clock': ['ce1', 'ce2'],
  'graduated-number-line': ['cm1', 'cm2', '6eme'],
  'coordinate-plane': ['5eme'],
  'calculation-race': SCHOOL_LEVELS.map(level => level.code),
  'number-flashcards': SCHOOL_LEVELS.map(level => level.code),
};

export function isCurriculumExercise(value: unknown): boolean {
  return !!value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(EXERCISE_TYPE_LEVELS, String((value as {kind?: unknown}).kind));
}

export function arithmeticDifficulty(level: unknown) {
  const code = typeof level === 'string' ? normalizeSchoolLevel(level) : null;
  const index = SCHOOL_LEVELS.findIndex(item => item.code === code);
  return { maxDigits: index < 0 ? 0 : index === 0 ? 2 : index === 1 ? 3 : index === 2 ? 3 : index < 5 ? 4 : 7,
    operations: index < 0 ? [] : index === 0 ? ['addition', 'subtraction'] : index === 1 ? ['addition', 'subtraction', 'multiplication'] : ['addition', 'subtraction', 'multiplication', 'division'],
    allowNegative: index >= 6 };
}

export function canAuthorExerciseType(kind: string, context?: CoordinateAuthoringContext): boolean {
  if (!Object.prototype.hasOwnProperty.call(EXERCISE_TYPE_LEVELS, kind)) return true;
  if (kind === 'coordinate-plane') return canAuthorCoordinates(context);
  if (!context?.topics.length || (context.subject && !maths(context.subject))) return false;
  const levels = EXERCISE_TYPE_LEVELS[kind];
  return context.topics.every(topic => normal(topic.countryCode) === 'fr' && maths(topic.subject)
    && levels.includes(normalizeSchoolLevel(topic.levelCode) ?? ''))
    && (!context.schoolLevels?.length || context.schoolLevels.every(level => levels.includes(normalizeSchoolLevel(level) ?? '')
      && context.topics.some(topic => normalizeSchoolLevel(topic.levelCode) === normalizeSchoolLevel(level))));
}

/** Both old bank payloads and newly authored payloads pass through the same level/parameter gate. */
export function canUseExerciseForLearner(value: unknown, country: unknown, level: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const q = value as Record<string, unknown>;
  if (!isCurriculumExercise(q)) return true; // Preserve unrelated existing quiz formats.
  if (['guided-word-problem', 'equal-groups', 'colour-grid'].includes(String(q.kind)) && !isGuidedFamilyExercise(q)) return false;
  if (q.kind === 'coordinate-plane' && !isCoordinateExercise(q)) return false;
  if (['calculation-race', 'number-flashcards'].includes(String(q.kind)) && !isArithmeticQuizExercise(q)) return false;
  if (['graduated-number-line', 'analogue-clock'].includes(String(q.kind)) && !isVisualQuizExercise(q)) return false;
  const code = typeof level === 'string' ? normalizeSchoolLevel(level) : null;
  if (typeof country !== 'string' || country.trim().toLowerCase() !== 'fr' || !code
    || !EXERCISE_TYPE_LEVELS[String(q.kind)].includes(code)) return false;
  if (q.curriculumCountry !== undefined && q.curriculumCountry !== 'fr') return false;
  if (q.schoolLevels !== undefined && (!Array.isArray(q.schoolLevels) || !q.schoolLevels.length
    || !q.schoolLevels.some(item => typeof item === 'string' && normalizeSchoolLevel(item) === code))) return false;
  if (q.kind === 'subtraction-with-dots' && q.countByColor === true && code !== 'cp') return false;
  if (q.kind === 'addition-across-ten') {
    const total = Number(q.startNumber) + Number(q.addend);
    return Number.isInteger(total) && total <= (code === 'cp' ? 100 : 1000) && total >= 0;
  }
  if (q.kind === 'calculation-race' || q.kind === 'number-flashcards') {
    const difficulty = arithmeticDifficulty(code);
    if (!Number.isInteger(q.leftDigits) || !Number.isInteger(q.rightDigits)
      || Number(q.leftDigits) < 1 || Number(q.rightDigits) < 1
      || Number(q.leftDigits) > difficulty.maxDigits || Number(q.rightDigits) > difficulty.maxDigits
      || !Array.isArray(q.operations) || !q.operations.length || !q.operations.every(op => difficulty.operations.includes(String(op)))
      || !Array.isArray(q.problems) || !q.problems.length) return false;
    return q.problems.every(problem => {
      if (!problem || typeof problem !== 'object') return false;
      const p = problem as Record<string, unknown>;
      const left = Number(p.left), right = Number(p.right);
      if (!Number.isSafeInteger(p.left) || !Number.isSafeInteger(p.right) || left < 0 || right < 0
        || left >= 10 ** Number(q.leftDigits) || right >= 10 ** Number(q.rightDigits)
        || !difficulty.operations.includes(String(p.operation))) return false;
      if (p.operation === 'subtraction' && !difficulty.allowNegative && left < right) return false;
      if (code === 'cp') return (p.operation === 'addition' ? left + right : left) <= 100;
      if (code === 'ce1' && p.operation === 'multiplication') return left <= 10 && right <= 10;
      return true;
    });
  }
  return true;
}

export function canAuthorExercise(value: unknown, context?: CoordinateAuthoringContext): boolean {
  if (!value || typeof value !== 'object') return false;
  const q = value as {kind?: string};
  return canAuthorExerciseType(q.kind ?? '', context) && (!isCurriculumExercise(q)
    || !!context?.topics.length && context.topics.every(topic => canUseExerciseForLearner(q, topic.countryCode, topic.levelCode)));
}
